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

interface SubmissionSummary {
  brandName: string;
  orgNumber: string;
  phone: string;
  address: string;
  slug: string;
  contactEmail: string;
}

function buildReviewEmail(summary: SubmissionSummary, reviewLink: string): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1f1f24;color:#8b8b93;font-size:12px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 0 10px 20px;border-bottom:1px solid #1f1f24;color:#fafafa;font-size:15px;font-weight:600;">${value ? escapeHtml(value) : '<span style="color:#5b5b63;font-weight:400;">Not provided</span>'}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#08080a;">
    <div style="max-width:600px;margin:0 auto;padding:40px 24px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
      <div style="border:1px solid #1f1f24;border-radius:18px;overflow:hidden;background:#0d0d10;">
        <div style="padding:28px 32px;border-bottom:1px solid #1f1f24;">
          <div style="color:#d4af37;font-size:11px;letter-spacing:.28em;text-transform:uppercase;font-weight:700;">New Studio Profile</div>
          <div style="color:#fafafa;font-size:26px;font-weight:700;margin-top:10px;letter-spacing:-.01em;">${escapeHtml(summary.brandName)}</div>
        </div>
        <div style="padding:8px 32px 4px;">
          <table style="width:100%;border-collapse:collapse;">
            ${row("Brand name", summary.brandName)}
            ${row("Org. number", summary.orgNumber)}
            ${row("Phone", summary.phone)}
            ${row("Address", summary.address)}
            ${row("Slug", summary.slug)}
            ${row("Contact email", summary.contactEmail)}
          </table>
        </div>
        <div style="padding:28px 32px 34px;">
          <a href="${escapeHtml(reviewLink)}" style="display:block;text-align:center;background:#d4af37;color:#08080a;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.02em;padding:16px 24px;border-radius:12px;">Approve &amp; Apply to Live</a>
          <p style="color:#6f6f77;font-size:12px;line-height:1.6;margin:18px 0 0;text-align:center;">This link is single-purpose and expires 72 hours after submission. If you did not expect this request, you can safely ignore it.</p>
        </div>
      </div>
      <p style="color:#3f3f46;font-size:11px;text-align:center;margin:20px 0 0;letter-spacing:.06em;">AGURE STUDIO PLATFORM</p>
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

  const summary: SubmissionSummary = {
    brandName: firstText(
      identity.brandName,
      identity.studioName,
      identity.businessName,
      identity.name,
      body.slug
    ),
    orgNumber: firstText(
      identity.orgNumber,
      identity.org_number,
      contact.orgNumber,
      policies.orgNumber
    ),
    phone: firstText(contact.phone, identity.phone, contact.telephone),
    address: firstText(
      location.address,
      location.fullAddress,
      location.street,
      location.city
    ),
    slug,
    contactEmail: firstText(contact.email, identity.email, social.email),
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
      submittedAt: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "server_configuration_error" },
      { status: 500, headers }
    );
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://abdisalam.space"
  ).replace(/\/+$/, "");
  const reviewLink = `${baseUrl}/api/admin/onboard/approve?token=${encodeURIComponent(token)}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const result = await resend.emails.send({
        from: REVIEW_FROM,
        to: REVIEW_RECIPIENT,
        replyTo: summary.contactEmail || undefined,
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
