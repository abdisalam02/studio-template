import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyReviewToken } from "@/lib/tokens";
import { generateIcsCalendar } from "@/lib/ics";
import {
  zonedDateTimeToUtc,
  zonedParts,
  validateSlot,
  slotErrorMessage,
} from "@/lib/bookingRules";
import {
  sendCustomerRescheduleConfirmation,
  emailOutcome,
  classifyEmailFailure,
} from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Moves a booking from the owner's review page (/a/<ref>.<token>).
 *
 * The review link is already a bearer credential for approving or declining,
 * so it also authorises rescheduling. The mutation itself goes through
 * reschedule_booking_atomic so this path shares the same lock, overlap,
 * blackout and constraint rules as every other writer.
 */
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { ref, token, date, time } = body as {
      ref?: string;
      token?: string;
      date?: string;
      time?: string;
    };

    if (!ref || !token || !date || !time) {
      return NextResponse.json(
        { error: "invalid_payload", message: "ref, token, date and time are required." },
        { status: 400 }
      );
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

    const tenant = booking.tenants as unknown as {
      id: string;
      name: string;
      timezone?: string | null;
      buffer_min?: number | null;
      min_notice_min?: number | null;
      max_days_ahead?: number | null;
      slot_step_min?: number | null;
    } | null;

    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const timezone = tenant.timezone || "Europe/Oslo";
    const startUtc = zonedDateTimeToUtc(date, time, timezone);
    if (!startUtc) {
      return NextResponse.json(
        { error: "invalid_datetime", message: "Enter a valid date and time." },
        { status: 400 }
      );
    }

    const service = booking.services as unknown as
      | { name: string; duration_min: number; buffer_min: number | null }
      | null;
    const durationMin = service?.duration_min || 30;
    const bufferMin = service?.buffer_min ?? tenant.buffer_min ?? 10;
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
      minNoticeMin: tenant.min_notice_min ?? 120,
      maxDaysAhead: tenant.max_days_ahead ?? 60,
      slotStepMin: tenant.slot_step_min ?? 15,
    };

    const ruleError = validateSlot({ startUtc, durationMin, nowUtc, rules, shift });
    if (ruleError) {
      return NextResponse.json(
        { error: ruleError, message: slotErrorMessage(ruleError, rules) },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    if (!moved) {
      return NextResponse.json(
        { error: "slot_taken", message: "That time is already booked or blocked. Choose another." },
        { status: 409 }
      );
    }

    const serviceName =
      (booking as typeof booking & { service_summary?: string | null }).service_summary ||
      service?.name ||
      "Treatment";

    const ics = generateIcsCalendar({
      ref: booking.ref,
      title: `${serviceName} - ${tenant.name}`,
      description: `Rescheduled booking for ${booking.customer_name}. Reference: ${booking.ref}.`,
      startUtc,
      endUtc,
      tenantName: tenant.name,
    });

    const sendResult = await sendCustomerRescheduleConfirmation(
      tenant as unknown as Parameters<typeof sendCustomerRescheduleConfirmation>[0],
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
    const emailStatus = outcome.error ? classifyEmailFailure(outcome.error) : "sent";
    const emailError = outcome.error ? outcome.error.message : null;

    await supabaseAdmin
      .from("bookings")
      .update({
        resend_email_id: outcome.id,
        customer_email_status: emailStatus,
        customer_email_status_at: nowUtc,
        customer_email_error: emailError,
      })
      .eq("id", booking.id);

    return NextResponse.json({
      success: true,
      start_utc: startUtc,
      end_utc: endUtc,
      email: { status: emailStatus, error: emailError },
    });
  } catch (err: unknown) {
    console.error("Error in action reschedule route:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
