import { NextRequest, NextResponse } from "next/server";
import { getTenantConfig } from "@/config/tenant.config";
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
 *   GET /api/dev/preview-email?type=owner    (default)  → "Ny timebestilling mottatt"
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
    notes: "Forhåndsvisning av e-postdesign (kun i utviklingsmiljø).",
  };
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
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

  return new NextResponse(rendered.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Email-Type": type,
      "X-Email-Tenant": slug,
      "X-Email-Subject": rendered.subject.replace(/[^\x20-\x7E]/g, ""),
    },
  });
}
