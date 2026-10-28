import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";
import { generateIcsCalendar } from "@/lib/ics";
import {
  sendCustomerConfirmation,
  sendCustomerDeclined,
  emailOutcome,
  classifyEmailFailure,
  alertOwnerIfDeliveryFailed,
  type EmailDeliveryStatus,
  type Tenant,
} from "@/lib/email";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";
import type { BookingStatus } from "@/types/database";

export const dynamic = "force-dynamic"; // design-ok

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { status } = body;
    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = Boolean(
      isDev && (
        body?.dev_bypass === true ||
        req.nextUrl.searchParams.get("dev_bypass") === "true"
      )
    );

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: "unauthorized", message: "Missing login." }, { status: 401 });
    }
    const userEmail = auth.email.toLowerCase();

    let bookingId = body.id || body.booking_id;
    if (!bookingId && body.ref) {
      const { data: bByRef } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .eq("ref", body.ref)
        .maybeSingle();
      if (bByRef) bookingId = bByRef.id;
    }

    if (!bookingId || (status !== "confirmed" && status !== "declined" && status !== "cancelled")) {
      return NextResponse.json(
        { error: "invalid_payload", message: "booking_id/id/ref and status ('confirmed' | 'declined' | 'cancelled') are required." },
        { status: 400 }
      );
    }

    // Fetch booking, tenant, and service
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("*, tenants(*), services(*)")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }

    const tenant = booking.tenants as unknown as Tenant | null;
    if (!allowBypass && (!tenant || !(await isTenantAdmin(userEmail, tenant.id)))) {
      return NextResponse.json({ error: "forbidden", message: "You do not have access to this studio." }, { status: 403 });
    }

    const now = Math.floor(Date.now() / 1000);
    const newStatus: BookingStatus = status;

    const { data: updatedBooking, error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update({
        status: newStatus,
        decided_at: now,
      })
      .eq("id", booking.id)
      .select("*")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "database_error", details: updateErr.message }, { status: 500 });
    }

    // Send emails if the tenant exists. The joined service row can be absent
    // (multi-service booking, or a service deleted after the fact), so fall
    // back to the summary stored on the booking instead of silently skipping
    // the customer's confirmation / rejection email.
    const service = booking.services as unknown as { name: string; price_nok: number } | null;
    const bookingWithSummary = booking as typeof booking & {
      service_summary?: string | null;
    };
    let emailStatus: EmailDeliveryStatus | null = null;
    let emailError: string | null = null;

    if (tenant) {
      const serviceName =
        bookingWithSummary.service_summary || service?.name || "Behandling";

      const bookingDetails = {
        ref: booking.ref,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone,
        service_name: serviceName,
        price_nok: booking.price_nok,
        start_utc: booking.start_utc,
        end_utc: booking.end_utc,
        notes: booking.notes,
      };

      let sendResult: unknown = null;

      if (status === "confirmed") {
        const icsContent = generateIcsCalendar({
          ref: booking.ref,
          title: `${serviceName} - ${tenant.name}`,
          description: `Booking for ${booking.customer_name}. Reference: ${booking.ref}.`,
          startUtc: booking.start_utc,
          endUtc: booking.end_utc,
          tenantName: tenant.name,
        });

        sendResult = await sendCustomerConfirmation(tenant, bookingDetails, icsContent);
      } else if (status === "declined" || status === "cancelled") {
        sendResult = await sendCustomerDeclined(tenant, bookingDetails);
      }

      if (sendResult) {
        const outcome = emailOutcome(sendResult);
        emailStatus = outcome.error
          ? classifyEmailFailure(outcome.error)
          : "sent";
        emailError = outcome.error ? outcome.error.message : null;

        await supabaseAdmin
          .from("bookings")
          .update({
            resend_email_id: outcome.id,
            customer_email_status: emailStatus,
            customer_email_status_at: now,
            customer_email_error: emailError,
          })
          .eq("id", booking.id);

        if (outcome.error) {
          await alertOwnerIfDeliveryFailed(tenant, bookingDetails, outcome);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        status: newStatus,
        booking: updatedBooking || booking,
        email: emailStatus ? { status: emailStatus, error: emailError } : null,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Error in admin booking status route:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
