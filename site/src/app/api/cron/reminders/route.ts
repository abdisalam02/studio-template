import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { deriveManageToken } from "@/lib/tokens";
import { getEngineBaseUrl } from "@/lib/url";
import { sendCustomerReminder, emailOutcome, type Tenant } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Sends 24-hour and 2-hour reminders for confirmed bookings.
 *
 * Vercel Cron calls this hourly with `Authorization: Bearer $CRON_SECRET`.
 * The windows overlap two hours so one missed run does not skip a reminder.
 * `reminder_*_sent_at` makes the job idempotent.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }

  const header = req.headers.get("authorization") || "";
  const query = req.nextUrl.searchParams.get("secret") || "";
  if (header !== `Bearer ${secret}` && query !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
  }

  const now = Math.floor(Date.now() / 1000);
  const origin = getEngineBaseUrl(req);
  const debug = req.nextUrl.searchParams.get("debug") === "1";
  const results = { sent_24h: 0, sent_2h: 0, failed: 0 };
  const diagnostics: Array<Record<string, unknown>> = [];

  async function runWindow(hoursBefore: 24 | 2) {
    const column =
      hoursBefore === 24 ? "reminder_24h_sent_at" : "reminder_2h_sent_at";
    const from = now + (hoursBefore - 1) * 3600;
    const to = now + (hoursBefore + 1) * 3600;

    const { data: bookings, error } = await supabaseAdmin!
      .from("bookings")
      .select("*, tenants(*), services(name)")
      .eq("status", "confirmed")
      .is(column, null)
      .gte("start_utc", from)
      .lte("start_utc", to)
      .limit(50);

    if (debug) {
      diagnostics.push({
        window: `${hoursBefore}h`,
        column,
        from,
        to,
        now,
        count: bookings?.length ?? 0,
        refs: (bookings || []).map((b) => b.ref),
        error: error ? { message: error.message, code: error.code, details: error.details } : null,
      });
    }

    if (error) {
      console.error("Reminder query failed:", error);
      return;
    }

    for (const booking of bookings || []) {
      const tenant = booking.tenants as unknown as Tenant | null;
      const service = booking.services as unknown as { name: string } | null;
      if (!tenant || !booking.customer_email) continue;

      const manageUrl = `${origin}/m/${booking.ref}.${deriveManageToken(booking.ref)}`;

      try {
        const sendResult = await sendCustomerReminder(
          tenant,
          {
            ref: booking.ref,
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            customer_phone: booking.customer_phone,
            service_name:
              (booking as typeof booking & { service_summary?: string | null })
                .service_summary ||
              service?.name ||
              "Treatment",
            price_nok: booking.price_nok,
            start_utc: booking.start_utc,
            end_utc: booking.end_utc,
            notes: booking.notes,
          },
          manageUrl,
          hoursBefore
        );

        const outcome = emailOutcome(sendResult);
        if (outcome.error) {
          console.error(`Reminder (${hoursBefore}h) failed for ${booking.ref}:`, outcome.error);
          results.failed += 1;
          continue;
        }

        const patch =
          hoursBefore === 24
            ? { reminder_24h_sent_at: now }
            : { reminder_2h_sent_at: now };
        await supabaseAdmin!.from("bookings").update(patch).eq("id", booking.id);

        if (hoursBefore === 24) results.sent_24h += 1;
        else results.sent_2h += 1;
      } catch (err) {
        console.error(`Reminder (${hoursBefore}h) error for ${booking.ref}:`, err);
        results.failed += 1;
      }
    }
  }

  await runWindow(24);
  await runWindow(2);

  // ---------------------------------------------------------------------------
  // Daily retention pass.
  //
  // UptimeRobot polls every few minutes, so this only runs in the first ten
  // minutes of 03:00 UTC (once in practice) unless explicitly requested with
  // ?retention=1. Both database functions are idempotent.
  // ---------------------------------------------------------------------------
  let retention: { anonymised: number; events_purged: number } | null = null;
  const retentionDays = Number(process.env.RETENTION_DAYS || 365);
  const utc = new Date(now * 1000);
  const retentionDue =
    req.nextUrl.searchParams.get("retention") === "1" ||
    (utc.getUTCHours() === 3 && utc.getUTCMinutes() < 10);

  if (retentionDue && Number.isFinite(retentionDays) && retentionDays >= 30) {
    try {
      const { data: anonymised, error: anonymiseError } = await supabaseAdmin.rpc(
        "anonymize_old_bookings",
        { p_older_than_days: retentionDays, p_tenant_id: null }
      );

      if (anonymiseError) {
        console.error("anonymize_old_bookings failed:", anonymiseError);
      }

      // Audit trail: 12 months.
      const { data: purged, error: purgeError } = await supabaseAdmin.rpc(
        "purge_admin_events",
        { p_older_than_days: 365 }
      );

      if (purgeError) {
        console.warn("purge_admin_events failed:", purgeError);
      }

      retention = {
        anonymised: Number(anonymised ?? 0),
        events_purged: Number(purged ?? 0),
      };
    } catch (err) {
      console.error("Retention pass failed:", err);
    }
  }

  return NextResponse.json({
    success: true,
    ...results,
    ...(retention ? { retention } : {}),
    ...(debug ? { diagnostics } : {}),
  });
}
