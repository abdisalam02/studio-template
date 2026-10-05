import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { getTenantConfig } from "@/config/tenant.config";
import { resolveBrandLogo } from "@/lib/brandAsset";
import {
  renderOwnerAlertEmail,
  renderCustomerConfirmationEmail,
  type Tenant,
  type BookingDetails,
} from "@/lib/email";

export const dynamic = "force-dynamic"; // design-ok

/**
 * Dev-only visual harness for the transactional email templates.
 *
 *   GET /api/dev/preview-email?type=owner    (default)  → "New booking received"
 *   GET /api/dev/preview-email?type=customer            → customer confirmation
 *   GET /api/dev/preview-email?type=customer&tenant=studio-klo
 *
 * Returns raw text/html so the design can be inspected directly in a browser.
 * Hard-disabled in production.
 */
function buildTenantFixture(slug: string): Tenant {
  const config = getTenantConfig(slug);
  const prefix =
    (config.name || "BKG")
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 3)
      .toUpperCase() || "BKG";

  return {
    id: config.id,
    name: config.name,
    owner_email: config.contact.ownerEmail,
    phone: config.contact.phone || null,
    profile: null,
    ref_prefix: prefix,
    timezone: config.rules.timezone,
    allowed_origins: [],
    buffer_min: config.rules.bufferMin,
    slot_step_min: config.rules.slotStepMin,
    min_notice_min: config.rules.minNoticeMin,
    max_days_ahead: config.rules.maxDaysAhead,
    pending_hold_min: config.rules.pendingHoldMin,
    active: true,
    created_at: Math.floor(Date.now() / 1000),
  };
}

function buildBookingFixture(tenant: Tenant, slug: string): BookingDetails {
  const config = getTenantConfig(slug);
  const service = config.services[0];
  const durationMin = service?.durationMin ?? 30;
  const startUtc = Math.floor(Date.now() / 1000) + 2 * 86400;

  return {
    ref: `${tenant.ref_prefix}-PREVIEW`,
    customer_name: "Testkunde Eksempel",
    customer_email: tenant.owner_email,
    customer_phone: config.contact.phone,
    service_name: service?.name ?? "Behandling",
    price_nok: service?.priceNok ?? 0,
    start_utc: startUtc,
    end_utc: startUtc + durationMin * 60,
    notes: "Email design preview (development only).",
  };
}

export async function GET(req: NextRequest) {
  // Strict production isolation: this development-only harness must be
  // indistinguishable from a non-existent route in production.
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "owner").toLowerCase() === "customer"
    ? "customer"
    : "owner";
  const slug = searchParams.get("tenant") || "gangina";

  const tenant = buildTenantFixture(slug);
  const booking = buildBookingFixture(tenant, slug);

  const origin = req.nextUrl.origin;
  const actionUrl = `${origin}/a/${booking.ref}.preview-action-token`;

  const rendered =
    type === "customer"
      ? renderCustomerConfirmationEmail(tenant, booking)
      : renderOwnerAlertEmail(tenant, booking, actionUrl);

  // Browsers cannot resolve the `cid:` scheme, so the inline email logo would
  // render as a broken image in this preview. Resolve the brand logo on disk
  // and swap every `cid:studio-brand-logo` reference for an inlined data URI.
  const config = getTenantConfig(slug);
  let html = rendered.html;
  const logo = resolveBrandLogo(config.theme.logoUrl);
  if (logo && html.includes("cid:studio-brand-logo")) {
    try {
      const base64 = fs.readFileSync(logo.absolutePath).toString("base64");
      const dataUri = `data:${logo.contentType || "image/png"};base64,${base64}`;
      html = html.split("cid:studio-brand-logo").join(dataUri);
    } catch (err) {
      console.warn("preview-email: unable to inline brand logo", err);
    }
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Email-Type": type,
      "X-Email-Tenant": slug,
      "X-Email-Subject": rendered.subject.replace(/[^\x20-\x7E]/g, ""),
      "X-Email-Logo-Inlined": logo ? "true" : "false",
    },
  });
}
