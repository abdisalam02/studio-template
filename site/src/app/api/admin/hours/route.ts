import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";

export const dynamic = "force-dynamic"; // design-ok
export const revalidate = 0;

// CORS is owned by middleware so credential handling stays consistent.
const CORS_HEADERS: Record<string, string> = {};

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
type DayName = (typeof DAY_NAMES)[number];

type ShiftRow = { tenant_id: string; weekday: number; open_min: number; close_min: number };
type ShiftConfig = {
  open?: boolean;
  is_closed?: boolean;
  start?: string;
  end?: string;
  open_time?: string;
  close_time?: string;
};

function minutesToHhmm(value: number): string {
  const total = Math.max(0, Math.min(1440, Math.round(value)));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Accepts "HH:mm", "H:mm" or raw minutes. Returns null when unparseable. */
function parseHhmm(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Collapses the persisted rows into the day-map the admin portal renders.
 * A weekday may hold several intervals; the portal's simpler model shows the
 * earliest open and the latest close for that day.
 */
function shiftsFromRows(rows: ShiftRow[]): Record<DayName, { open: boolean; start: string; end: string }> {
  const map = {} as Record<DayName, { open: boolean; start: string; end: string }>;
  for (const day of DAY_NAMES) map[day] = { open: false, start: "09:00", end: "17:00" };

  for (const row of rows) {
    const day = DAY_NAMES[row.weekday];
    if (!day) continue;
    const current = map[day];
    if (!current.open) {
      map[day] = {
        open: true,
        start: minutesToHhmm(row.open_min),
        end: minutesToHhmm(row.close_min),
      };
      continue;
    }
    const start = Math.min(parseHhmm(current.start) ?? row.open_min, row.open_min);
    const end = Math.max(parseHhmm(current.end) ?? row.close_min, row.close_min);
    map[day] = { open: true, start: minutesToHhmm(start), end: minutesToHhmm(end) };
  }

  return map;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = isDev && req.nextUrl.searchParams.get("dev_bypass") === "true";

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "unauthorized", message: "Authentication required." },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id") || auth.tenantId || "";
    if (!tenantId) {
      return NextResponse.json({ error: "tenant_required" }, { status: 400, headers: CORS_HEADERS });
    }

    if (!allowBypass && !(await isTenantAdmin(auth.email, tenantId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403, headers: CORS_HEADERS });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "server_error", message: "Database unavailable." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const [hoursRes, tenantRes] = await Promise.all([
      supabaseAdmin
        .from("hours")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("weekday", { ascending: true })
        .order("open_min", { ascending: true }),
      supabaseAdmin
        .from("tenants")
        .select("slot_step_min, profile")
        .eq("id", tenantId)
        .maybeSingle(),
    ]);

    if (hoursRes.error) {
      return NextResponse.json(
        { error: "database_error", message: hoursRes.error.message },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const rows = (hoursRes.data || []) as ShiftRow[];
    const interval = tenantRes.data?.slot_step_min ?? 30;

    return NextResponse.json(
      {
        success: true,
        hours: rows,
        // Contract used by the admin portal (shifts[day] = { open, start, end }).
        shifts: shiftsFromRows(rows),
        date_overrides: (tenantRes.data?.profile as Record<string, any>)?.date_overrides || {},
        slot_step_min: interval,
        interval_min: interval,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("GET hours error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "server_error", message: "Database unavailable." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = Boolean(isDev && req.nextUrl.searchParams.get("dev_bypass") === "true");

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "unauthorized", message: "Authentication required." },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { tenant_id, hours, shifts, slot_step_min, interval_min, date_overrides } = body;
    const targetTenantId = tenant_id || auth.tenantId || "";
    if (!targetTenantId) {
      return NextResponse.json({ error: "tenant_required" }, { status: 400, headers: CORS_HEADERS });
    }

    if (!allowBypass && !(await isTenantAdmin(auth.email, targetTenantId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403, headers: CORS_HEADERS });
    }

    const requestedStep = slot_step_min ?? interval_min;
    let step: number | null = null;
    if (requestedStep !== undefined && requestedStep !== null && requestedStep !== "") {
      const parsed = Number(requestedStep);
      if (!Number.isFinite(parsed)) {
        return NextResponse.json(
          { error: "invalid_interval", message: "interval_min must be a number." },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      step = Math.max(1, Math.min(240, Math.round(parsed)));
    }

    const hasHoursArray = Array.isArray(hours);
    const hasShiftsObject = Boolean(shifts) && typeof shifts === "object" && !Array.isArray(shifts);

    // Validate the shape BEFORE touching the table. An unrecognised payload
    // must never delete every opening hour (the old behaviour did exactly that
    // when the portal sent `shifts` instead of `hours`).
    if (!hasHoursArray && !hasShiftsObject) {
      return NextResponse.json(
        {
          error: "missing_hours",
          message: "Provide `shifts` (day map) or `hours` (array).",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const validRows: ShiftRow[] = [];

    if (hasShiftsObject) {
      // Admin portal shape: { Monday: { open, start, end }, ... }
      for (const [day, value] of Object.entries(shifts as Record<string, ShiftConfig>)) {
        const weekday = DAY_NAMES.indexOf(day as DayName);
        if (weekday < 0 || !value || typeof value !== "object") continue;
        if (value.open === false || value.is_closed === true) continue;

        const openMin = parseHhmm(value.start ?? value.open_time);
        const closeMin = parseHhmm(value.end ?? value.close_time);
        if (openMin === null || closeMin === null) continue;

        if (closeMin > openMin && openMin >= 0 && closeMin <= 1440) {
          validRows.push({
            tenant_id: targetTenantId,
            weekday,
            open_min: openMin,
            close_min: closeMin,
          });
        }
      }
    } else {
      for (const h of hours as Array<Record<string, unknown>>) {
        if (typeof h !== "object" || h === null || h.is_closed === true) continue;

        const weekday = Number(h.weekday);
        if (isNaN(weekday) || weekday < 0 || weekday > 6) continue;

        const openMin = parseHhmm(h.open_min ?? h.open_time) ?? 600;
        const closeMin = parseHhmm(h.close_min ?? h.close_time) ?? 1080;

        if (closeMin > openMin && openMin >= 0 && closeMin <= 1440) {
          validRows.push({
            tenant_id: targetTenantId,
            weekday,
            open_min: openMin,
            close_min: closeMin,
          });
        }
      }
    }

    // 1. Clear previous entries for the tenant (all-closed is a valid state).
    const { error: deleteErr } = await supabaseAdmin
      .from("hours")
      .delete()
      .eq("tenant_id", targetTenantId);

    if (deleteErr) {
      return NextResponse.json(
        { error: "database_error", message: deleteErr.message },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // 2. Upsert deduplicated rows with onConflict protection.
    if (validRows.length > 0) {
      const uniqueMap = new Map<string, ShiftRow>();
      validRows.forEach((r) => uniqueMap.set(`${r.weekday}_${r.open_min}`, r));
      const deduplicatedRows = Array.from(uniqueMap.values());

      const { error: insErr } = await supabaseAdmin
        .from("hours")
        .upsert(deduplicatedRows, { onConflict: "tenant_id,weekday,open_min" });

      if (insErr) {
        console.error("Upsert hours error:", insErr.message);
        return NextResponse.json(
          { error: "database_error", message: `Failed to save hours: ${insErr.message}` },
          { status: 500, headers: CORS_HEADERS }
        );
      }
    }

    // 3. Persist the slot interval (portal sends `interval_min`).
    if (step !== null) {
      const { error: stepErr } = await supabaseAdmin
        .from("tenants")
        .update({ slot_step_min: step })
        .eq("id", targetTenantId);
      if (stepErr) {
        return NextResponse.json(
          { error: "database_error", message: stepErr.message },
          { status: 500, headers: CORS_HEADERS }
        );
      }
    }

    // 4. Persist date_overrides into tenant profile if provided
    if (date_overrides !== undefined) {
      const { data: curTenant } = await supabaseAdmin
        .from("tenants")
        .select("profile")
        .eq("id", targetTenantId)
        .maybeSingle();
      const currentProfile = (curTenant?.profile as Record<string, any>) || {};
      const updatedProfile = { ...currentProfile, date_overrides };
      await supabaseAdmin
        .from("tenants")
        .update({ profile: updatedProfile })
        .eq("id", targetTenantId);
    }

    const [persistedHours, persistedTenant] = await Promise.all([
      supabaseAdmin
        .from("hours")
        .select("*")
        .eq("tenant_id", targetTenantId)
        .order("weekday", { ascending: true })
        .order("open_min", { ascending: true }),
      supabaseAdmin
        .from("tenants")
        .select("slot_step_min, profile")
        .eq("id", targetTenantId)
        .maybeSingle(),
    ]);

    const persistedRows = (persistedHours.data || []) as ShiftRow[];
    const interval = persistedTenant.data?.slot_step_min ?? step ?? 30;

    return NextResponse.json(
      {
        success: true,
        hours: persistedRows,
        shifts: shiftsFromRows(persistedRows),
        date_overrides: (persistedTenant.data?.profile as Record<string, any>)?.date_overrides || date_overrides || {},
        slot_step_min: interval,
        interval_min: interval,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    console.error("POST hours error:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500, headers: CORS_HEADERS });
  }
}
