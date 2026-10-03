import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeAvailability } from "@/lib/availability";

export const dynamic = "force-dynamic"; // design-ok
export const revalidate = 0;

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

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86400000;

export async function GET(
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

    const { searchParams } = new URL(req.url);
    const serviceIdParam = searchParams.get("service_id");
    const dateParam = searchParams.get("date");
    let fromParam = searchParams.get("from");
    let toParam = searchParams.get("to");
    const isSingleDateQuery = Boolean(dateParam && (!searchParams.get("from") || !searchParams.get("to")));

    if (dateParam && (!fromParam || !toParam)) {
      if (!DATE_REGEX.test(dateParam)) {
        return NextResponse.json(
          { error: "invalid_date_format", message: "Date must be formatted as YYYY-MM-DD." },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      fromParam = dateParam;
      const d = new Date(`${dateParam}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      toParam = d.toISOString().split("T")[0];
    }

    if (!fromParam || !toParam) {
      return NextResponse.json(
        {
          error: "missing_query_parameters",
          message: "date (YYYY-MM-DD) OR from & to (YYYY-MM-DD) are required.",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!DATE_REGEX.test(fromParam) || !DATE_REGEX.test(toParam)) {
      return NextResponse.json(
        { error: "invalid_date_format", message: "Dates must be formatted as YYYY-MM-DD." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const fromDateMs = Date.parse(`${fromParam}T00:00:00Z`);
    const toDateMs = Date.parse(`${toParam}T00:00:00Z`);

    if (isNaN(fromDateMs) || isNaN(toDateMs) || toDateMs <= fromDateMs) {
      return NextResponse.json(
        { error: "invalid_date_range", message: "'to' date must be after 'from' date." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const diffDays = Math.ceil((toDateMs - fromDateMs) / MS_PER_DAY);
    if (diffDays > 35) {
      return NextResponse.json(
        { error: "range_too_large", message: "Maximum query window is 35 days." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "server_configuration_error", message: "Database client unavailable." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // 1. Fetch tenant
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", slug)
      .eq("active", true)
      .single();

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404, headers: CORS_HEADERS });
    }

    const nowUtc = Math.floor(Date.now() / 1000);
    const maxFutureEpoch = nowUtc + (tenant.max_days_ahead * 86400);
    const toUtcEpoch = Math.floor(toDateMs / 1000) + 86400;

    if (Math.floor(fromDateMs / 1000) > maxFutureEpoch) {
      return NextResponse.json(
        { error: "range_beyond_max_days", message: `Cannot book further than ${tenant.max_days_ahead} days ahead.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 2. Fetch service
    let service: { id: number; duration_min: number; buffer_min?: number | null } | null | undefined;
    const serviceId = Number(serviceIdParam);
    if (!isNaN(serviceId) && serviceId > 0) {
      const { data: specificService } = await supabaseAdmin
        .from("services")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("active", true)
        .eq("id", serviceId);
      if (specificService && specificService.length > 0) {
        service = specificService[0];
      }
    }

    if (!service) {
      const { data: defaultServices } = await supabaseAdmin
        .from("services")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("active", true)
        .order("sort", { ascending: true })
        .limit(1);
      service = defaultServices && defaultServices.length > 0 ? defaultServices[0] : null;
    }

    if (!service) {
      return NextResponse.json({ error: "service_not_found" }, { status: 404, headers: CORS_HEADERS });
    }

    // 3. Query hours, blackouts, and bookings
    const rangeStartUtc = Math.floor(fromDateMs / 1000) - 86400;
    const rangeEndUtc = toUtcEpoch + 86400;

    const [hoursRes, blackoutsRes, bookingsRes] = await Promise.all([
      supabaseAdmin
        .from("hours")
        .select("weekday, open_min, close_min")
        .eq("tenant_id", tenant.id),
      supabaseAdmin
        .from("blackouts")
        .select("start_utc, end_utc")
        .eq("tenant_id", tenant.id)
        .lt("start_utc", rangeEndUtc)
        .gt("end_utc", rangeStartUtc),
      supabaseAdmin
        .from("bookings")
        .select("start_utc, block_end_utc, status, expires_at")
        .eq("tenant_id", tenant.id)
        .lt("start_utc", rangeEndUtc)
        .gt("block_end_utc", rangeStartUtc),
    ]);

    if (hoursRes.error) {
      return NextResponse.json({ error: "database_error", details: hoursRes.error.message }, { status: 500, headers: CORS_HEADERS });
    }

    const blockingBookings = (bookingsRes.data || [])
      .filter((b) => {
        if (b.status === "confirmed") return true;
        if (b.status === "pending") {
          return !b.expires_at || b.expires_at > nowUtc;
        }
        return false;
      })
      .map((b) => ({
        start_utc: b.start_utc,
        block_end_utc: b.block_end_utc,
      }));

    const blackouts = (blackoutsRes.data || []).map((k) => ({
      start_utc: k.start_utc,
      end_utc: k.end_utc,
    }));

    const tenantTz = tenant.timezone || "Europe/Oslo";
    const dbHours = hoursRes.data || [];

    if (dbHours.length === 0) {
      if (isSingleDateQuery) {
        return NextResponse.json(
          { slots: [], iso_slots: [], date: dateParam, closed: true },
          { status: 200, headers: CORS_HEADERS }
        );
      }
      return NextResponse.json({ days: [], iso_slots: [] }, { status: 200, headers: CORS_HEADERS });
    }

    const queryRange = {
      fromUtc: Math.floor(fromDateMs / 1000),
      toUtc: toUtcEpoch,
    };

    const isoSlots = computeAvailability({
      tenant: {
        timezone: tenant.timezone,
        slot_step_min: tenant.slot_step_min,
        buffer_min: tenant.buffer_min,
        min_notice_min: tenant.min_notice_min,
      },
      service: {
        duration_min: service.duration_min,
        buffer_min: service.buffer_min,
      },
      hours: dbHours,
      blackouts,
      bookings: blockingBookings,
      range: queryRange,
      nowUtc,
    });

    const minLeadTimeUtc = nowUtc + (2 * 3600);
    const maxHorizonUtc = nowUtc + (35 * 86400);

    const validIsoSlots = isoSlots.filter((iso) => {
      const slotUtc = Math.floor(new Date(iso).getTime() / 1000);
      return slotUtc >= minLeadTimeUtc && slotUtc <= maxHorizonUtc;
    });

    const dateFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tenantTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const timeFmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tenantTz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

    // Group available slots by date
    const slotsByDate: Record<string, string[]> = {};
    for (const iso of validIsoSlots) {
      const dateKey = dateFmt.format(new Date(iso));
      const timeVal = timeFmt.format(new Date(iso));
      if (!slotsByDate[dateKey]) {
        slotsByDate[dateKey] = [];
      }
      if (!slotsByDate[dateKey].includes(timeVal)) {
        slotsByDate[dateKey].push(timeVal);
      }
    }

    // Sort times chronologically
    for (const d of Object.keys(slotsByDate)) {
      slotsByDate[d].sort((a, b) => a.localeCompare(b));
    }

    // Single Date Query: Return exact day payload
    if (isSingleDateQuery && dateParam) {
      const slotsForDay = slotsByDate[dateParam] || [];
      return NextResponse.json(
        {
          date: dateParam,
          slots: slotsForDay,
          iso_slots: validIsoSlots.filter((iso) => dateFmt.format(new Date(iso)) === dateParam),
          closed: slotsForDay.length === 0,
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Range Query: Return full days array map
    const daysArray: Array<{ date: string; slots: string[]; closed: boolean }> = [];
    const curDate = new Date(`${fromParam}T12:00:00Z`);
    const endDate = new Date(`${toParam}T12:00:00Z`);

    while (curDate < endDate) {
      const ymd = curDate.toISOString().split("T")[0];
      const slots = slotsByDate[ymd] || [];
      daysArray.push({
        date: ymd,
        slots,
        closed: slots.length === 0,
      });
      curDate.setUTCDate(curDate.getUTCDate() + 1);
    }

    return NextResponse.json(
      {
        days: daysArray,
        iso_slots: validIsoSlots,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    console.error("Unexpected error in availability route:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500, headers: CORS_HEADERS });
  }
}
