import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id") || "gangina";

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
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
        .single(),
    ]);

    return NextResponse.json({
      success: true,
      hours: hoursRes.data || [],
      slot_step_min: tenantRes.data?.slot_step_min || 15,
    });
  } catch (err) {
    console.error("GET hours error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { tenant_id, hours, slot_step_min } = body;

    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = isDev && (
      body?.dev_bypass === true ||
      req.nextUrl.searchParams.get("dev_bypass") === "true" ||
      (token && token.startsWith("dev-bypass-"))
    );

    if (!allowBypass && !authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const targetTenantId = tenant_id || "gangina";
    const hoursList = Array.isArray(hours) ? hours : [];

    if (!targetTenantId) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // 1. Update slot_step_min in tenants
    if (slot_step_min) {
      await supabaseAdmin
        .from("tenants")
        .update({ slot_step_min })
        .eq("id", targetTenantId);
    }

    // 2. Replace hours
    await supabaseAdmin
      .from("hours")
      .delete()
      .eq("tenant_id", targetTenantId);

    if (hoursList.length > 0) {
      const rows = hoursList.map((h: { weekday: number; open_min: number; close_min: number }) => ({
        tenant_id: targetTenantId,
        weekday: h.weekday,
        open_min: h.open_min,
        close_min: h.close_min,
      }));

      await supabaseAdmin
        .from("hours")
        .insert(rows);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST hours error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
