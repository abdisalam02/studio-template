import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";
import { generateBookingRef, generateSecureToken, hashToken } from "@/lib/tokens";
import { zonedDateTimeToUtc } from "@/lib/bookingRules";
import { generateIcsCalendar } from "@/lib/ics";
import {
  sendCustomerConfirmation,
  emailOutcome,
  classifyEmailFailure,
  type Tenant,
} from "@/lib/email";

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

    const body = await req.json();
    const {
      tenant_id,
      customer_name,
      customer_phone,
      customer_email,
      service_id,
      start_utc,
      date,
      time,
      notes,
    } = body;

    if (!tenant_id || !customer_name || !customer_phone || (!start_utc && (!date || !time))) {
      return NextResponse.json(
        { error: "missing_fields", message: "Name, phone and time are required." },
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

    if (!(await isTenantAdmin(auth.email, tenant_id))) {
      return NextResponse.json(
        { error: "forbidden", message: "You do not have access to this studio." },
        { status: 403 }
      );
    }

    // Interpret date + time in the studio's timezone; a numeric start_utc is
    // still accepted for older clients.
    const timezone = tenant.timezone || "Europe/Oslo";
    const startUtc: number | null =
      start_utc ?? (date && time ? zonedDateTimeToUtc(date, time, timezone) : null);

    if (!startUtc) {
      return NextResponse.json(
        { error: "invalid_datetime", message: "Enter a valid date and time." },
        { status: 400 }
      );
    }

    let serviceName = "Manual appointment";
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

    const endUtc = startUtc + durationMin * 60;
    const blockEndUtc = endUtc + bufferMin * 60;
    const ref = generateBookingRef(tenant.ref_prefix || "BKG");
    const actionToken = generateSecureToken();
    const manageToken = generateSecureToken();
    const now = Math.floor(Date.now() / 1000);

    // 2. Single validated mutation path: the RPC locks per tenant and rejects
    // overlaps and blackouts, so a manual booking cannot double-book.
    const { data: inserted, error: rpcErr } = await supabaseAdmin.rpc(
      "create_booking_atomic",
      {
        p_ref: ref,
        p_tenant_id: tenant_id,
        p_service_id: service_id || null,
        p_start_utc: start_utc,
        p_end_utc: endUtc,
        p_block_end_utc: blockEndUtc,
        p_status: "confirmed",
        p_customer_name: customer_name,
        p_customer_email: customer_email || "",
        p_customer_phone: customer_phone,
        p_notes: notes || "Manually registered by the studio",
        p_price_nok: priceNok,
        p_deposit_nok: 0,
        p_consent_at: now,
        p_privacy_version: "manual",
        p_action_token_hash: hashToken(actionToken),
        p_manage_token_hash: hashToken(manageToken),
        p_now: now,
        p_expires_at: null,
        p_service_ids: service_id ? [service_id] : [],
        p_service_summary: serviceName,
        p_custom_fields: {},
      }
    );

    if (rpcErr) {
      console.error("Failed to create manual booking:", rpcErr);
      return NextResponse.json(
        { error: "insert_failed", message: "Could not create the appointment." },
        { status: 500 }
      );
    }

    if (!inserted) {
      return NextResponse.json(
        {
          error: "slot_taken",
          message: "That time overlaps another booking or a blackout.",
        },
        { status: 409 }
      );
    }

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("ref", ref)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    await supabaseAdmin
      .from("bookings")
      .update({ decided_at: now })
      .eq("id", booking.id);

    // 3. Send confirmation email if email provided
    let emailStatus: string | null = null;
    let emailError: string | null = null;

    if (customer_email && customer_email.includes("@")) {
      try {
        const ics = generateIcsCalendar({
          ref: booking.ref,
          title: `${serviceName} - ${tenant.name}`,
          description: `Booking for ${booking.customer_name}`,
          tenantName: tenant.name,
          startUtc: booking.start_utc,
          endUtc: booking.end_utc,
        });

        const sendResult = await sendCustomerConfirmation(
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

        const outcome = emailOutcome(sendResult);
        emailStatus = outcome.error ? classifyEmailFailure(outcome.error) : "sent";
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
      } catch (err) {
        console.warn("Could not send confirmation email for manual booking:", err);
      }
    }

    return NextResponse.json({
      success: true,
      booking,
      email: emailStatus ? { status: emailStatus, error: emailError } : null,
    });
  } catch (err) {
    console.error("Manual booking error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
