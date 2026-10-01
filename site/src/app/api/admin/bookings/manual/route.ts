import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateBookingRef, generateSecureToken, hashToken } from "@/lib/tokens";
import { generateIcsCalendar } from "@/lib/ics";
import { sendCustomerConfirmation, type Tenant } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "unauthorized", message: "Mangler innlogging." }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    let userEmail = "niwache12@gmail.com";
    if (process.env.NODE_ENV === "production" || !token.startsWith("dev-bypass-")) {
      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && userData.user?.email) {
        userEmail = userData.user.email;
      }
    }

    const body = await req.json();
    const {
      tenant_id,
      customer_name,
      customer_phone,
      customer_email,
      service_id,
      start_utc,
      notes,
    } = body;

    if (!tenant_id || !customer_name || !customer_phone || !start_utc) {
      return NextResponse.json(
        { error: "missing_fields", message: "Navn, telefon og tidspunkt er påkrevd." },
        { status: 400 }
      );
    }

    // 1. Fetch tenant & service
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenant_id)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    let serviceName = "Manuell avtale";
    let durationMin = 30;
    let priceNok = 0;
    let bufferMin = tenant.buffer_min || 10;

    if (service_id) {
      const { data: s } = await supabaseAdmin
        .from("services")
        .select("*")
        .eq("id", service_id)
        .maybeSingle();

      if (s) {
        serviceName = s.name;
        durationMin = s.duration_min;
        priceNok = s.price_nok;
        if (s.buffer_min != null) bufferMin = s.buffer_min;
      }
    }

    const endUtc = start_utc + durationMin * 60;
    const blockEndUtc = endUtc + bufferMin * 60;
    const ref = generateBookingRef(tenant.ref_prefix || "BKG");
    const actionToken = generateSecureToken();
    const manageToken = generateSecureToken();
    const actionHash = hashToken(actionToken);
    const manageHash = hashToken(manageToken);
    const now = Math.floor(Date.now() / 1000);

    // 2. Insert booking directly
    const { data: booking, error: insertErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        ref,
        tenant_id,
        service_id: service_id || null,
        start_utc,
        end_utc: endUtc,
        block_end_utc: blockEndUtc,
        status: "confirmed",
        customer_name,
        customer_phone,
        customer_email: customer_email || "",
        notes: notes || "Manuelt registrert avtale",
        price_nok: priceNok,
        deposit_nok: 0,
        consent_at: now,
        privacy_version: "v1",
        action_token_hash: actionHash,
        manage_token_hash: manageHash,
        created_at: now,
        decided_at: now,
      } as any)
      .select()
      .single();

    if (insertErr || !booking) {
      console.error("Failed to insert manual booking:", insertErr);
      return NextResponse.json({ error: "insert_failed", message: "Kunne ikke opprette avtale." }, { status: 500 });
    }

    // 3. Send confirmation email if email provided
    if (customer_email && customer_email.includes("@")) {
      try {
        const ics = generateIcsCalendar({
          ref: booking.ref,
          title: `${serviceName} - ${tenant.name}`,
          description: `Timebestilling for ${booking.customer_name}`,
          tenantName: tenant.name,
          startUtc: booking.start_utc,
          endUtc: booking.end_utc,
        });

        await sendCustomerConfirmation(
          tenant as unknown as Tenant,
          {
            ref: booking.ref,
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            customer_phone: booking.customer_phone,
            service_name: serviceName,
            price_nok: booking.price_nok,
            start_utc: booking.start_utc,
            end_utc: booking.end_utc,
            notes: booking.notes,
          },
          ics
        );
      } catch (err) {
        console.warn("Could not send confirmation email for manual booking:", err);
      }
    }

    return NextResponse.json({ success: true, booking });
  } catch (err) {
    console.error("Manual booking error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
