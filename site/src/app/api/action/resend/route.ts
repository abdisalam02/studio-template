import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyReviewToken } from "@/lib/tokens";
import { generateIcsCalendar } from "@/lib/ics";
import {
  sendCustomerConfirmation,
  sendCustomerDeclined,
  sendCustomerReceipt,
  emailOutcome,
  classifyEmailFailure,
  type BookingDetails,
  type Tenant,
} from "@/lib/email";

export const dynamic = "force-dynamic";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Re-sends the customer copy from the owner's review page (/a/<ref>.<token>).
 *
 * The review link is already a bearer credential for accepting or declining
 * the booking, so it also authorises repairing the address and resending the
 * message. Without that, a bounced receipt left the owner with no way to reach
 * the customer except WhatsApp.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { ref, token } = body as { ref?: string; token?: string };

    if (!ref || !token) {
      return NextResponse.json(
        { error: "invalid_payload", message: "ref and token are required." },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("*, tenants(*), services(*)")
      .eq("ref", ref)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }

    if (!verifyReviewToken(ref, token, booking.action_token_hash)) {
      return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 403 });
    }

    const tenant = booking.tenants as unknown as Tenant | null;
    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const requestedEmail =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (requestedEmail && !EMAIL_SHAPE.test(requestedEmail)) {
      return NextResponse.json(
        { error: "invalid_email", message: "That does not look like a valid email address." },
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
      bookingWithSummary.service_summary || service?.name || "Treatment";

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

    return NextResponse.json({
      success: !outcome.error,
      customer_email: targetEmail,
      email_id: outcome.id,
      email: { status: emailStatus, error: emailError },
    });
  } catch (err: unknown) {
    console.error("Error in action resend route:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
