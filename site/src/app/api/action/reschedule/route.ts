import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyReviewToken } from "@/lib/tokens";
import { generateIcsCalendar } from "@/lib/ics";
import {
  sendCustomerRescheduleConfirmation,
  emailOutcome,
  classifyEmailFailure,
} from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Interprets "YYYY-MM-DD" + "HH:MM" in the tenant's timezone and returns epoch
 * seconds. Mirrors the conversion used by the public booking route.
 */
function localToUtc(dateStr: string, timeStr: string, timeZone: string): number | null {
  const dm = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!dm || !tm) return null;

  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  const h = Number(tm[1]);
  const mi = Number(tm[2]);
  if (h > 23 || mi > 59) return null;

  const target = Date.UTC(y, mo - 1, d, h, mi, 0);
  let guess = target;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });

  for (let i = 0; i < 3; i++) {
    const parts = fmt.formatToParts(new Date(guess));
    const p: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== "literal") p[part.type] = Number(part.value);
    }
    const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second || 0);
    const diff = target - local;
    if (diff === 0) break;
    guess += diff;
  }

  return Math.floor(guess / 1000);
}

/**
 * Moves a booking from the owner's review page (/a/<ref>.<token>).
 * The review link is already a bearer credential for approving or declining,
 * so it also authorises rescheduling. Validates overlap and blackouts here
 * because this route does not go through the admin session.
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
    } | null;

    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const timezone = tenant.timezone || "Europe/Oslo";
    const startUtc = localToUtc(date, time, timezone);
    if (!startUtc) {
      return NextResponse.json(
        { error: "invalid_datetime", message: "Enter a valid date and time." },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const minNotice = (tenant.min_notice_min ?? 120) * 60;
    if (startUtc < now + minNotice) {
      return NextResponse.json(
        {
          error: "too_soon",
          message: "Pick a time at least two hours from now.",
        },
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

    // Overlap check against every other live booking for this studio.
    const { data: overlapping, error: overlapErr } = await supabaseAdmin
      .from("bookings")
      .select("id, status, expires_at")
      .eq("tenant_id", booking.tenant_id)
      .neq("id", booking.id)
      .lt("start_utc", blockEndUtc)
      .gt("block_end_utc", startUtc);

    if (overlapErr) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    const blocking = (overlapping || []).filter((b) => {
      if (b.status === "confirmed") return true;
      if (b.status === "pending") return !b.expires_at || b.expires_at > now;
      return false;
    });
    if (blocking.length > 0) {
      return NextResponse.json(
        { error: "slot_taken", message: "That time is already booked. Choose another." },
        { status: 409 }
      );
    }

    const { data: blackout } = await supabaseAdmin
      .from("blackouts")
      .select("id")
      .eq("tenant_id", booking.tenant_id)
      .lt("start_utc", endUtc)
      .gt("end_utc", startUtc)
      .limit(1)
      .maybeSingle();

    if (blackout) {
      return NextResponse.json(
        { error: "slot_blocked", message: "The studio is unavailable at that time." },
        { status: 409 }
      );
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update({ start_utc: startUtc, end_utc: endUtc, block_end_utc: blockEndUtc })
      .eq("id", booking.id)
      .select("*")
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    const serviceName =
      (updated as typeof updated & { service_summary?: string | null }).service_summary ||
      service?.name ||
      "Treatment";

    const ics = generateIcsCalendar({
      ref: updated.ref,
      title: `${serviceName} - ${tenant.name}`,
      description: `Rescheduled booking for ${updated.customer_name}. Reference: ${updated.ref}.`,
      startUtc: updated.start_utc,
      endUtc: updated.end_utc,
      tenantName: tenant.name,
    });

    const sendResult = await sendCustomerRescheduleConfirmation(
      tenant as unknown as Parameters<typeof sendCustomerRescheduleConfirmation>[0],
      {
        ref: updated.ref,
        customer_name: updated.customer_name,
        customer_email: updated.customer_email,
        customer_phone: updated.customer_phone,
        service_name: serviceName,
        price_nok: updated.price_nok,
        start_utc: updated.start_utc,
        end_utc: updated.end_utc,
        notes: updated.notes,
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
        customer_email_status_at: now,
        customer_email_error: emailError,
      })
      .eq("id", booking.id);

    return NextResponse.json({
      success: true,
      start_utc: updated.start_utc,
      end_utc: updated.end_utc,
      email: { status: emailStatus, error: emailError },
    });
  } catch (err: unknown) {
    console.error("Error in action reschedule route:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
