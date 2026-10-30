import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";
import { logAdminEvent } from "@/lib/audit";
import { generateBookingRef, generateSecureToken, hashToken } from "@/lib/tokens";
import { zonedDateTimeToUtc } from "@/lib/bookingRules";
import { generateIcsCalendar } from "@/lib/ics";
import {
  sendCustomerConfirmation,
  emailOutcome,
  classifyEmailFailure,
  type Tenant,
} from "@/lib/email";

export const dynamic = "force-dynamic"; // design-ok

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
    const {
      tenant_id,
      customer_name,
      customer_phone,
      customer_email,
      client_name,
      client_phone,
      client_email,
      service_id,
      service_name,
      treatment_name,
      start_utc,
      date,
      time,
      notes,
    } = body;

    // The admin portal posts `client_*`; older clients post `customer_*`.
    const resolvedName = customer_name || client_name;
    const resolvedPhone = customer_phone || client_phone;
    const resolvedEmail = customer_email || client_email || "";
    const requestedServiceName = String(service_name || treatment_name || "").trim();

    if (!tenant_id || !resolvedName || !resolvedPhone || (!start_utc && (!date || !time))) {
      return NextResponse.json(
        { error: "missing_fields", message: "Name, phone and time are required." },
        { status: 400 }
      );
    }

    // A <select> sends the service id as a string; the RPC expects bigint.
    let serviceId: number | null =
      service_id === undefined || service_id === null || service_id === ""
        ? null
        : Number(service_id);
    if (serviceId !== null && (!Number.isFinite(serviceId) || Number(serviceId) <= 0)) {
      return NextResponse.json(
        { error: "invalid_service", message: "Choose a valid treatment." },
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

    let serviceName = requestedServiceName || "Manual appointment";
    let durationMin = 30;
    let priceNok = 0;
    let bufferMin = tenant.buffer_min || 10;

    // Always scope the service lookup to this tenant so a forged service_id
    // cannot pull another studio's name/price/duration into this booking.
    if (serviceId) {
      const { data: s } = await supabaseAdmin
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (!s) {
        return NextResponse.json(
          { error: "invalid_service", message: "That treatment does not belong to this studio." },
          { status: 400 }
        );
      }

      serviceName = s.name;
      durationMin = s.duration_min;
      priceNok = s.price_nok;
      if (s.buffer_min != null) bufferMin = s.buffer_min;
    } else if (requestedServiceName) {
      // The portal sends a service name ("Signature Treatment"), not an id.
      const { data: s } = await supabaseAdmin
        .from("services")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("name", requestedServiceName)
        .maybeSingle();

      if (s) {
        serviceId = s.id;
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
        p_service_id: serviceId,
        p_start_utc: startUtc,
        p_end_utc: endUtc,
        p_block_end_utc: blockEndUtc,
        p_status: "confirmed",
        p_customer_name: resolvedName,
        p_customer_email: resolvedEmail,
        p_customer_phone: resolvedPhone,
        p_notes: notes || "Manually registered by the studio",
        p_price_nok: priceNok,
        p_deposit_nok: 0,
        p_consent_at: now,
        p_privacy_version: "manual",
        p_action_token_hash: hashToken(actionToken),
        p_manage_token_hash: hashToken(manageToken),
        p_now: now,
        p_expires_at: null,
        p_service_ids: serviceId ? [serviceId] : [],
        p_service_summary: serviceName,
        p_custom_fields: {},
      }
    );

    if (rpcErr) {
      console.error("Failed to create manual booking:", rpcErr);
      return NextResponse.json(
        { error: "insert_failed", message: "Could not create the appointment.", details: rpcErr.message },
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

    if (resolvedEmail && resolvedEmail.includes("@")) {
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

    await logAdminEvent({
      actor: auth.email || "admin",
      tenantId: tenant_id,
      action: "booking.manual_created",
      bookingRef: booking.ref,
      detail: { service: serviceName, start_utc: booking.start_utc },
    });

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

