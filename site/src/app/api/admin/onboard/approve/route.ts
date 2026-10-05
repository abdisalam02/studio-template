import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyApprovalToken } from "@/lib/onboarding-token";
import { getTenantConfig } from "@/config/tenant.config";
import type { Database } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // design-ok

/* -------------------------------------------------------------------------- */
/*  Input helpers                                                             */
/* -------------------------------------------------------------------------- */

type JsonRecord = Record<string, unknown>;
type TenantInsert = Database["public"]["Tables"]["tenants"]["Insert"];

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

/** Coerces a numeric field, honouring a sensible fallback. */
function asNumber(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
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

/** Derives a booking reference prefix ("NOI") from explicit value, config, or name. */
function buildRefPrefix(explicit: string, slug: string, brandName: string): string {
  const source = explicit || brandName || slug;
  const cleaned = source.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  return cleaned || "STU";
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
/*  HTML responses                                                            */
/* -------------------------------------------------------------------------- */

function htmlPage(status: number, title: string, message: string, detail = ""): NextResponse {
  const body = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;min-height:100vh;background:#08080a;display:flex;align-items:center;justify-content:center;padding:32px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <div style="width:100%;max-width:520px;text-align:center;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.4);color:#d4af37;font-size:28px;">&#10003;</div>
      <h1 style="color:#fafafa;font-size:24px;font-weight:700;letter-spacing:-.01em;margin:24px 0 12px;">${escapeHtml(title)}</h1>
      <p style="color:#a1a1aa;font-size:15px;line-height:1.65;margin:0;">${escapeHtml(message)}</p>
      ${detail ? `<p style="color:#5b5b63;font-size:12px;line-height:1.6;margin:18px 0 0;">${escapeHtml(detail)}</p>` : ""}
    </div>
  </body>
</html>`;

  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/onboard/approve?token=...                                  */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const verified = verifyApprovalToken(token);
  if (!verified) {
    return htmlPage(400, "Link expired or invalid.", "This approval link is no longer valid.");
  }

  const data = verified as JsonRecord;
  const identity = asRecord(data.identity);
  const location = asRecord(data.location);
  const contact = asRecord(data.contact);
  const policies = asRecord(data.policies);

  const slug = normalizeSlug(
    firstText(data.slug, identity.slug, identity.brandName, identity.name)
  );
  if (!slug) {
    return htmlPage(400, "Link expired or invalid.", "The submission is missing a valid studio slug.");
  }
  if (!supabaseAdmin) {
    return htmlPage(500, "Approval unavailable.", "The server database is not configured.");
  }

  const brandName =
    firstText(identity.brandName, identity.studioName, identity.businessName, identity.name) ||
    slug;
  const ownerEmail =
    firstText(contact.email, identity.email, contact.ownerEmail, identity.ownerEmail) ||
    "booking@agure.space";

  // Prefer the tenant's declared prefix when one is registered for this slug,
  // then any explicit value in the submission, then the brand name.
  const registered = getTenantConfig(slug);
  const configuredPrefix = registered.id === slug ? registered.integrations.refPrefix : "";
  const refPrefix = buildRefPrefix(
    firstText(identity.refPrefix, contact.refPrefix, configuredPrefix),
    slug,
    brandName
  );

  const minNoticeMin =
    policies.cancellationHours !== undefined
      ? Math.round(asNumber(policies.cancellationHours, 24) * 60)
      : asNumber(policies.minNoticeMin, 120);

  const row: TenantInsert = {
    id: slug,
    name: brandName,
    owner_email: ownerEmail,
    ref_prefix: refPrefix,
    timezone: firstText(policies.timezone, identity.timezone) || "Europe/Oslo",
    allowed_origins: [],
    buffer_min: Math.max(0, Math.round(asNumber(policies.bufferMin, 10))),
    slot_step_min: Math.max(1, Math.round(asNumber(policies.slotStepMin, 30))),
    min_notice_min: Math.max(0, Math.round(minNoticeMin)),
    max_days_ahead: Math.max(1, Math.round(asNumber(policies.maxDaysAhead, 60))),
    pending_hold_min: Math.max(1, Math.round(asNumber(policies.pendingHoldMin, 1440))),
    active: true,
  };

  const { error } = await supabaseAdmin
    .from("tenants")
    .upsert(row, { onConflict: "id" });

  if (error) {
    console.error("ONBOARD APPROVE ERROR:", error);
    return htmlPage(
      500,
      "Approval could not be applied.",
      "The studio profile could not be written. Please retry the link or contact support."
    );
  }

  const address = firstText(location.address, location.fullAddress, location.street, location.city);
  const detail = `${brandName} · ${refPrefix}${address ? ` · ${address}` : ""}`;
  return htmlPage(
    200,
    "Studio Profile Approved & Live.",
    "The tenant profile has been updated.",
    detail
  );
}
