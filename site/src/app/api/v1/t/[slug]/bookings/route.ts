import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  generateBookingRef,
  generateSecureToken,
  hashToken,
} from "@/lib/tokens";
import { sendOwnerAlert, sendCustomerReceipt } from "@/lib/email";
import { getEngineBaseUrl } from "@/lib/url";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Normalizes start_utc from epoch seconds, milliseconds, or ISO/date string in Europe/Oslo
 */
function normalizeStartUtc(val: unknown, timeZone = "Europe/Oslo"): number | null {
  if (typeof val === "number" && !isNaN(val)) {
    // If greater than 10^11, it's likely milliseconds
    return val > 100000000000 ? Math.floor(val / 1000) : Math.floor(val);
  }
  if (typeof val === "string" && val.trim()) {
    const trimmed = val.trim();
    // Numeric string
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      return num > 100000000000 ? Math.floor(num / 1000) : Math.floor(num);
    }
    // ISO string with Z or offset
    if (trimmed.includes("T") || trimmed.includes("Z") || trimmed.includes("+")) {
      const parsed = Date.parse(trimmed);
      if (!isNaN(parsed)) return Math.floor(parsed / 1000);
    }
    // "YYYY-MM-DD HH:MM" or "YYYY-MM-DD"
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (match) {
      const y = Number(match[1]);
      const m = Number(match[2]);
      const d = Number(match[3]);
      const h = Number(match[4] || 12);
      const min = Number(match[5] || 0);

      // Guess UTC
      let guessMs = Date.UTC(y, m - 1, d, h, min, 0);
      const formatter = new Intl.DateTimeFormat("en-US", {
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
        const parts = formatter.formatToParts(new Date(guessMs));
        const p: Record<string, number> = {};
        for (const part of parts) {
          if (part.type !== "literal") p[part.type] = Number(part.value);
        }
        const localMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second || 0);
        const targetMs = Date.UTC(y, m - 1, d, h, min, 0);
        const diff = targetMs - localMs;
        if (diff === 0) break;
        guessMs += diff;
      }
      return Math.floor(guessMs / 1000);
    }
  }
  return null;
}

/**
 * Normalizes customer phone numbers, stripping whitespace and ensuring +47 prefix if missing
 */
function normalizePhone(rawPhone: unknown): string {
  if (!rawPhone || typeof rawPhone !== "string") return "+4700000000";
  let clean = rawPhone.replace(/[^\d+]/g, "").trim();
  if (!clean.startsWith("+")) {
    if (clean.startsWith("00")) {
      clean = "+" + clean.slice(2);
    } else if (clean.startsWith("47") && clean.length >= 10) {
      clean = "+" + clean;
    } else {
      clean = "+47" + clean;
    }
  }
  return clean;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { error: "missing_slug" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const body = await req.json();
    console.log('=== INCOMING BOOKING BODY ===', JSON.stringify(body, null, 2));

    const {
      service_id,
      service_ids,
      service_name,
      service_summary,
      custom_fields,
      tooth_placement,
      placement,
      start_utc,
      start_time,
      customer_name,
      customer_email,
      customer_phone,
      customer,
      notes,
      consent,
    } = body;

    const rawCustomerName = customer_name || customer?.name;
    const rawCustomerEmail = customer_email || customer?.email;
    const rawCustomerPhone = customer_phone || customer?.phone;
    const rawNotes = notes || customer?.notes || "";
    const rawStartTime = start_utc || start_time;

    // 1. Fetch tenant first so we have timezone & default config
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "server_configuration_error", message: "Database client unavailable." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", slug)
      .eq("active", true)
      .single();

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404, headers: CORS_HEADERS });
    }

    // 2. Resolve service IDs (accept array, single number, or string ID/name fallback)
    let resolvedServiceIds: number[] = [];
    if (Array.isArray(service_ids) && service_ids.length > 0) {
      resolvedServiceIds = service_ids.map(Number).filter((n) => !isNaN(n) && n > 0);
    } else if (service_id !== undefined && service_id !== null) {
      const num = Number(service_id);
      if (!isNaN(num) && num > 0) resolvedServiceIds = [num];
    }

    // If still missing or string name passed, resolve by tenant services
    const { data: tenantServices } = await supabaseAdmin
      .from("services")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("sort", { ascending: true });

    if (resolvedServiceIds.length === 0 && tenantServices && tenantServices.length > 0) {
      const searchName = String(service_name || service_summary || "").toLowerCase();
      const matched = tenantServices.find((s) => searchName && s.name.toLowerCase().includes(searchName));
      resolvedServiceIds = [matched ? matched.id : tenantServices[0].id];
    }

    // 3. Normalize start_utc
    const normalizedStartUtc = normalizeStartUtc(rawStartTime, tenant.timezone || "Europe/Oslo");

    // 4. Normalize phone and custom fields
    const normalizedPhone = normalizePhone(rawCustomerPhone);

    // Merge nested or flat custom fields (placement / tooth_placement)
    const mergedCustomFields: Record<string, string> = {};
    if (custom_fields && typeof custom_fields === "object") {
      Object.assign(mergedCustomFields, custom_fields);
    }
    if (tooth_placement && typeof tooth_placement === "string") {
      mergedCustomFields.placement = tooth_placement;
    }
    if (placement && typeof placement === "string") {
      mergedCustomFields.placement = placement;
    }

    // Validate essential fields
    if (
      resolvedServiceIds.length === 0 ||
      normalizedStartUtc === null ||
      !rawCustomerName ||
      typeof rawCustomerName !== "string" ||
      !rawCustomerEmail ||
      typeof rawCustomerEmail !== "string"
    ) {
      return NextResponse.json(
        {
          error: "invalid_payload",
          message:
            "service_id/service_ids, valid start_utc, customer_name, and customer_email are required.",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Query matched services
    let { data: services, error: servicesErr } = await supabaseAdmin
      .from("services")
      .select("*")
      .in("id", resolvedServiceIds)
      .eq("tenant_id", tenant.id)
      .eq("active", true);

    if ((servicesErr || !services || services.length === 0) && tenantServices && tenantServices.length > 0) {
      services = [tenantServices[0]];
      servicesErr = null;
    }

    if (servicesErr || !services || services.length === 0) {
      return NextResponse.json({ error: "service_not_found" }, { status: 404, headers: CORS_HEADERS });
    }

    // Compute combined duration, price and buffer
    const totalDurationMin = services.reduce((acc, s) => acc + s.duration_min, 0);
    const totalPriceNok = services.reduce((acc, s) => acc + s.price_nok, 0);
    const primaryService = services[0];
    const maxBufferMin = services.reduce(
      (max, s) => Math.max(max, s.buffer_min ?? tenant.buffer_min),
      tenant.buffer_min
    );

    const durationSeconds = totalDurationMin * 60;
    const bufferSeconds = maxBufferMin * 60;
    const end_utc = normalizedStartUtc + durationSeconds;
    const block_end_utc = end_utc + bufferSeconds;
    const now = Math.floor(Date.now() / 1000);
    const expires_at = now + tenant.pending_hold_min * 60;

    const combinedServiceName =
      service_summary ||
      (services.length > 1
        ? services.map((s) => s.name).join(" + ")
        : primaryService.name);

    let formattedNotes = rawNotes ? String(rawNotes).trim() : "";
    if (Object.keys(mergedCustomFields).length > 0) {
      const customNotes = Object.entries(mergedCustomFields)
        .map(([k, v]) => `[${k}]: ${v}`)
        .join(" | ");
      formattedNotes = formattedNotes
        ? `${formattedNotes} \n${customNotes}`
        : customNotes;
    }

    // Generate credentials
    const ref = generateBookingRef(tenant.ref_prefix);
    const actionToken = generateSecureToken();
    const manageToken = generateSecureToken();
    const actionHash = hashToken(actionToken);
    const manageHash = hashToken(manageToken);

    // Call Supabase RPC create_booking_atomic
    // Pass the full overloaded parameters so Postgres can unambiguously select the function
    const rpcPayload = {
      p_ref: ref,
      p_tenant_id: tenant.id,
      p_service_id: primaryService ? primaryService.id : null,
      p_start_utc: normalizedStartUtc,
      p_end_utc: end_utc,
      p_block_end_utc: block_end_utc,
      p_status: "pending",
      p_customer_name: rawCustomerName.trim(),
      p_customer_email: rawCustomerEmail.trim(),
      p_customer_phone: normalizedPhone,
      p_notes: formattedNotes || null,
      p_price_nok: totalPriceNok,
      p_deposit_nok: 0,
      p_consent_at: now,
      p_privacy_version: "v1",
      p_action_token_hash: actionHash,
      p_manage_token_hash: manageHash,
      p_now: now,
      p_expires_at: expires_at,
      p_service_ids: resolvedServiceIds,
      p_service_summary: combinedServiceName,
      p_custom_fields: mergedCustomFields,
    };

    const { data: inserted, error: rpcErr } = await supabaseAdmin.rpc(
      "create_booking_atomic",
      rpcPayload
    );

    if (rpcErr) {
      console.error("Supabase RPC Error:", rpcErr);
      return NextResponse.json({
        error: "database_error",
        code: rpcErr.code,
        message: rpcErr.message,
        details: rpcErr.details,
      }, { status: 500, headers: CORS_HEADERS });
    }

    if (!inserted) {
      return NextResponse.json({ error: "slot_taken", message: "This time slot is no longer available. Please select another time." }, { status: 409, headers: CORS_HEADERS });
    }

    // Dispatch emails asynchronously
    const origin = getEngineBaseUrl(req);

    // Direct tokenized action URL for owner review/approval (no login barrier)
    const actionUrl = `${origin}/a/${ref}.${actionToken}`;
    const manageUrl = `${origin}/m/${ref}.${manageToken}`;

    const bookingDetails = {
      ref,
      customer_name: rawCustomerName.trim(),
      customer_email: rawCustomerEmail.trim(),
      customer_phone: normalizedPhone,
      service_name: combinedServiceName,
      price_nok: totalPriceNok,
      start_utc: normalizedStartUtc,
      end_utc,
      notes: formattedNotes || null,
    };

    Promise.allSettled([
      sendOwnerAlert(tenant, bookingDetails, actionUrl),
      sendCustomerReceipt(tenant, bookingDetails, manageUrl),
    ]).catch((err) => {
      console.error("Error sending booking notification emails:", err);
    });

    // Fetch newly created booking row to get actual id
    const { data: createdBooking } = await supabaseAdmin
      .from("bookings")
      .select("id, ref, status, start_utc, end_utc, customer_name, customer_email")
      .eq("ref", ref)
      .single();

    const bookingId = createdBooking?.id || (typeof inserted === "number" ? inserted : null);

    const bookingRecord = createdBooking || {
      id: bookingId,
      ref,
      status: "pending",
      start_utc: normalizedStartUtc,
      end_utc,
      customer_name: rawCustomerName.trim(),
      customer_email: rawCustomerEmail.trim(),
    };

    return NextResponse.json(
      {
        success: true,
        id: bookingId,
        ref,
        status: "pending",
        booking: bookingRecord,
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    console.error("Unexpected error in create booking route:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500, headers: CORS_HEADERS });
  }
}
