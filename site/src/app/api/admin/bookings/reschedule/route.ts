import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateIcsCalendar } from "@/lib/ics";
import { sendCustomerRescheduleConfirmation, type Tenant } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "unauthorized", message: "Mangler innlogging." }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const body = await req.json();
    const { booking_id, start_utc, end_utc } = body;

    if (!booking_id || !start_utc) {
      return NextResponse.json(
        { error: "missing_fields", message: "booking_id og start_utc er påkrevd." },
        { status: 400 }
      );
    }

    // 1. Fetch current booking, tenant, service
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select("*, tenants(*), services(*)")
      .eq("id", booking_id)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "not_found", message: "Avtale ikke funnet." }, { status: 404 });
    }

    const tenant = booking.tenants as unknown as Tenant;
    const service = booking.services as { name: string; duration_min: number; buffer_min: number | null } | null;

    const durationMin = service?.duration_min || 30;
    const bufferMin = service?.buffer_min ?? tenant?.buffer_min ?? 10;
    const finalEndUtc = end_utc || start_utc + durationMin * 60;
    const blockEndUtc = finalEndUtc + bufferMin * 60;

    // 2. Update booking timestamps
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update({
        start_utc,
        end_utc: finalEndUtc,
        block_end_utc: blockEndUtc,
      })
      .eq("id", booking_id)
      .select()
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ error: "update_failed", message: "Kunne ikke oppdatere tidspunkt." }, { status: 500 });
    }

    // 3. Dispatch updated ICS and notification email to customer
    if (booking.customer_email && booking.customer_email.includes("@") && tenant) {
      try {
        const serviceName = service?.name || "Behandling";
        const ics = generateIcsCalendar({
          ref: updated.ref,
          title: `${serviceName} - ${tenant.name}`,
          description: `Flyttet timebestilling for ${updated.customer_name}`,
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
