import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createApprovalToken } from "@/lib/onboarding-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // design-ok

/* -------------------------------------------------------------------------- */
/*  CORS                                                                      */
/* -------------------------------------------------------------------------- */

/** The Noire intake front-end running on Cloudflare Workers. */
const STATIC_ALLOWED_ORIGINS = ["https://noire.niwache12.workers.dev"];

/** Local development ports used by the intake front-end. */
const DEV_PORTS = new Set(["3000", "3001", "3002", "5173"]);
const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Resolves the request Origin to an allowed value, or null when rejected. */
function resolveAllowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;

  if (STATIC_ALLOWED_ORIGINS.includes(origin)) return origin;

  const extra = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (extra.includes(origin)) return origin;

  try {
    const url = new URL(origin);
    if (!LOCALHOST_HOSTS.has(url.hostname.toLowerCase())) return null;
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    return DEV_PORTS.has(port) ? origin : null;
  } catch {
    return null;
  }
}

/** Builds the CORS response headers for an allowed origin. */
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, Accept",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(resolveAllowedOrigin(req)),
  });
}

/* -------------------------------------------------------------------------- */
/*  Input helpers                                                             */
/* -------------------------------------------------------------------------- */

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/** Returns the first non-empty string among the candidates. */
function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return "";
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* -------------------------------------------------------------------------- */
/*  Review email                                                              */
/* -------------------------------------------------------------------------- */

const REVIEW_RECIPIENT = "niwache15@gmail.com";
const REVIEW_FROM = "Studio Intake <booking@agure.space>";

/**
 * Canonical, non-redirecting base for emailed approval links.
 *
 * Always `https://www.abdisalam.space`: the apex domain issues a Vercel
 * redirect, and a redirect on an emailed GET can drop the `?token=` query
 * string. Only an explicit localhost URL (local development) overrides it so
 * the round-trip remains testable on the dev machine.
 */
const CANONICAL_BASE_URL = "https://www.abdisalam.space";

function resolveCanonicalBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  if (configured && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(configured)) {
    return configured;
  }
  return CANONICAL_BASE_URL;
}

interface SubmissionSummary {
  slug: string;
  brandName: string;
  shortName: string;
  legalEntity: string;
  orgNumber: string;
  mvaStatus: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  mapsUrl: string;
  instagram: string;
  instagramUrl: string;
  tiktok: string;
  tiktokUrl: string;
  cancellationWindow: string;
  noShowFee: string;
  acceptedPayments: string;
  submittedAt: string;
}

/* --- value formatters ----------------------------------------------------- */

function formatDuration(value: unknown): string {
  const raw = asText(value);
  if (!raw) return "";
  const n = Number(raw);
  if (Number.isFinite(n)) return `${n} ${n === 1 ? "hour" : "hours"}`;
  return raw;
}

function formatPercent(value: unknown): string {
  const raw = asText(value);
  if (!raw) return "";
  const n = Number(raw);
  if (Number.isFinite(n)) return `${n}%`;
  return raw;
}

function formatList(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => asText(entry)).filter(Boolean).join(", ");
  }
  return asText(value);
}

/** Normalises a social profile into a display handle + canonical URL. */
function socialProfile(value: string, domain: string): { label: string; url: string } {
  const raw = value.trim();
  if (!raw) return { label: "", url: "" };
  if (/^https?:\/\//i.test(raw)) {
    const match = raw.match(new RegExp(`${domain}/(?:@)?([^/?#]+)`, "i"));
    return { label: match ? `@${match[1]}` : raw, url: raw };
  }
  const handle = raw.replace(/^@/, "");
  return { label: `@${handle}`, url: `https://${domain}/${handle}` };
}

function buildMapsUrl(explicit: string, address: string): string {
  if (explicit) return explicit;
  if (!address) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function formatSubmittedAt(value: number): string {
  try {
    return `${new Date(value).toLocaleString("en-GB", {
      timeZone: "Europe/Oslo",
      dateStyle: "long",
      timeStyle: "short",
    })} (Europe/Oslo)`;
  } catch {
    return new Date(value).toISOString();
  }
}

/* --- email HTML ----------------------------------------------------------- */

const EMAIL_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const NOT_PROVIDED = '<span style="color:#A1A1AA;">Not provided</span>';

interface EmailRow {
  label: string;
  /** Pre-escaped, email-safe HTML. */
  value: string;
}

function plainValue(value: string): string {
  return value ? escapeHtml(value) : NOT_PROVIDED;
}

function linkValue(href: string, text: string): string {
  if (!href) return NOT_PROVIDED;
  return `<a href="${escapeHtml(href)}" style="color:#0C0D0E;text-decoration:underline;">${escapeHtml(
    text || href
  )}</a>`;
}

function emailSection(title: string, rows: EmailRow[]): string {
  const body = rows
    .map(
      (row) => `
            <tr>
              <td style="padding:12px 16px 12px 0;border-bottom:1px solid #E4E4E7;font-size:13px;line-height:1.5;color:#71717A;vertical-align:top;white-space:nowrap;">${escapeHtml(
                row.label
              )}</td>
              <td style="padding:12px 0;border-bottom:1px solid #E4E4E7;font-size:14px;line-height:1.5;color:#0C0D0E;font-weight:600;text-align:right;vertical-align:top;word-break:break-word;">${
                row.value
              }</td>
            </tr>`
    )
    .join("");

  return `
        <h2 style="margin:0 0 2px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#71717A;">${escapeHtml(
          title
        )}</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 26px;">
          ${body}
        </table>`;
}

/** Bulletproof (VML + anchor) dark approval button, centered. */
function emailApprovalButton(reviewLink: string): string {
  const href = escapeHtml(reviewLink);
  const label = "Approve &amp; Apply to Live Studio &#8594;";
  return `
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:28px auto;">
          <tr>
            <td align="center" bgcolor="#0C0D0E" style="border-radius:6px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:46px;v-text-anchor:middle;width:360px;" arcsize="13%" stroke="f" fillcolor="#0C0D0E">
                <w:anchorlock/>
                <center style="color:#FFFFFF;font-family:${EMAIL_FONT};font-size:15px;font-weight:600;letter-spacing:0.5px;">${label}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${href}" style="display:inline-block;background:#0C0D0E;color:#FFFFFF;font-size:15px;font-weight:600;letter-spacing:0.5px;text-decoration:none;padding:14px 28px;border-radius:6px;">${label}</a>
              <!--<![endif]-->
            </td>
          </tr>
        </table>`;
}

function buildReviewEmail(summary: SubmissionSummary, reviewLink: string): string {
  const identityRows: EmailRow[] = [
    { label: "Brand Name", value: plainValue(summary.brandName) },
    { label: "Short Name", value: plainValue(summary.shortName) },
    { label: "Legal Entity", value: plainValue(summary.legalEntity) },
    { label: "Org Number", value: plainValue(summary.orgNumber) },
    { label: "VAT / MVA Status", value: plainValue(summary.mvaStatus) },
  ];
  const contactRows: EmailRow[] = [
    {
      label: "Email",
      value: summary.email ? linkValue(`mailto:${summary.email}`, summary.email) : NOT_PROVIDED,
    },
    {
      label: "Phone",
      value: summary.phone
        ? linkValue(`tel:${summary.phone.replace(/\s+/g, "")}`, summary.phone)
        : NOT_PROVIDED,
    },
    { label: "WhatsApp", value: plainValue(summary.whatsapp) },
    { label: "Address", value: plainValue(summary.address) },
    {
      label: "Google Maps",
      value: summary.mapsUrl ? linkValue(summary.mapsUrl, "Open in Google Maps") : NOT_PROVIDED,
    },
  ];
  const socialRows: EmailRow[] = [
    {
      label: "Instagram",
      value: summary.instagramUrl
        ? linkValue(summary.instagramUrl, summary.instagram)
        : NOT_PROVIDED,
    },
    {
      label: "TikTok",
      value: summary.tiktokUrl ? linkValue(summary.tiktokUrl, summary.tiktok) : NOT_PROVIDED,
    },
  ];
  const policyRows: EmailRow[] = [
    { label: "Cancellation Window", value: plainValue(summary.cancellationWindow) },
    { label: "No-Show Fee", value: plainValue(summary.noShowFee) },
    { label: "Accepted Payments", value: plainValue(summary.acceptedPayments) },
  ];

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>Studio Onboarding Review</title>
  </head>
  <body style="margin:0;padding:0;background:#F4F4F5;">
    <div style="max-width:580px;margin:0 auto;padding:32px 16px;font-family:${EMAIL_FONT};-webkit-font-smoothing:antialiased;">
      <div style="background:#FFFFFF;border:1px solid #E4E4E7;border-radius:12px;padding:32px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#71717A;">Studio Onboarding Review</div>
        <h1 style="margin:12px 0 6px;font-size:24px;line-height:1.3;font-weight:700;color:#0C0D0E;letter-spacing:-0.01em;">${escapeHtml(
          summary.brandName || "New Studio"
        )}</h1>
        <div style="font-size:12px;color:#A1A1AA;">Submitted ${escapeHtml(summary.submittedAt)}</div>

        <div style="height:1px;background:#E4E4E7;margin:24px 0;"></div>

        ${emailSection("Identity", identityRows)}
        ${emailSection("Contact & Location", contactRows)}
        ${emailSection("Social", socialRows)}
        ${emailSection("Policies", policyRows)}

        ${emailApprovalButton(reviewLink)}

        <p style="margin:0;font-size:12px;line-height:1.6;color:#71717A;">This single-use cryptographic token expires in 72 hours. Live database records will only be modified once approved.</p>
        <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#A1A1AA;">Button not working? Paste this link into your browser:<br /><a href="${escapeHtml(
          reviewLink
        )}" style="color:#A1A1AA;word-break:break-all;">${escapeHtml(reviewLink)}</a></p>
      </div>
      <p style="margin:20px 0 0;text-align:center;font-size:11px;color:#A1A1AA;letter-spacing:0.06em;">AGURE STUDIO PLATFORM</p>
    </div>
  </body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/*  POST /api/v1/onboard/submit                                               */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const origin = resolveAllowedOrigin(req);
  const headers = corsHeaders(origin);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_json" },
      { status: 400, headers }
    );
  }

  const body = asRecord(rawBody);
  const identity = asRecord(body.identity);
  const location = asRecord(body.location);
  const contact = asRecord(body.contact);
  const social = asRecord(body.social);
  const policies = asRecord(body.policies);

  const slug = normalizeSlug(
    firstText(body.slug, identity.slug, identity.brandName, identity.name)
  );
  if (!slug) {
    return NextResponse.json(
      { success: false, error: "missing_slug" },
      { status: 400, headers }
    );
  }

  const submittedAt = Date.now();
  const address = firstText(
    location.address,
    location.fullAddress,
    location.street,
    location.city
  );
  const instagram = socialProfile(
    firstText(social.instagram, social.instagramUrl, social.instagramHandle),
    "instagram.com"
  );
  const tiktok = socialProfile(
    firstText(social.tiktok, social.tikTok, social.tiktokUrl),
    "tiktok.com"
  );

  const summary: SubmissionSummary = {
    slug,
    brandName: firstText(
      identity.brandName,
      identity.studioName,
      identity.businessName,
      identity.name,
      body.slug
    ),
    shortName: firstText(
      identity.shortName,
      identity.brandShortName,
      identity.short,
      identity.abbreviation
    ),
    legalEntity: firstText(
      identity.legalEntity,
      identity.legalName,
      identity.companyName,
      identity.registeredName
    ),
    orgNumber: firstText(
      identity.orgNumber,
      identity.org_number,
      contact.orgNumber,
      policies.orgNumber
    ),
    mvaStatus: firstText(identity.mvaStatus, identity.vatStatus, identity.mva),
    email: firstText(contact.email, identity.email, social.email),
    phone: firstText(contact.phone, identity.phone, contact.telephone),
    whatsapp: firstText(contact.whatsapp, contact.whatsApp, identity.whatsapp),
    address,
    mapsUrl: buildMapsUrl(
      firstText(
        location.mapsUrl,
        location.googleMaps,
        location.mapsLink,
        location.googleMapsLink
      ),
      address
    ),
    instagram: instagram.label,
    instagramUrl: instagram.url,
    tiktok: tiktok.label,
    tiktokUrl: tiktok.url,
    cancellationWindow: formatDuration(
      firstText(policies.cancellationWindow) || policies.cancellationHours
    ),
    noShowFee: formatPercent(
      firstText(policies.noShowFee, policies.noShowFeePercent, policies.noShowFeePct)
    ),
    acceptedPayments: formatList(
      policies.acceptedPayments ?? policies.payments ?? policies.paymentMethods
    ),
    submittedAt: formatSubmittedAt(submittedAt),
  };

  // No database writes here: the submission is only captured in the signed
  // token, so the live `tenants` table is untouched until an admin approves.
  let token: string;
  try {
    token = createApprovalToken({
      slug,
      identity,
      location,
      contact,
      social,
      policies,
      submittedAt,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "server_configuration_error" },
      { status: 500, headers }
    );
  }

  const reviewLink = `${resolveCanonicalBaseUrl()}/api/admin/onboard/approve?token=${encodeURIComponent(
    token
  )}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const result = await resend.emails.send({
        from: REVIEW_FROM,
        to: REVIEW_RECIPIENT,
        replyTo: summary.email || undefined,
        subject: `New studio profile: ${summary.brandName || "Untitled"}`,
        html: buildReviewEmail(summary, reviewLink),
      });
      if (result.error) {
        console.error("ONBOARD REVIEW EMAIL ERROR:", result.error);
      }
    } catch (error) {
      console.error("ONBOARD REVIEW EMAIL ERROR:", error);
    }
  } else {
    console.warn("RESEND_API_KEY is not set. Skipping onboarding review email.");
  }

  return NextResponse.json(
    { success: true, message: "Profile received for review" },
    { status: 200, headers }
  );
}
