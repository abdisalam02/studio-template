import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateIcsCalendar } from "@/lib/ics";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";
import { logAdminEvent } from "@/lib/audit";
import {
  sendCustomerConfirmation,
  sendCustomerReceipt,
  sendCustomerDeclined,
  emailOutcome,
  classifyEmailFailure,
  type BookingDetails,
  type Tenant,
} from "@/lib/email";

export const dynamic = "force-dynamic";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Re-sends the customer copy of a booking, optionally after correcting the
 * address. This is the fix step after a bounce: the webhook marks the booking,
 * the owner corrects the typo here, and the customer finally gets their mail.
 *
 * Works for any status so it can also repair an older booking whose receipt
 * never arrived. Confirmed bookings get the calendar attachment, everything
 * else gets the "request received" copy (without the manage link, which can
 * only be derived from the token hash at creation time).
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = Boolean(
      isDev &&
        (body?.dev_bypass === true ||
          req.nextUrl.searchParams.get("dev_bypass") === "true")
    );

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userEmail = (auth.email || "").toLowerCase();

    const bookingId = body.id || body.booking_id;
    const ref = body.ref;
    if (!bookingId && !ref) {
      return NextResponse.json(
        { error: "invalid_payload", message: "booking_id/id or ref is required." },
        { status: 400 }
      );
    }

    const query = supabaseAdmin
      .from("bookings")
      .select("*, tenants(*), services(*)");

    const { data: booking, error: bookingErr } = bookingId
      ? await query.eq("id", bookingId).maybeSingle()
      : await query.eq("ref", ref).maybeSingle();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }

    const tenant = booking.tenants as unknown as Tenant | null;
    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const isOwner =
      Boolean(tenant.owner_email) &&
      tenant.owner_email.toLowerCase() === userEmail;
    if (!allowBypass && !isOwner) {
      if (!(await isTenantAdmin(userEmail, tenant.id))) {
        return NextResponse.json(
          { error: "forbidden", message: "You do not have access to this studio." },
          { status: 403 }
        );
      }
    }

    // Optional correction of the address. Validated before the send so a typo
    // cannot be written into the booking.
    const requestedEmail =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (requestedEmail && !EMAIL_SHAPE.test(requestedEmail)) {
      return NextResponse.json(
        { error: "invalid_email", message: "Adressen ser ikke ut som en gyldig e-post." },
        { status: 400 }
      );
    }
    const targetEmail = requestedEmail || booking.customer_email;

    const service = booking.services as unknown as
      | { name: string; price_nok: number }
      | null;
    const bookingWithSummary = booking as typeof booking & {
      service_summary?: string | null;
    };
    const serviceName =
      bookingWithSummary.service_summary || service?.name || "Behandling";

    const details: BookingDetails = {
      ref: booking.ref,
      customer_name: booking.customer_name,
      customer_email: targetEmail,
      customer_phone: booking.customer_phone,
      service_name: serviceName,
      price_nok: booking.price_nok,
      start_utc: booking.start_utc,
      end_utc: booking.end_utc,
      notes: booking.notes,
    };

    const sendResult =
      booking.status === "confirmed"
        ? await sendCustomerConfirmation(
            tenant,
            details,
            generateIcsCalendar({
              ref: booking.ref,
              title: `${serviceName} - ${tenant.name}`,
              description: `Booking for ${booking.customer_name}. Reference: ${booking.ref}.`,
              startUtc: booking.start_utc,
              endUtc: booking.end_utc,
              tenantName: tenant.name,
            })
          )
        : booking.status === "declined" || booking.status === "cancelled"
        ? await sendCustomerDeclined(tenant, details)
        : await sendCustomerReceipt(tenant, details, null);

    const outcome = emailOutcome(sendResult);
    const emailStatus = outcome.error
      ? classifyEmailFailure(outcome.error)
      : "sent";
    const emailError = outcome.error ? outcome.error.message : null;

    await supabaseAdmin
      .from("bookings")
      .update({
        customer_email: targetEmail,
        resend_email_id: outcome.id,
        customer_email_status: emailStatus,
        customer_email_status_at: Math.floor(Date.now() / 1000),
        customer_email_error: emailError,
      })
      .eq("id", booking.id);

    await logAdminEvent({
      actor: userEmail,
      tenantId: tenant.id,
      action: "booking.email_resent",
      bookingRef: booking.ref,
      detail: { email: targetEmail, status: emailStatus },
    });

    return NextResponse.json({
      success: !outcome.error,
      customer_email: targetEmail,
      email_id: outcome.id,
      email: { status: emailStatus, error: emailError },
    });
  } catch (err: unknown) {
    console.error("Error in admin booking resend route:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
