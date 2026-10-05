import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic"; // design-ok
export const revalidate = 0;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
};

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
    const tenantId = url.searchParams.get("tenant_id") || "gangina";

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
        .order("weekday", { ascending: true }),
      supabaseAdmin
        .from("tenants")
        .select("slot_step_min")
        .eq("id", tenantId)
        .maybeSingle(),
    ]);

    return NextResponse.json(
      {
        success: true,
        hours: hoursRes.data || [],
        slot_step_min: tenantRes.data?.slot_step_min || 30,
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
    const { tenant_id, hours, slot_step_min } = body;
    const targetTenantId = tenant_id || "gangina";
    const hoursList = Array.isArray(hours) ? hours : [];

    // 1. Update slot step if provided
    if (slot_step_min) {
      await supabaseAdmin
        .from("tenants")
        .update({ slot_step_min })
        .eq("id", targetTenantId);
    }

    const timeToMin = (val: unknown, fallback: number): number => {
      if (typeof val === "number" && !isNaN(val)) return val;
      if (typeof val === "string") {
        const parts = val.split(":").map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          return parts[0] * 60 + parts[1];
        }
      }
      return fallback;
    };

    const validRows: Array<{ tenant_id: string; weekday: number; open_min: number; close_min: number }> = [];

    for (const h of hoursList) {
      if (typeof h !== "object" || h === null || h.is_closed === true) continue;

      const weekday = Number(h.weekday);
      if (isNaN(weekday) || weekday < 0 || weekday > 6) continue;

      const openMin = timeToMin(h.open_min ?? h.open_time, 600);
      const closeMin = timeToMin(h.close_min ?? h.close_time, 1080);

      if (closeMin > openMin && openMin >= 0 && closeMin <= 1440) {
        validRows.push({
          tenant_id: targetTenantId,
          weekday,
          open_min: openMin,
          close_min: closeMin,
        });
      }
    }

    // 2. Clear previous entries for tenant
    await supabaseAdmin
      .from("hours")
      .delete()
      .eq("tenant_id", targetTenantId);

    // 3. Upsert deduplicated rows with onConflict protection
    if (validRows.length > 0) {
      const uniqueMap = new Map<string, typeof validRows[0]>();
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

    return NextResponse.json(
      {
        success: true,
        hours: validRows,
        slot_step_min: slot_step_min || 30,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    console.error("POST hours error:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500, headers: CORS_HEADERS });
  }
}
