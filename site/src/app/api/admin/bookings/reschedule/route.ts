import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateIcsCalendar } from "@/lib/ics";
import {
  sendCustomerRescheduleConfirmation,
  emailOutcome,
  classifyEmailFailure,
  type Tenant,
} from "@/lib/email";
import {
  zonedDateTimeToUtc,
  zonedParts,
  validateSlot,
  slotErrorMessage,
} from "@/lib/bookingRules";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";
import { logAdminEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = isDev && req.nextUrl.searchParams.get("dev_bypass") === "true";

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "unauthorized", message: "Missing login." }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    let bookingId = body.booking_id || body.id;

    if (!bookingId && body.ref) {
      const { data: byRef } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .eq("ref", body.ref)
        .maybeSingle();
      if (byRef) bookingId = byRef.id;
    }

    if (!bookingId) {
      return NextResponse.json(
        { error: "missing_fields", message: "booking_id/ref is required." },
        { status: 400 }
      );
    }

    // 1. Load the booking first: the tenant timezone is needed to interpret
    // date/time, and duration/buffer come from the service row.
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select("*, tenants(*), services(*)")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "not_found", message: "Booking not found." }, { status: 404 });
    }

    const tenant = booking.tenants as unknown as Tenant;
    const service = booking.services as unknown as
      | { name: string; duration_min: number; buffer_min: number | null }
      | null;

    if (!tenant || !auth.email || !(await isTenantAdmin(auth.email, tenant.id))) {
      return NextResponse.json(
        { error: "forbidden", message: "You do not have access to this studio." },
        { status: 403 }
      );
    }

    const timezone = tenant?.timezone || "Europe/Oslo";

    const startUtc: number | null =
      body.start_utc ??
      (body.date && body.time ? zonedDateTimeToUtc(body.date, body.time, timezone) : null);

    if (!startUtc) {
      return NextResponse.json(
        { error: "missing_fields", message: "start_utc or date + time is required." },
        { status: 400 }
      );
    }

    const durationMin = service?.duration_min || 30;
    const bufferMin = service?.buffer_min ?? tenant?.buffer_min ?? 10;
    const endUtc = startUtc + durationMin * 60;
    const blockEndUtc = endUtc + bufferMin * 60;
    const nowUtc = Math.floor(Date.now() / 1000);

    const { weekday } = zonedParts(startUtc, timezone);
    const { data: shiftHours } = await supabaseAdmin
      .from("hours")
      .select("weekday, open_min, close_min")
      .eq("tenant_id", booking.tenant_id)
      .eq("weekday", weekday)
      .maybeSingle();

    const shift =
      shiftHours &&
      typeof shiftHours.open_min === "number" &&
      typeof shiftHours.close_min === "number" &&
      shiftHours.open_min < shiftHours.close_min
        ? { open_min: shiftHours.open_min, close_min: shiftHours.close_min }
        : null;

    const rules = {
      timezone,
      minNoticeMin: tenant?.min_notice_min ?? 120,
      maxDaysAhead: tenant?.max_days_ahead ?? 60,
      slotStepMin: tenant?.slot_step_min ?? 15,
    };

    const ruleError = validateSlot({ startUtc, durationMin, nowUtc, rules, shift });
    if (ruleError) {
      return NextResponse.json(
        { error: ruleError, message: slotErrorMessage(ruleError, rules) },
        { status: 400 }
      );
    }

    // 2. Single validated mutation path (lock + overlap + blackout + constraint).
    const { data: moved, error: moveErr } = await supabaseAdmin.rpc(
      "reschedule_booking_atomic",
      {
        p_booking_id: booking.id,
        p_start_utc: startUtc,
        p_end_utc: endUtc,
        p_block_end_utc: blockEndUtc,
        p_now: nowUtc,
      }
    );

    if (moveErr) {
      console.error("reschedule_booking_atomic failed:", moveErr);
      return NextResponse.json({ error: "update_failed", message: "Could not update the time." }, { status: 500 });
    }

    if (!moved) {
      return NextResponse.json(
        { error: "slot_taken", message: "That time overlaps another booking or a blackout." },
        { status: 409 }
      );
    }

    const { data: updated } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", booking.id)
      .single();

    // 3. Dispatch the updated ICS and notification to the customer.
    let emailStatus: string | null = null;
    let emailError: string | null = null;

    if (booking.customer_email && booking.customer_email.includes("@") && tenant) {
      const serviceName =
        (booking as typeof booking & { service_summary?: string | null }).service_summary ||
        service?.name ||
        "Treatment";

      const ics = generateIcsCalendar({
        ref: booking.ref,
        title: `${serviceName} - ${tenant.name}`,
        description: `Rescheduled booking for ${booking.customer_name}`,
        tenantName: tenant.name,
        startUtc,
        endUtc,
      });

      const sendResult = await sendCustomerRescheduleConfirmation(
        tenant,
        {
          ref: booking.ref,
          customer_name: booking.customer_name,
          customer_email: booking.customer_email,
          customer_phone: booking.customer_phone,
          service_name: serviceName,
          price_nok: booking.price_nok,
          start_utc: startUtc,
          end_utc: endUtc,
          notes: booking.notes,
        },
        ics
      );

      const outcome = emailOutcome(sendResult);
      emailStatus = outcome.error ? classifyEmailFailure(outcome.error) : "sent";
      emailError = outcome.error ? outcome.error.message : null;

      await supabaseAdmin
        .from("bookings")
        .update({
          resend_email_id: outcome.id,
          customer_email_status: emailStatus,
          customer_email_status_at: nowUtc,
          customer_email_error: emailError,
        })
        .eq("id", booking.id);
    }

    await logAdminEvent({
      actor: auth.email,
      tenantId: tenant.id,
      action: "booking.rescheduled",
      bookingRef: booking.ref,
      detail: { from: booking.start_utc, to: startUtc, email_status: emailStatus },
    });

    return NextResponse.json({
      success: true,
      booking: updated || { ...booking, start_utc: startUtc, end_utc: endUtc, block_end_utc: blockEndUtc },
      email: emailStatus ? { status: emailStatus, error: emailError } : null,
    });
  } catch (err) {
    console.error("Reschedule error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
