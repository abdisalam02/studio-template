import { Resend } from "resend";
import fs from "fs";
import type { Database } from "@/types/database";
import { getEngineBaseUrl } from "@/lib/url";
import { resolveBrandLogo } from "@/lib/brandAsset";
import {
  getTenantConfig,
  type TenantConfig,
  type TenantColors,
} from "@/config/tenant.config";

export type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

export interface BookingDetails {
  ref: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  price_nok: number;
  start_utc: number;
  end_utc: number;
  notes?: string | null;
  location?: string;
}

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
// Fallbacks from environment:
const defaultFromName = process.env.EMAIL_FROM_NAME || "Agure Booking";
const defaultReplyTo = process.env.EMAIL_REPLY_TO || "support@agure.space";

type ResendEmailPayload = Parameters<NonNullable<typeof resend>["emails"]["send"]>[0];
type ResendEmailAttachment = NonNullable<ResendEmailPayload["attachments"]>[number];

/* -------------------------------------------------------------------------- */
/*  Studio brand assets (embedded inline so they always render)               */
/* -------------------------------------------------------------------------- */

const STUDIO_LOGO_CID = "studio-brand-logo";
const STUDIO_LOGO_FALLBACK_PUBLIC_PATH = "/img/logo-chrome.png";
const STUDIO_WATERMARK_FALLBACK_PUBLIC_PATH = "/img/logo-watermark.png";
const DEFAULT_EMAIL_FROM_ADDRESS = "booking@agure.space";

/** Resolves the active tenant config from a DB tenant row (graceful fallback). */
function resolveConfig(tenant?: Tenant | null): TenantConfig {
  return getTenantConfig(tenant?.id);
}

/**
 * Builds the hosted watermark URL for the email background.
 * Prefers Supabase Storage (reachable by Gmail) and falls back to the
 * site-hosted asset.
 */
function getWatermarkUrl(config: TenantConfig): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const bucket = config.integrations.supabaseAssetsBucket;
  const prefix = config.integrations.assetsPrefix;

  if (supabaseUrl && bucket && prefix) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${prefix}/logo-watermark.png`;
  }

  const configured = config.theme.watermarkUrl;
  if (configured && configured.startsWith("http")) {
    return configured;
  }

  return `${getEngineBaseUrl()}${configured || STUDIO_WATERMARK_FALLBACK_PUBLIC_PATH}`;
}

interface LogoAsset {
  src: string;
  attachment: ResendEmailAttachment | null;
  /** When true, no loadable logo exists and the monogram badge should render. */
  useMonogram: boolean;
  /** Absolute path of the embedded local file, used to validate the cache. */
  absolutePath?: string;
}

const logoAssetCache = new Map<string, LogoAsset>();

function getLogoAsset(config: TenantConfig): LogoAsset {
  const logoUrl = config.theme.logoUrl || STUDIO_LOGO_FALLBACK_PUBLIC_PATH;
  // Trusted hosted/data logos never need a disk lookup or monogram fallback.
  if (/^https?:\/\//i.test(logoUrl)) {
    const remoteAsset: LogoAsset = { src: logoUrl, attachment: null, useMonogram: false };
    logoAssetCache.set(logoUrl, remoteAsset);
    return remoteAsset;
  }

  const cached = logoAssetCache.get(logoUrl);
  // A cached embedded logo is only reused while its file still exists. A cached
  // monogram is never trusted, so adding the asset is picked up immediately.
  if (cached && !cached.useMonogram && cached.absolutePath && fs.existsSync(cached.absolutePath)) {
    return cached;
  }

  // Resolve the configured logo against public/img, tolerating URL-encoding,
  // Unicode normalization and Nordic look-alikes (klø.png / klo.png).
  const resolved = resolveBrandLogo(logoUrl);
  if (resolved) {
    try {
      const buffer = fs.readFileSync(resolved.absolutePath);
      const asset: LogoAsset = {
        src: `cid:${STUDIO_LOGO_CID}`,
        useMonogram: false,
        absolutePath: resolved.absolutePath,
        attachment: {
          filename: resolved.filename,
          content: buffer,
          contentType: resolved.contentType,
          contentId: STUDIO_LOGO_CID,
        },
      };
      logoAssetCache.set(logoUrl, asset);
      return asset;
    } catch (err) {
      console.warn(
        "Studio logo file could not be read; falling back to the monogram badge.",
        err
      );
    }
  } else {
    console.warn(
      "Studio logo asset is missing; falling back to the monogram badge. Add it to public/img to enable the logo."
    );
  }

  // The monogram fallback is intentionally not cached so a newly added asset is
  // picked up without a server restart.
  return {
    src: `${getEngineBaseUrl()}${encodeURI(logoUrl)}`,
    attachment: null,
    useMonogram: true,
  };
}

function getSenderInfo(tenant: Tenant | null | undefined, config: TenantConfig) {
  const rawName = tenant?.name || config.integrations.emailFromName || defaultFromName;
  const displayName = rawName.replace(/["<>]/g, "").trim();
  const replyToAddress =
    tenant?.owner_email || config.integrations.replyTo || defaultReplyTo;
  const fromAddress = config.integrations.emailFromAddress || DEFAULT_EMAIL_FROM_ADDRESS;
  const from = `${displayName || defaultFromName} <${fromAddress}>`;
  return { from, replyTo: replyToAddress };
}

async function sendEmailSafely(config: TenantConfig, payload: ResendEmailPayload) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping email dispatch.");
    return { data: null, error: { name: "missing_api_key", message: "RESEND_API_KEY is not set" } };
  }
  const logo = getLogoAsset(config);
  const finalPayload: ResendEmailPayload = logo.attachment
    ? { ...payload, attachments: [...(payload.attachments ?? []), logo.attachment] }
    : payload;
  try {
    const res = await resend.emails.send(finalPayload);
    if (res.error) {
      console.error("RESEND SEND ERROR:", res.error);
    }
    return res;
  } catch (error) {
    console.error("RESEND SEND ERROR:", error);
    return { data: null, error };
  }
}

function formatOsloDateTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleString("no-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* -------------------------------------------------------------------------- */
/*  Luxury studio email design system                                          */
/*  All styling is inline, table-based and safe for Gmail, Apple Mail, Outlook. */
/* -------------------------------------------------------------------------- */

const EMAIL_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

interface EmailDetailInput {
  label: string;
  value: string;
  numeric?: boolean;
}

function emailDetailRow(
  palette: TenantColors,
  label: string,
  value: string,
  options: { first?: boolean; numeric?: boolean } = {}
): string {
  const { first = false, numeric = false } = options;
  const divider = first ? "" : `border-top:1px solid ${palette.border};`;
  const numericStyle = numeric ? "font-variant-numeric:tabular-nums;" : "";
  return `<tr>
    <td width="40%" valign="top" style="padding:11px 12px 11px 0;${divider}font-family:${EMAIL_FONT};font-size:12px;line-height:1.5;letter-spacing:0.01em;color:${palette.label};">${escapeHtml(label)}</td>
    <td valign="top" align="right" style="padding:11px 0;${divider}font-family:${EMAIL_FONT};font-size:13px;line-height:1.5;font-weight:600;color:${palette.value};text-align:right;${numericStyle}">${escapeHtml(value)}</td>
  </tr>`;
}

function emailDetailRows(palette: TenantColors, rows: EmailDetailInput[]): string {
  return rows
    .map((row, index) =>
      emailDetailRow(palette, row.label, row.value, {
        first: index === 0,
        numeric: row.numeric,
      })
    )
    .join("");
}

function emailButton(palette: TenantColors, href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:26px auto 2px auto;">
    <tr>
      <td align="center" bgcolor="${palette.value}" style="border-radius:9999px;border:1px solid ${palette.value};">
        <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 30px;font-family:${EMAIL_FONT};font-size:14px;line-height:1;font-weight:600;color:${palette.valueText};text-decoration:none;border-radius:9999px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function emailTextLink(palette: TenantColors, href: string, label: string): string {
  return `<a href="${href}" target="_blank" rel="noopener" style="color:${palette.value};text-decoration:underline;text-underline-offset:3px;font-weight:600;">${escapeHtml(label)}</a>`;
}

function emailNoteBox(palette: TenantColors, html: string): string {
  return `<div style="margin-top:22px;padding:14px 16px;border:1px solid ${palette.border};border-radius:14px;background-color:${palette.recessed};font-family:${EMAIL_FONT};font-size:12px;line-height:1.65;color:${palette.label};">${html}</div>`;
}

interface EmailShellParams {
  config: TenantConfig;
  tenantName: string;
  subtitle: string;
  eyebrow: string;
  title: string;
  titleColor?: string;
  introHtml: string;
  detailsHtml: string;
  actionHtml?: string;
  footerHtml?: string;
  maxWidth?: number;
}

function renderEmailShell(params: EmailShellParams): string {
  const config = params.config;
  const palette = config.theme.colors;
  const studioName = params.tenantName || config.name || defaultFromName;
  const watermarkUrl = getWatermarkUrl(config);
  const maxWidth = params.maxWidth ?? 560;
  const titleColor = params.titleColor || palette.value;
  const logo = getLogoAsset(config);
  const monogram = (config.theme.monogram || studioName.slice(0, 2) || "•").toUpperCase();
  const logoMarkup = logo.useMonogram
    ? `<div style="width:64px;height:64px;margin:0 auto 10px auto;line-height:62px;border:1px solid ${palette.borderStrong};border-radius:50%;background-color:${palette.recessed};font-family:${EMAIL_FONT};font-size:22px;font-weight:700;letter-spacing:0.04em;color:${palette.accent};text-align:center;">${escapeHtml(monogram)}</div>`
    : `<img src="${logo.src}" alt="${escapeHtml(studioName)}" width="88" height="88" style="display:block;width:88px;height:88px;max-width:88px;margin:0 auto 10px auto;border:0;outline:none;text-decoration:none;" />`;

  return `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark light" />
<meta name="supported-color-schemes" content="dark light" />
<title>${escapeHtml(studioName)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${palette.canvas};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<!-- design-ok -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${palette.canvas}" style="width:100%;background-color:${palette.canvas};">
  <tr>
    <td align="center" style="padding:36px 16px;">
      <table role="presentation" width="${maxWidth}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${maxWidth}px;">
        <tr>
          <td align="center" style="padding-bottom:22px;">
            ${logoMarkup}
            <div style="font-family:${EMAIL_FONT};font-size:13px;line-height:1.4;letter-spacing:0.34em;text-transform:uppercase;font-weight:700;color:${palette.value};">${escapeHtml(studioName)}</div>
            <div style="font-family:${EMAIL_FONT};font-size:12px;line-height:1.5;color:${palette.soft};margin-top:7px;">${escapeHtml(params.subtitle)}</div>
          </td>
        </tr>
        <tr>
          <td bgcolor="${palette.card}" style="background-color:${palette.card};border:1px solid ${palette.border};border-radius:16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="${palette.band}" style="padding:24px 26px 20px 26px;border-bottom:1px solid ${palette.border};background-color:${palette.band};border-radius:16px 16px 0 0;">
                  <div style="font-family:${EMAIL_FONT};font-size:10px;line-height:1.4;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;color:${palette.accent};">${escapeHtml(params.eyebrow)}</div>
                  <div style="font-family:${EMAIL_FONT};font-size:20px;line-height:1.35;font-weight:700;color:${titleColor};margin-top:7px;">${escapeHtml(params.title)}</div>
                </td>
              </tr>
              <tr>
                <td bgcolor="${palette.card}" style="padding:24px 26px 28px 26px;background-color:${palette.card};background-image:url('${watermarkUrl}');background-repeat:no-repeat;background-position:center center;background-size:320px 320px;">
                  <div style="font-family:${EMAIL_FONT};font-size:14px;line-height:1.65;color:${palette.label};">${params.introHtml}</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
                    ${params.detailsHtml}
                  </table>
                  ${params.actionHtml || ""}
                </td>
              </tr>
              ${
                params.footerHtml
                  ? `<tr>
                <td bgcolor="${palette.band}" style="padding:16px 26px 20px 26px;border-top:1px solid ${palette.border};background-color:${palette.band};border-radius:0 0 16px 16px;">
                  <div style="font-family:${EMAIL_FONT};font-size:11px;line-height:1.7;color:${palette.soft};text-align:center;">${params.footerHtml}</div>
                </td>
              </tr>`
                  : ""
              }
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function studioNameOf(tenant: Tenant, config: TenantConfig): string {
  return tenant.name || config.name || defaultFromName;
}

function strongValue(palette: TenantColors, text: string): string {
  return `<strong style="color:${palette.value};font-weight:600;">${escapeHtml(text)}</strong>`;
}

function currencyOf(config: TenantConfig): string {
  return config.rules.currency || "kr";
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

/**
 * Builds (but does not send) the owner "New booking" alert email.
 * Used by sendOwnerAlert and by the dev-only email preview route.
 */
export function renderOwnerAlertEmail(
  tenant: Tenant,
  booking: BookingDetails,
  actionUrl?: string
): RenderedEmail {
  const config = resolveConfig(tenant);
  const palette = config.theme.colors;
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Ny timebestilling: ${booking.customer_name} - ${booking.service_name}`;
  const adminBaseUrl = getEngineBaseUrl();
  const reviewUrl = actionUrl || `${adminBaseUrl}/admin?ref=${encodeURIComponent(booking.ref)}`;

  const rows: EmailDetailInput[] = [
    { label: "Kunde", value: booking.customer_name },
    { label: "Telefon", value: booking.customer_phone },
    { label: "E-post", value: booking.customer_email },
    { label: "Behandling", value: booking.service_name },
    { label: "Tidspunkt", value: osloTime },
    { label: "Pris", value: `${booking.price_nok} ${currencyOf(config)}`, numeric: true },
  ];
  if (booking.notes) {
    rows.push({ label: "Notat", value: booking.notes });
  }

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Ny bestilling",
    eyebrow: "Timeforespørsel",
    title: "Ny timebestilling mottatt",
    introHtml: `En ny reservasjon venter på vurdering for ${strongValue(palette, studioName)}.`,
    detailsHtml: emailDetailRows(palette, rows),
    actionHtml: emailButton(palette, reviewUrl, "Vurder bestilling →"),
    footerHtml: `Referanse ${escapeHtml(booking.ref)}`,
  });

  return { subject, html };
}

export async function sendOwnerAlert(
  tenant: Tenant,
  booking: BookingDetails,
  actionUrl: string
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping owner alert email.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = resolveConfig(tenant);
  const { subject, html } = renderOwnerAlertEmail(tenant, booking, actionUrl);
  const { from, replyTo } = getSenderInfo(tenant, config);

  return sendEmailSafely(config, {
    from,
    replyTo,
    to: [tenant.owner_email],
    subject,
    html,
  });
}

export async function sendCustomerReceipt(
  tenant: Tenant,
  booking: BookingDetails,
  manageUrl: string
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping customer receipt email.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = resolveConfig(tenant);
  const palette = config.theme.colors;
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Mottatt timeforespørsel hos ${tenant.name}`;

  const rows: EmailDetailInput[] = [
    { label: "Referanse", value: booking.ref },
    { label: "Behandling", value: booking.service_name },
    { label: "Ønsket tid", value: osloTime },
    { label: "Pris", value: `${booking.price_nok} ${currencyOf(config)}`, numeric: true },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Timeforespørsel mottatt",
    eyebrow: "Forespørsel",
    title: "Takk for din forespørsel",
    introHtml: `Vi har mottatt din timeforespørsel hos ${strongValue(
      palette,
      studioName
    )}. Forespørselen vurderes nå av studioet, og du mottar en bekreftelse så snart timen er godkjent.`,
    detailsHtml: emailDetailRows(palette, rows),
    actionHtml: `<div style="text-align:center;margin-top:24px;font-family:${EMAIL_FONT};font-size:13px;line-height:1.6;color:${palette.label};">${emailTextLink(
      palette,
      manageUrl,
      "Administrer din reservasjon"
    )}</div>`,
    footerHtml: "Ikke deg? Ignorer denne e-posten.",
  });

  const { from, replyTo } = getSenderInfo(tenant, config);

  return sendEmailSafely(config, {
    from,
    replyTo,
    to: [booking.customer_email],
    subject,
    html,
  });
}

/**
 * Builds (but does not send) the customer "time confirmed" receipt email.
 * Used by sendCustomerConfirmation and by the dev-only email preview route.
 */
export function renderCustomerConfirmationEmail(
  tenant: Tenant,
  booking: BookingDetails
): RenderedEmail {
  const config = resolveConfig(tenant);
  const palette = config.theme.colors;
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Bekreftet: Din time hos ${tenant.name}`;

  const rows: EmailDetailInput[] = [
    { label: "Referanse", value: booking.ref },
    { label: "Behandling", value: booking.service_name },
    { label: "Tidspunkt", value: osloTime },
    { label: "Pris", value: `${booking.price_nok} ${currencyOf(config)}`, numeric: true },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Time bekreftet",
    eyebrow: "Bekreftelse",
    title: "Din time er bekreftet",
    titleColor: palette.green,
    introHtml: `Din time er bekreftet! Vi gleder oss til å se deg hos ${strongValue(
      palette,
      studioName
    )}.`,
    detailsHtml: emailDetailRows(palette, rows),
    actionHtml: emailNoteBox(
      palette,
      "Kalenderfil (.ics) er lagt ved denne e-posten slik at du enkelt kan legge avtalen til i kalenderen din."
    ),
    footerHtml: `Referanse ${escapeHtml(booking.ref)}`,
  });

  return { subject, html };
}

export async function sendCustomerConfirmation(
  tenant: Tenant,
  booking: BookingDetails,
  icsContent: string
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping customer confirmation email.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = resolveConfig(tenant);
  const { subject, html } = renderCustomerConfirmationEmail(tenant, booking);

  const { from: confirmationFrom, replyTo: confirmationReplyTo } = getSenderInfo(
    tenant,
    config
  );

  return sendEmailSafely(config, {
    from: confirmationFrom,
    replyTo: confirmationReplyTo,
    to: [booking.customer_email],
    subject,
    html,
    attachments: [
      {
        filename: "appointment.ics",
        content: Buffer.from(icsContent, "utf-8"),
        contentType: "text/calendar",
      },
    ],
  });
}

export async function sendCustomerDeclined(
  tenant: Tenant,
  booking: BookingDetails
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping customer declined email.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = resolveConfig(tenant);
  const palette = config.theme.colors;
  const studioName = studioNameOf(tenant, config);
  const subject = `Oppdatering angående din time hos ${tenant.name}`;

  const rows: EmailDetailInput[] = [
    { label: "Referanse", value: booking.ref },
    { label: "Behandling", value: booking.service_name },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Oppdatering",
    eyebrow: "Timeforespørsel",
    title: "Forespørselen kunne ikke bekreftes",
    titleColor: palette.red,
    introHtml:
      "Forespørselen din kunne dessverre ikke bekreftes denne gangen. Besøk vår nettside for å velge et annet tidspunkt.",
    detailsHtml: emailDetailRows(palette, rows),
    footerHtml: "Ta gjerne kontakt med oss dersom du har spørsmål.",
  });

  const { from, replyTo } = getSenderInfo(tenant, config);

  return sendEmailSafely(config, {
    from,
    replyTo,
    to: [booking.customer_email],
    subject,
    html,
  });
}

export async function sendOwnerCancellationAlert(
  tenant: Tenant,
  booking: BookingDetails
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping owner cancellation alert email.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = resolveConfig(tenant);
  const palette = config.theme.colors;
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Avbestilling: ${booking.customer_name} - ${booking.service_name}`;

  const rows: EmailDetailInput[] = [
    { label: "Referanse", value: booking.ref },
    { label: "Kunde", value: booking.customer_name },
    { label: "Telefon", value: booking.customer_phone },
    { label: "Behandling", value: booking.service_name },
    { label: "Opprinnelig tid", value: osloTime },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Avbestilling",
    eyebrow: "Kansellering",
    title: "Kunden har avbestilt timen",
    titleColor: palette.red,
    introHtml: `En kunde har avbestilt sin time hos ${strongValue(palette, studioName)}.`,
    detailsHtml: emailDetailRows(palette, rows),
    footerHtml: "Tidspunktet er nå frigjort i kalenderen.",
  });

  const { from, replyTo } = getSenderInfo(tenant, config);

  return sendEmailSafely(config, {
    from,
    replyTo,
    to: [tenant.owner_email],
    subject,
    html,
  });
}

export async function sendOwnerOtpEmail(email: string, code: string, tenantId?: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping OTP email.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = getTenantConfig(tenantId);
  const palette = config.theme.colors;
  const subject = `Your verification code: ${code}`;
  const html = renderEmailShell({
    config,
    tenantName: config.integrations.emailFromName || config.name,
    subtitle: "Secure login",
    eyebrow: "Verification code",
    title: "Your login code",
    introHtml:
      "Use the following 6-digit code to sign in to your control panel. The code is valid for 15 minutes.",
    detailsHtml: `<tr>
      <td align="center" style="padding-top:6px;">
        <div style="background-color:${palette.recessed};border:1px solid ${palette.border};border-radius:14px;padding:22px 16px;font-family:${EMAIL_FONT};font-size:30px;line-height:1;font-weight:800;letter-spacing:0.34em;color:${palette.value};font-variant-numeric:tabular-nums;">${escapeHtml(code)}</div>
      </td>
    </tr>`,
    footerHtml: "If you did not request this code, you can safely ignore this email.",
    maxWidth: 480,
  });

  try {
    const { from, replyTo } = getSenderInfo(null, config);
    const result = await sendEmailSafely(config, {
      from,
      replyTo,
      to: [email],
      subject,
      html,
    });
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  } catch (err) {
    console.error("RESEND SEND ERROR:", err);
    return { success: false, error: err };
  }
}

export async function sendCustomerRescheduleConfirmation(
  tenant: Tenant,
  booking: BookingDetails,
  icsContent: string
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping customer reschedule email.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = resolveConfig(tenant);
  const palette = config.theme.colors;
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Nytt tidspunkt bekreftet hos ${tenant.name}`;

  const rows: EmailDetailInput[] = [
    { label: "Referanse", value: booking.ref },
    { label: "Behandling", value: booking.service_name },
    { label: "Nytt tidspunkt", value: osloTime },
    { label: "Pris", value: `${booking.price_nok} ${currencyOf(config)}`, numeric: true },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Nytt tidspunkt",
    eyebrow: "Endring",
    title: "Timen har fått nytt tidspunkt",
    introHtml: `Dette er en bekreftelse på at din time hos ${strongValue(
      palette,
      studioName
    )} har blitt flyttet.`,
    detailsHtml: emailDetailRows(palette, rows),
    actionHtml: emailNoteBox(
      palette,
      "Oppdatert kalenderfil (.ics) er lagt ved denne e-posten."
    ),
    footerHtml: `Referanse ${escapeHtml(booking.ref)}`,
  });

  const { from, replyTo } = getSenderInfo(tenant, config);

  return sendEmailSafely(config, {
    from,
    replyTo,
    to: [booking.customer_email],
    subject,
    html,
    attachments: [
      {
        filename: "updated_appointment.ics",
        content: Buffer.from(icsContent, "utf-8"),
        contentType: "text/calendar",
      },
    ],
  });
}

export async function sendTestNotificationEmail(tenant: Tenant, recipientEmail: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping test notification email.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = resolveConfig(tenant);
  const palette = config.theme.colors;
  const studioName = studioNameOf(tenant, config);
  const subject = `Testvarsel fra ${tenant.name}`;
  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Testvarsel",
    eyebrow: "Systemtest",
    title: "Test av e-postvarsling",
    introHtml: `Dette er et testvarsel sendt fra ditt kontrollpanel for ${strongValue(
      palette,
      studioName
    )}.`,
    detailsHtml: `<tr>
      <td style="padding-top:6px;">
        <div style="background-color:${palette.recessed};border:1px solid ${palette.border};border-radius:14px;padding:16px;font-family:${EMAIL_FONT};font-size:13px;line-height:1.65;color:${palette.value};">Status: E-postintegrasjon via Resend fungerer som forventet.</div>
      </td>
    </tr>`,
    maxWidth: 500,
  });

  const { from, replyTo } = getSenderInfo(tenant, config);

  return sendEmailSafely(config, {
    from,
    replyTo,
    to: [recipientEmail],
    subject,
    html,
  });
}
