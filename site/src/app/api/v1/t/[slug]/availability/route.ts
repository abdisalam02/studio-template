import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeAvailability } from "@/lib/availability";

export const dynamic = "force-dynamic";
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

    // Support flexible date queries: if 'date' is passed, calculate from and to for that day
    if (dateParam && (!fromParam || !toParam)) {
      if (!DATE_REGEX.test(dateParam)) {
        return NextResponse.json(
          { error: "invalid_date_format", message: "Date must be formatted as YYYY-MM-DD." },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      fromParam = dateParam;
      // To date is next day for range computation
      const d = new Date(`${dateParam}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      toParam = d.toISOString().split("T")[0];
    }

    // 1. Validate required query parameters
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
    if (diffDays > 30) {
      return NextResponse.json(
        { error: "range_too_large", message: "Maximum query window is 30 days." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "server_configuration_error", message: "Database client unavailable." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // 2. Fetch tenant by slug
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", slug)
      .eq("active", true)
      .single();

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404, headers: CORS_HEADERS });
    }

    // Check max_days_ahead restriction
    const nowUtc = Math.floor(Date.now() / 1000);
    const maxFutureEpoch = nowUtc + (tenant.max_days_ahead * 86400);
    const toUtcEpoch = Math.floor(toDateMs / 1000) + 86400; // end of the 'to' day

    if (Math.floor(fromDateMs / 1000) > maxFutureEpoch) {
      return NextResponse.json(
        { error: "range_beyond_max_days", message: `Cannot book further than ${tenant.max_days_ahead} days ahead.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 3. Fetch service (default to first active service if service_id not supplied or not found)
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

    // 4. Query hours, blackouts, and bookings
    const rangeStartUtc = Math.floor(fromDateMs / 1000) - 86400; // 1-day safety margin for timezone diff
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
      console.error("Error fetching hours:", hoursRes.error);
      return NextResponse.json({ error: "database_error", details: hoursRes.error.message }, { status: 500, headers: CORS_HEADERS });
    }

    // Filter blocking bookings: confirmed OR (pending and not expired)
    const blockingBookings = (bookingsRes.data || [])
      .filter((b) => {
        if (b.status === "confirmed") return true;
        if (b.status === "pending") {
          // If no expires_at timestamp is set, treat pending as active hold; otherwise check hold has not expired
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

    // 5. Query range & Weekday calculation
    const queryRange = {
      fromUtc: Math.floor(fromDateMs / 1000),
      toUtc: toUtcEpoch,
    };

    // Convert JS getDay() (Sun=0, Mon=1...Sat=6) to European index (Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6)
    const targetDateObj = new Date(`${fromParam}T12:00:00Z`);
    const jsDay = targetDateObj.getDay();
    const europeanWeekday = jsDay === 0 ? 6 : jsDay - 1;

    // Check if tenant has any configured hours records in database
    const dbHours = hoursRes.data || [];
    if (dbHours.length === 0) {
      return NextResponse.json(
        { slots: [], iso_slots: [], date: dateParam || fromParam, closed: true },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Only allow slot generation if a row explicitly exists matching the requested weekday AND open_min < close_min
    const matchedShift = dbHours.find(
      (h) => h.weekday === europeanWeekday && typeof h.open_min === "number" && typeof h.close_min === "number" && h.open_min < h.close_min
    );

    if (!matchedShift) {
      return NextResponse.json(
        { slots: [], iso_slots: [], date: dateParam || fromParam, closed: true },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const effectiveHours = [matchedShift];

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
      hours: effectiveHours,
      blackouts,
      bookings: blockingBookings,
      range: queryRange,
      nowUtc,
    });

    // Format simple "HH:MM" times in Europe/Oslo timezone for convenience
    const timeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: tenant.timezone || "Europe/Oslo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

    const timeSlots = Array.from(new Set(isoSlots.map((iso) => timeFormatter.format(new Date(iso)))));

    return NextResponse.json(
      {
        slots: timeSlots,
        iso_slots: isoSlots,
        date: dateParam || fromParam,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    console.error("Unexpected error in availability route:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500, headers: CORS_HEADERS });
  }
}
