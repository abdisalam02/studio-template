import { Resend } from "resend";
import fs from "fs";
import type { Database } from "@/types/database";
import { supabaseAdmin } from "@/lib/supabase";
import { buildTenantConfig, type TenantRow } from "@/lib/tenantResolver";
import { getEngineBaseUrl } from "@/lib/url";
import { deriveReviewToken } from "@/lib/tokens";
import { resolveBrandLogo } from "@/lib/brandAsset";
import {
  getSeedTenant,
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
const defaultFromName = process.env.EMAIL_FROM_NAME || "Studio Booking";
const defaultReplyTo = process.env.EMAIL_REPLY_TO || "hello@agure.space";

type ResendEmailPayload = Parameters<NonNullable<typeof resend>["emails"]["send"]>[0];
type ResendEmailAttachment = NonNullable<ResendEmailPayload["attachments"]>[number];

/* -------------------------------------------------------------------------- */
/*  Studio brand assets (embedded inline so they always render)               */
/* -------------------------------------------------------------------------- */

const STUDIO_LOGO_CID = "studio-brand-logo";
const STUDIO_LOGO_FALLBACK_PUBLIC_PATH = "/img/logo-chrome.png";
const STUDIO_WATERMARK_FALLBACK_PUBLIC_PATH = "/img/logo-watermark.png";
const DEFAULT_EMAIL_FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS || "booking@agure.space";

/** Resolves the active tenant config from a DB tenant row (graceful fallback). */
function resolveConfig(tenant?: Tenant | null): TenantConfig {
  if (tenant) return buildTenantConfig(tenant as unknown as TenantRow);
  return getSeedTenant() ?? buildTenantConfig({
    id: "unknown",
    name: defaultFromName,
    owner_email: defaultReplyTo,
    contact_email: defaultReplyTo,
    profile: {},
  });
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
  const logoUrl = config.theme.logoUrl || "";
  if (!logoUrl.trim()) {
    return {
      src: "",
      attachment: null,
      useMonogram: true,
    };
  }
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

type SenderAudience = "owner" | "customer";

function getSenderInfo(
  tenant: Tenant | null | undefined,
  config: TenantConfig,
  audience: SenderAudience = "customer"
) {
  const rawName =
    tenant?.from_name || tenant?.name || config.integrations.emailFromName || defaultFromName;
  const displayName = rawName.replace(/["<>]/g, "").trim();
  const explicitReplyTo = tenant?.reply_to || config.integrations.replyTo;
  const ownerReply = tenant?.owner_email || config.contact.ownerEmail || defaultReplyTo;
  const contactReply = tenant?.contact_email || config.contact.email;
  const replyToAddress =
    explicitReplyTo ||
    (audience === "owner" ? ownerReply : contactReply || ownerReply || defaultReplyTo);
  const fromAddress = config.integrations.emailFromAddress || DEFAULT_EMAIL_FROM_ADDRESS;
  const from = `${displayName || defaultFromName} <${fromAddress}>`;
  return { from, replyTo: replyToAddress };
}

async function sendEmailSafely(config: TenantConfig, payload: ResendEmailPayload) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping email dispatch.");
    return { data: null, error: { name: "missing_api_key", message: "RESEND_API_KEY is not set" } };
  }

  // Resend accepts a send to a suppressed address with HTTP 200 and no error,
  // then silently drops it — no bounce, no webhook, no way to notice. Ask the
  // suppression list first so that case is reported like any other failure.
  const suppressed = await firstSuppressedRecipient(payload.to);
  if (suppressed) {
    console.warn(`Resend suppression list blocks ${suppressed}; send skipped.`);
    return {
      data: null,
      error: {
        name: "suppressed",
        message: `${suppressed} is on Resend's suppression list (a previous hard bounce). Remove it in Resend → Suppressions, or use a different address.`,
      },
    };
  }

  const logo = getLogoAsset(config);
  const finalPayload: ResendEmailPayload = logo.attachment
    ? { ...payload, attachments: [...(payload.attachments ?? []), logo.attachment] }
    : payload;
  // Retry transient provider failures (rate limits, 5xx, timeouts).
  // The Resend SDK's response is a union; callers normalise it with
  // emailOutcome(), so the accumulator is intentionally untyped here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastResult: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await resend.emails.send(finalPayload);
      if (!res.error) return res;

      lastResult = res;
      const error = res.error as { name?: string; message?: string };
      const detail = `${error.name || ""} ${error.message || ""}`;
      const retryable = /rate|limit|timeout|temporar|server|5\d\d/i.test(detail);

      if (!retryable || attempt === 2) {
        console.error("RESEND SEND ERROR:", res.error);
        return res;
      }

      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    } catch (error) {
      lastResult = { data: null, error };
      if (attempt === 2) {
        console.error("RESEND SEND ERROR:", error);
        return lastResult;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  return lastResult;
}

/**
 * Returns the first recipient that Resend currently suppresses, or null.
 * Fails open: a lookup error must never stop a legitimate send.
 */
async function firstSuppressedRecipient(
  to: ResendEmailPayload["to"]
): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const recipients = Array.isArray(to) ? to : [to];
  for (const address of recipients) {
    if (!address || typeof address !== "string") continue;
    try {
      const res = await fetch(
        `https://api.resend.com/suppressions/${encodeURIComponent(address)}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: "no-store",
        }
      );
      if (res.status === 200) return address;
    } catch (err) {
      console.warn("Suppression lookup failed; sending anyway.", err);
    }
  }
  return null;
}

function formatOsloDateTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleString("en-GB", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* -------------------------------------------------------------------------- */
/*  Delivery outcomes                                                          */
/*  Resend accepts a message before the receiving server has answered, so a    */
/*  bad mailbox only shows up later (webhook) or as a rejected send. These     */
/*  helpers normalise both paths into the same small vocabulary.               */
/* -------------------------------------------------------------------------- */

export type EmailDeliveryStatus =
  | "sent"
  | "delivered"
  | "delayed"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed";

export interface EmailOutcome {
  id: string | null;
  error: { name: string; message: string } | null;
}

/** Extracts the Resend message id from a `emails.send` response. */
export function emailOutcome(result: unknown): EmailOutcome {
  const raw = result as
    | { data?: { id?: string } | null; error?: unknown }
    | null
    | undefined;
  if (!raw) return { id: null, error: null };

  const id =
    raw.data && typeof raw.data.id === "string" && raw.data.id.trim()
      ? raw.data.id
      : null;

  if (!raw.error) return { id, error: null };

  const err = raw.error as { name?: unknown; message?: unknown } | string;
  if (typeof err === "string") {
    return { id, error: { name: "error", message: err } };
  }
  return {
    id,
    error: {
      name: typeof err.name === "string" ? err.name : "error",
      message:
        typeof err.message === "string" ? err.message : "Unknown email error",
    },
  };
}

/** Maps a rejected send onto a booking email status. */
export function classifyEmailFailure(error: {
  name: string;
  message: string;
}): EmailDeliveryStatus {
  const text = `${error.name} ${error.message}`.toLowerCase();
  if (text.includes("suppress")) return "suppressed";
  if (text.includes("bounce")) return "bounced";
  return "failed";
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

/* -------------------------------------------------------------------------- */
/*  Light / dark palettes                                                     */
/*                                                                            */
/*  Inline styles carry the LIGHT palette so clients without media-query      */
/*  support still render a readable email. The <style> block swaps to the     */
/*  tenant's dark palette via prefers-color-scheme and Outlook's [data-ogsc]. */
/* -------------------------------------------------------------------------- */

const LIGHT_EMAIL_COLORS: TenantColors = {
  canvas: "#F7F4EE",
  card: "#FFFFFF",
  band: "#F3EEE7",
  recessed: "#F7F3ED",
  border: "#E6E0D6",
  borderStrong: "#D5CCBF",
  label: "#5E5A55",
  soft: "#8A857E",
  value: "#141312",
  valueText: "#FFFFFF",
  accent: "#8A6A3B",
  watermark: "#D9D2C7",
  green: "#2F6B45",
  red: "#9B2C2C",
  warning: "#8A6100",
};

function mixWithBlack(hex: string, amount: number): string {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6 || /[^0-9a-f]/i.test(clean)) return hex;
  const channels = [0, 2, 4].map((index) =>
    Math.round(parseInt(clean.slice(index, index + 2), 16) * (1 - amount))
  );
  return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

/** Light-mode palette for the active tenant (brand accent darkened for contrast). */
export function lightEmailPalette(config: TenantConfig): TenantColors {
  if (config.theme.lightColors) return config.theme.lightColors;
  return {
    ...LIGHT_EMAIL_COLORS,
    accent: mixWithBlack(config.theme.colors.accent, 0.42),
  };
}

/**
 * Dark-mode overrides. Inline colours stay light and non-important, so these
 * rules can win. [data-ogsc]/[data-ogsb] cover Outlook.com and the Outlook
 * apps, which do not honour prefers-color-scheme.
 */
function colorSchemeStyles(dark: TenantColors, watermarkUrl: string): string {
  const rules = (prefix = "") =>
    [
      `${prefix}.email-canvas{background-color:${dark.canvas}!important;}`,
      `${prefix}.email-card{background-color:${dark.card}!important;border-color:${dark.border}!important;}`,
      `${prefix}.email-band{background-color:${dark.band}!important;border-color:${dark.border}!important;}`,
      `${prefix}.email-value{color:${dark.value}!important;}`,
      `${prefix}.email-label{color:${dark.label}!important;}`,
      `${prefix}.email-soft{color:${dark.soft}!important;}`,
      `${prefix}.email-divider{border-top-color:${dark.border}!important;}`,
      `${prefix}.email-border{border-color:${dark.border}!important;}`,
      `${prefix}.email-button{background-color:${dark.value}!important;border-color:${dark.value}!important;}`,
      `${prefix}.email-button-text{color:${dark.valueText}!important;}`,
      `${prefix}.email-link{color:${dark.value}!important;}`,
      `${prefix}.email-accent{color:${dark.accent}!important;}`,
      `${prefix}.email-note{background-color:${dark.recessed}!important;border-color:${dark.border}!important;}`,
      `${prefix}.email-content{background-image:url('${watermarkUrl}')!important;}`,
      `${prefix}.email-logo--light{display:none!important;}`,
      `${prefix}.email-logo--dark{display:block!important;}`,
      `${prefix}.email-title--green{color:${dark.green}!important;}`,
      `${prefix}.email-title--red{color:${dark.red}!important;}`,
    ].join("");

  return `<style>
:root{color-scheme:light dark;supported-color-schemes:light dark;}
@media (prefers-color-scheme:dark){${rules()}}
${rules("[data-ogsc] ")}
${rules("[data-ogsb] ")}
</style>`;
}

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
  const dividerClass = first ? "" : " email-divider";
  const numericStyle = numeric ? "font-variant-numeric:tabular-nums;" : "";
  return `<tr>
    <td class="email-label${dividerClass}" width="40%" valign="top" style="padding:11px 12px 11px 0;${divider}font-family:${EMAIL_FONT};font-size:12px;line-height:1.5;letter-spacing:0.01em;color:${palette.label};">${escapeHtml(label)}</td>
    <td class="email-value${dividerClass}" valign="top" align="right" style="padding:11px 0;${divider}font-family:${EMAIL_FONT};font-size:13px;line-height:1.5;font-weight:600;color:${palette.value};text-align:right;${numericStyle}">${escapeHtml(value)}</td>
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
      <td class="email-button" align="center" bgcolor="${palette.value}" style="border-radius:9999px;border:1px solid ${palette.value};background-color:${palette.value};">
        <a class="email-button-text" href="${href}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 30px;font-family:${EMAIL_FONT};font-size:14px;line-height:1;font-weight:600;color:${palette.valueText};text-decoration:none;border-radius:9999px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function emailTextLink(palette: TenantColors, href: string, label: string): string {
  return `<a class="email-link" href="${href}" target="_blank" rel="noopener" style="color:${palette.value};text-decoration:underline;text-underline-offset:3px;font-weight:600;">${escapeHtml(label)}</a>`;
}

function emailNoteBox(palette: TenantColors, html: string): string {
  return `<div class="email-note email-border" style="margin-top:22px;padding:14px 16px;border:1px solid ${palette.border};border-radius:14px;background-color:${palette.recessed};font-family:${EMAIL_FONT};font-size:12px;line-height:1.65;color:${palette.label};">${html}</div>`;
}

interface EmailShellParams {
  config: TenantConfig;
  tenantName: string;
  subtitle: string;
  eyebrow: string;
  title: string;
  /** Semantic title colour; the dark palette is applied automatically. */
  titleTone?: "green" | "red";
  introHtml: string;
  detailsHtml: string;
  actionHtml?: string;
  footerHtml?: string;
  maxWidth?: number;
}

function monogramBadge(
  palette: TenantColors,
  monogram: string,
  extraClass = "",
  extraStyle = ""
): string {
  return `<div class="${extraClass}" style="${extraStyle}width:64px;height:64px;margin:0 auto 10px auto;line-height:62px;border:1px solid ${palette.borderStrong};border-radius:50%;background-color:${palette.recessed};font-family:${EMAIL_FONT};font-size:22px;font-weight:700;letter-spacing:0.04em;color:${palette.accent};text-align:center;">${escapeHtml(monogram)}</div>`;
}

function renderEmailShell(params: EmailShellParams): string {
  const config = params.config;
  const light = lightEmailPalette(config);
  const dark = config.theme.colors;
  const studioName = params.tenantName || config.name || defaultFromName;
  const watermarkUrl = getWatermarkUrl(config);
  const maxWidth = params.maxWidth ?? 560;
  const logo = getLogoAsset(config);
  const monogram = (config.theme.monogram || studioName.slice(0, 2) || "\u2022").toUpperCase();

  const titleTone = params.titleTone;
  const titleClass =
    titleTone === "green"
      ? "email-title--green"
      : titleTone === "red"
        ? "email-title--red"
        : "email-value";
  const titleColor =
    titleTone === "green" ? light.green : titleTone === "red" ? light.red : light.value;

  // Light mode uses the dark-ink logo on white. Dark mode shows the monogram
  // badge instead, because the brand PNG is dark ink and would disappear on a
  // near-black card. Clients without media-query support keep the light logo.
  const logoMarkup = logo.useMonogram
    ? monogramBadge(light, monogram, "email-note email-border email-accent")
    : `<img class="email-logo--light" src="${logo.src}" alt="${escapeHtml(studioName)}" width="88" height="88" style="display:block;width:88px;height:88px;max-width:88px;margin:0 auto 10px auto;border:0;outline:none;text-decoration:none;" />` +
      monogramBadge(
        light,
        monogram,
        "email-logo--dark email-note email-border email-accent",
        "display:none;"
      );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${escapeHtml(studioName)}</title>
${colorSchemeStyles(dark, watermarkUrl)}
</head>
<body class="email-canvas" style="margin:0;padding:0;width:100%;background-color:${light.canvas};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<!-- design-ok -->
<table class="email-canvas" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${light.canvas}" style="width:100%;background-color:${light.canvas};">
  <tr>
    <td align="center" style="padding:36px 16px;">
      <table role="presentation" width="${maxWidth}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${maxWidth}px;">
        <tr>
          <td align="center" style="padding-bottom:22px;">
            ${logoMarkup}
            <div class="email-value" style="font-family:${EMAIL_FONT};font-size:13px;line-height:1.4;letter-spacing:0.34em;text-transform:uppercase;font-weight:700;color:${light.value};">${escapeHtml(studioName)}</div>
            <div class="email-soft" style="font-family:${EMAIL_FONT};font-size:12px;line-height:1.5;color:${light.soft};margin-top:7px;">${escapeHtml(params.subtitle)}</div>
          </td>
        </tr>
        <tr>
          <td class="email-card email-border" bgcolor="${light.card}" style="background-color:${light.card};border:1px solid ${light.border};border-radius:16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="email-band email-border" bgcolor="${light.band}" style="padding:24px 26px 20px 26px;border-bottom:1px solid ${light.border};background-color:${light.band};border-radius:16px 16px 0 0;">
                  <div class="email-accent" style="font-family:${EMAIL_FONT};font-size:10px;line-height:1.4;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;color:${light.accent};">${escapeHtml(params.eyebrow)}</div>
                  <div class="${titleClass}" style="font-family:${EMAIL_FONT};font-size:20px;line-height:1.35;font-weight:700;color:${titleColor};margin-top:7px;">${escapeHtml(params.title)}</div>
                </td>
              </tr>
              <tr>
                <td class="email-content email-card" bgcolor="${light.card}" style="padding:24px 26px 28px 26px;background-color:${light.card};background-repeat:no-repeat;background-position:center center;background-size:320px 320px;">
                  <div class="email-label" style="font-family:${EMAIL_FONT};font-size:14px;line-height:1.65;color:${light.label};">${params.introHtml}</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
                    ${params.detailsHtml}
                  </table>
                  ${params.actionHtml || ""}
                </td>
              </tr>
              ${
                params.footerHtml
                  ? `<tr>
                <td class="email-band email-border" bgcolor="${light.band}" style="padding:16px 26px 20px 26px;border-top:1px solid ${light.border};background-color:${light.band};border-radius:0 0 16px 16px;">
                  <div class="email-soft" style="font-family:${EMAIL_FONT};font-size:11px;line-height:1.7;color:${light.soft};text-align:center;">${params.footerHtml}</div>
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
  return `<strong class="email-value" style="color:${palette.value};font-weight:600;">${escapeHtml(text)}</strong>`;
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
  const palette = lightEmailPalette(config);
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `New booking: ${booking.customer_name} - ${booking.service_name}`;
  const adminBaseUrl = getEngineBaseUrl();
  const reviewUrl =
    actionUrl ||
    `${adminBaseUrl}/a/${encodeURIComponent(booking.ref)}.${deriveReviewToken(booking.ref)}`;

  const rows: EmailDetailInput[] = [
    { label: "Customer", value: booking.customer_name },
    { label: "Phone", value: booking.customer_phone },
    { label: "Email", value: booking.customer_email },
    { label: "Treatment", value: booking.service_name },
    { label: "Time", value: osloTime },
    { label: "Price", value: `${booking.price_nok} ${currencyOf(config)}`, numeric: true },
  ];
  if (booking.notes) {
    rows.push({ label: "Notes", value: booking.notes });
  }

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "New booking",
    eyebrow: "Booking request",
    title: "New booking received",
    introHtml: `A new reservation is waiting for review at ${strongValue(palette, studioName)}.`,
    detailsHtml: emailDetailRows(palette, rows),
    actionHtml: emailButton(palette, reviewUrl, "Review booking →"),
    footerHtml: `Reference ${escapeHtml(booking.ref)}`,
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
  const { from, replyTo } = getSenderInfo(tenant, config, "owner");

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
  manageUrl?: string | null
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping customer receipt email.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = resolveConfig(tenant);
  const palette = lightEmailPalette(config);
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Request received at ${tenant.name}`;

  const rows: EmailDetailInput[] = [
    { label: "Reference", value: booking.ref },
    { label: "Treatment", value: booking.service_name },
    { label: "Requested time", value: osloTime },
    { label: "Price", value: `${booking.price_nok} ${currencyOf(config)}`, numeric: true },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Request received",
    eyebrow: "Booking request",
    title: "Thank you for your request",
    introHtml: `We have received your booking request at ${strongValue(
      palette,
      studioName
    )}. The studio is reviewing it now, and you will receive a confirmation as soon as the time is approved. We usually reply within a few hours on opening days.`,
    detailsHtml: emailDetailRows(palette, rows),
    actionHtml: manageUrl
      ? `<div style="text-align:center;margin-top:24px;font-family:${EMAIL_FONT};font-size:13px;line-height:1.6;color:${palette.label};">${emailTextLink(
          palette,
          manageUrl,
          "Manage your booking"
        )}</div>`
      : "",
    footerHtml: "Not you? You can safely ignore this email.",
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
 * Tells the owner that the customer copy could not be delivered.
 *
 * Fired from the Resend webhook (hard bounce / complaint / rejected send) and
 * from the admin resend action, so a typo in the customer's address surfaces
 * within seconds instead of the booking looking confirmed while the customer
 * has heard nothing.
 */
export async function sendOwnerEmailBounceAlert(
  tenant: Tenant,
  booking: BookingDetails,
  failure: { address: string; status: EmailDeliveryStatus; reason?: string | null }
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping email bounce alert.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = resolveConfig(tenant);
  const palette = lightEmailPalette(config);
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const adminBaseUrl = getEngineBaseUrl();
  const fixUrl = `${adminBaseUrl}/a/${encodeURIComponent(booking.ref)}.${deriveReviewToken(booking.ref)}`;
  const subject = `Customer email failed: ${booking.customer_name} (${booking.ref})`;

  const rows: EmailDetailInput[] = [
    { label: "Customer", value: booking.customer_name },
    { label: "Reference", value: booking.ref },
    { label: "Failed address", value: failure.address },
    { label: "Treatment", value: booking.service_name },
    { label: "Time", value: osloTime },
    { label: "Status", value: failure.status },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Email alert",
    eyebrow: "Receipt not delivered",
    title: "The customer did not receive the receipt",
    titleTone: "red",
    introHtml:
      "We could not deliver the confirmation to the customer's email address. The address most likely does not exist. Correct it and resend the receipt from the review page, otherwise the customer has no idea the appointment was booked.",
    detailsHtml: emailDetailRows(palette, rows),
    actionHtml:
      emailButton(palette, fixUrl, "Fix the email address →") +
      (failure.reason
        ? emailNoteBox(
            palette,
            `<strong style="color:${palette.value};font-weight:600;">Technical reason:</strong> ${escapeHtml(
              failure.reason
            )}`
          )
        : ""),
    footerHtml: `Reference ${escapeHtml(booking.ref)}`,
  });

  const { from, replyTo } = getSenderInfo(tenant, config, "owner");

  return sendEmailSafely(config, {
    from,
    replyTo,
    to: [tenant.owner_email],
    subject,
    html,
  });
}

/**
 * Immediate counterpart to the delivery webhook.
 *
 * A rejected or suppressed send never produces a delivery event, so waiting
 * for one means the owner is never told. Call this right after a customer
 * send returns an error; for accepted-but-later-bounced mail the webhook
 * handles the alert instead (and does not overlap, because this only fires
 * when the send itself failed).
 */
export async function alertOwnerIfDeliveryFailed(
  tenant: Tenant,
  booking: BookingDetails,
  outcome: EmailOutcome
): Promise<boolean> {
  if (!outcome.error) return false;

  try {
    await sendOwnerEmailBounceAlert(tenant, booking, {
      address: booking.customer_email,
      status: classifyEmailFailure(outcome.error),
      reason: outcome.error.message,
    });
    return true;
  } catch (err) {
    console.error("Owner delivery-failure alert failed:", err);
    return false;
  }
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
  const palette = lightEmailPalette(config);
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Confirmed: Your appointment at ${tenant.name}`;

  const rows: EmailDetailInput[] = [
    { label: "Reference", value: booking.ref },
    { label: "Treatment", value: booking.service_name },
    { label: "Time", value: osloTime },
    { label: "Price", value: `${booking.price_nok} ${currencyOf(config)}`, numeric: true },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Appointment confirmed",
    eyebrow: "Confirmation",
    title: "Your appointment is confirmed",
    titleTone: "green",
    introHtml: `Your appointment is confirmed! We look forward to seeing you at ${strongValue(
      palette,
      studioName
    )}.`,
    detailsHtml: emailDetailRows(palette, rows),
    actionHtml: emailNoteBox(
      palette,
      "A calendar file (.ics) is attached to this email so you can add the appointment to your calendar."
    ),
    footerHtml: `Reference ${escapeHtml(booking.ref)}`,
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

/**
 * Sends a reminder before a confirmed appointment.
 * The manage URL is derived server-side, so the customer can still cancel
 * outside the 24-hour window.
 */
export async function sendCustomerReminder(
  tenant: Tenant,
  booking: BookingDetails,
  manageUrl: string,
  hoursBefore: number
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping customer reminder email.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = resolveConfig(tenant);
  const palette = lightEmailPalette(config);
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Reminder: your appointment at ${tenant.name} is in ${hoursBefore} hours`;

  const rows: EmailDetailInput[] = [
    { label: "Reference", value: booking.ref },
    { label: "Treatment", value: booking.service_name },
    { label: "Time", value: osloTime },
    { label: "Price", value: `${booking.price_nok} ${currencyOf(config)}`, numeric: true },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: `${hoursBefore}-hour reminder`,
    eyebrow: "Appointment reminder",
    title: `Your appointment is in ${hoursBefore} hours`,
    introHtml: `This is a reminder for your appointment at ${strongValue(
      palette,
      studioName
    )}. If you can no longer make it, please let us know as early as possible.`,
    detailsHtml: emailDetailRows(palette, rows),
    actionHtml: emailButton(palette, manageUrl, "View or cancel →"),
    footerHtml: `Reference ${escapeHtml(booking.ref)}`,
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

export async function sendCustomerDeclined(
  tenant: Tenant,
  booking: BookingDetails
) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping customer declined email.");
    return { success: false, reason: "missing_api_key" };
  }

  const config = resolveConfig(tenant);
  const palette = lightEmailPalette(config);
  const studioName = studioNameOf(tenant, config);
  const subject = `Update on your appointment at ${tenant.name}`;

  const rows: EmailDetailInput[] = [
    { label: "Reference", value: booking.ref },
    { label: "Treatment", value: booking.service_name },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Update",
    eyebrow: "Booking request",
    title: "Your request could not be confirmed",
    titleTone: "red",
    introHtml:
      "Unfortunately your request could not be confirmed this time. Visit our website to choose another time.",
    detailsHtml: emailDetailRows(palette, rows),
    footerHtml: "Feel free to contact us if you have any questions.",
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
  const palette = lightEmailPalette(config);
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `Cancellation: ${booking.customer_name} - ${booking.service_name}`;

  const rows: EmailDetailInput[] = [
    { label: "Reference", value: booking.ref },
    { label: "Customer", value: booking.customer_name },
    { label: "Phone", value: booking.customer_phone },
    { label: "Treatment", value: booking.service_name },
    { label: "Original time", value: osloTime },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Cancellation",
    eyebrow: "Cancellation",
    title: "The customer cancelled the appointment",
    titleTone: "red",
    introHtml: `A customer has cancelled their appointment at ${strongValue(palette, studioName)}.`,
    detailsHtml: emailDetailRows(palette, rows),
    footerHtml: "The time slot is now free in the calendar.",
  });

  const { from, replyTo } = getSenderInfo(tenant, config, "owner");

  return sendEmailSafely(config, {
    from,
    replyTo,
    to: [tenant.owner_email],
    subject,
    html,
  });
}

export function renderPlatformOtpEmail(email: string, code: string): RenderedEmail {
  const platformConfig = buildTenantConfig({
    id: "platform",
    name: "A.Gure Platform Control Center",
    owner_email: email,
    contact_email: defaultReplyTo,
    logo_url: null,
    watermark_url: null,
    branding: {
      monogram: "AG",
      palette: { accent: "#C4A482", card: "#18181B", canvas: "#0A0A0A" },
    },
    profile: {},
  });
  const palette = lightEmailPalette(platformConfig);
  const subject = `Your A.Gure Platform verification code`;
  const html = renderEmailShell({
    config: platformConfig,
    tenantName: "A.Gure Platform Control Center",
    subtitle: "Platform & Multi-Tenant Administration",
    eyebrow: "Verification code",
    title: "Your platform login code",
    introHtml:
      "Use the following 6-digit code to sign in to the A.Gure Platform Control Center. The code is valid for 15 minutes.",
    detailsHtml: `<tr>
      <td align="center" style="padding-top:6px;">
        <div style="background-color:${palette.recessed};border:1px solid ${palette.border};border-radius:14px;padding:22px 16px;font-family:${EMAIL_FONT};font-size:30px;line-height:1;font-weight:800;letter-spacing:0.34em;color:${palette.value};font-variant-numeric:tabular-nums;">${escapeHtml(code)}</div>
      </td>
    </tr>`,
    footerHtml: "If you did not request this code, you can safely ignore this email.",
    maxWidth: 480,
  });
  return { subject, html };
}

export async function sendPlatformOtpEmail(email: string, code: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping Platform OTP email.");
    return { success: false, reason: "missing_api_key" };
  }
  const { subject, html } = renderPlatformOtpEmail(email, code);
  const platformConfig = buildTenantConfig({
    id: "platform",
    name: "A.Gure Platform Control Center",
    owner_email: email,
    contact_email: defaultReplyTo,
    logo_url: null,
    branding: { monogram: "AG" },
    profile: {},
  });
  const from = `A.Gure Platform <${DEFAULT_EMAIL_FROM_ADDRESS}>`;
  try {
    const result = await sendEmailSafely(platformConfig, {
      from,
      replyTo: defaultReplyTo,
      to: [email],
      subject,
      html,
    });
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data, from, subject };
  } catch (err) {
    console.error("RESEND PLATFORM OTP ERROR:", err);
    return { success: false, error: err };
  }
}

export async function sendOwnerOtpEmail(email: string, code: string, tenantId?: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set. Skipping OTP email.");
    return { success: false, reason: "missing_api_key" };
  }

  let tenantRow: Tenant | null = null;
  if (tenantId && supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle();
    tenantRow = (data as unknown as Tenant) || null;
  }

  const config =
    (tenantRow ? buildTenantConfig(tenantRow as unknown as TenantRow) : null) ??
    (tenantId ? getSeedTenant(tenantId) : null) ??
    buildTenantConfig({
      id: tenantId || "studio",
      name: defaultFromName,
      owner_email: email,
      contact_email: email,
      logo_url: null,
      profile: {},
    });

  const palette = lightEmailPalette(config);
  const studioTitle = tenantRow?.name || config.name || defaultFromName;
  const subject = `Your ${studioTitle} verification code: ${code}`;
  const html = renderEmailShell({
    config,
    tenantName: tenantRow?.from_name || studioTitle,
    subtitle: "Secure login",
    eyebrow: "Verification code",
    title: "Your login code",
    introHtml: `Use the following 6-digit code to sign in to ${strongValue(
      palette,
      studioTitle
    )}. The code is valid for 15 minutes.`,
    detailsHtml: `<tr>
      <td align="center" style="padding-top:6px;">
        <div style="background-color:${palette.recessed};border:1px solid ${palette.border};border-radius:14px;padding:22px 16px;font-family:${EMAIL_FONT};font-size:30px;line-height:1;font-weight:800;letter-spacing:0.34em;color:${palette.value};font-variant-numeric:tabular-nums;">${escapeHtml(code)}</div>
      </td>
    </tr>`,
    footerHtml: "If you did not request this code, you can safely ignore this email.",
    maxWidth: 480,
  });

  try {
    const { from, replyTo } = getSenderInfo(tenantRow, config, "owner");
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
    return { success: true, data: result.data, from, subject };
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
  const palette = lightEmailPalette(config);
  const studioName = studioNameOf(tenant, config);
  const osloTime = formatOsloDateTime(booking.start_utc);
  const subject = `New time confirmed at ${tenant.name}`;

  const rows: EmailDetailInput[] = [
    { label: "Reference", value: booking.ref },
    { label: "Treatment", value: booking.service_name },
    { label: "New time", value: osloTime },
    { label: "Price", value: `${booking.price_nok} ${currencyOf(config)}`, numeric: true },
  ];

  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "New time",
    eyebrow: "Change",
    title: "Your appointment has a new time",
    introHtml: `This confirms that your appointment at ${strongValue(
      palette,
      studioName
    )} has been moved.`,
    detailsHtml: emailDetailRows(palette, rows),
    actionHtml: emailNoteBox(
      palette,
      "The updated calendar file (.ics) is attached to this email."
    ),
    footerHtml: `Reference ${escapeHtml(booking.ref)}`,
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
  const palette = lightEmailPalette(config);
  const studioName = studioNameOf(tenant, config);
  const subject = `Test alert from ${tenant.name}`;
  const html = renderEmailShell({
    config,
    tenantName: studioName,
    subtitle: "Test alert",
    eyebrow: "System test",
    title: "Test of email notifications",
    introHtml: `This is a test alert sent from your control panel for ${strongValue(
      palette,
      studioName
    )}.`,
    detailsHtml: `<tr>
      <td style="padding-top:6px;">
        <div style="background-color:${palette.recessed};border:1px solid ${palette.border};border-radius:14px;padding:16px;font-family:${EMAIL_FONT};font-size:13px;line-height:1.65;color:${palette.value};">Status: the Resend email integration is working as expected.</div>
      </td>
    </tr>`,
    maxWidth: 500,
  });

  const { from, replyTo } = getSenderInfo(tenant, config, "owner");

  return sendEmailSafely(config, {
    from,
    replyTo,
    to: [recipientEmail],
    subject,
    html,
  });
}
