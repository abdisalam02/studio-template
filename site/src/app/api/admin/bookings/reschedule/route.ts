import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateIcsCalendar } from "@/lib/ics";
import { sendCustomerRescheduleConfirmation, type Tenant } from "@/lib/email";

import { verifyAdminRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = Boolean(
      isDev && (
        req.nextUrl.searchParams.get("dev_bypass") === "true" ||
        isDev
      )
    );

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "unauthorized", message: "Missing login." }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    let bookingId = body.booking_id || body.id;
    let startUtc = body.start_utc;
    const endUtc = body.end_utc;

    // Support resolution via booking reference code (e.g. GNG-7A21)
    if (!bookingId && body.ref) {
      const { data: bByRef } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .eq("ref", body.ref)
        .maybeSingle();
      if (bByRef) bookingId = bByRef.id;
    }

    // Support flexible date ("YYYY-MM-DD") and time ("HH:MM") format
    if (!startUtc && body.date && body.time) {
      const dt = new Date(`${body.date}T${body.time}:00+02:00`);
      startUtc = Math.floor(dt.getTime() / 1000);
    }

    if (!bookingId || !startUtc) {
      return NextResponse.json(
        { error: "missing_fields", message: "booking_id/ref and start_utc/date+time are required." },
        { status: 400 }
      );
    }

    // 1. Fetch current booking, tenant, service
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select("*, tenants(*), services(*)")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "not_found", message: "Booking not found." }, { status: 404 });
    }

    const tenant = booking.tenants as unknown as Tenant;
    const service = booking.services as { name: string; duration_min: number; buffer_min: number | null } | null;

    const durationMin = service?.duration_min || 30;
    const bufferMin = service?.buffer_min ?? tenant?.buffer_min ?? 10;
    const finalEndUtc = endUtc || startUtc + durationMin * 60;
    const blockEndUtc = finalEndUtc + bufferMin * 60;

    // 2. Update booking timestamps
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update({
        start_utc: startUtc,
        end_utc: finalEndUtc,
        block_end_utc: blockEndUtc,
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ error: "update_failed", message: "Could not update the time." }, { status: 500 });
    }

    // 3. Dispatch updated ICS and notification email to customer
    if (booking.customer_email && booking.customer_email.includes("@") && tenant) {
      try {
        const serviceName = service?.name || "Behandling";
        const ics = generateIcsCalendar({
          ref: updated.ref,
          title: `${serviceName} - ${tenant.name}`,
          description: `Rescheduled booking for ${updated.customer_name}`,
          tenantName: tenant.name,
          startUtc: updated.start_utc,
          endUtc: updated.end_utc,
        });

        await sendCustomerRescheduleConfirmation(
          tenant,
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
      } catch (err) {
        console.warn("Could not dispatch reschedule email:", err);
      }
    }

    return NextResponse.json({ success: true, booking: updated });
  } catch (err) {
    console.error("Reschedule error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
