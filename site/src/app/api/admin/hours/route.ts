import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id") || "gangina";

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_error", message: "Database utilgjengelig." }, { status: 500 });
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

    let finalHours = hoursRes.data || [];
    if (finalHours.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opHoursRes = await (supabaseAdmin as any)
        .from("operating_hours")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("weekday", { ascending: true });
      if (opHoursRes.data && opHoursRes.data.length > 0) {
        finalHours = opHoursRes.data;
      }
    }

    return NextResponse.json({
      success: true,
      hours: finalHours,
      slot_step_min: tenantRes.data?.slot_step_min || 15,
    });
  } catch (err) {
    console.error("GET hours error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_error", message: "Database utilgjengelig." }, { status: 500 });
    }

    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = Boolean(
      isDev && req.nextUrl.searchParams.get("dev_bypass") === "true"
    );

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "unauthorized", message: "Mangler innlogging." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { tenant_id, hours, slot_step_min } = body;
    const targetTenantId = tenant_id || "gangina";
    const hoursList = Array.isArray(hours) ? hours : [];

    if (!targetTenantId) {
      return NextResponse.json({ error: "invalid_payload", message: "tenant_id er påkrevd." }, { status: 400 });
    }

    // 1. Update slot_step_min in tenants
    if (slot_step_min) {
      const { error: tenantUpdateErr } = await supabaseAdmin
        .from("tenants")
        .update({ slot_step_min })
        .eq("id", targetTenantId);
      if (tenantUpdateErr) {
        console.warn("Tenant slot_step_min update note:", tenantUpdateErr.message);
      }
    }

    const rows = hoursList.map((h: { weekday: number; open_min: number; close_min: number }) => ({
      tenant_id: targetTenantId,
      weekday: h.weekday,
      open_min: h.open_min,
      close_min: h.close_min,
    }));

    // 2. Replace hours in primary 'hours' table with strict error check
    const { error: delErr } = await supabaseAdmin
      .from("hours")
      .delete()
      .eq("tenant_id", targetTenantId);

    if (delErr) {
      console.error("Error deleting old hours from hours table:", delErr);
      // If table doesn't exist, try operating_hours
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: opDelErr } = await (supabaseAdmin as any)
        .from("operating_hours")
        .delete()
        .eq("tenant_id", targetTenantId);
      if (opDelErr) {
        return NextResponse.json(
          { error: "database_error", message: `Kunne ikke slette gamle åpningstider: ${opDelErr.message}` },
          { status: 500 }
        );
      }
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from("hours")
        .insert(rows);

      if (insErr) {
        console.error("Error inserting into hours table:", insErr);
        // Fallback to operating_hours table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: opInsErr } = await (supabaseAdmin as any)
          .from("operating_hours")
          .insert(rows);
        if (opInsErr) {
          return NextResponse.json(
            { error: "database_error", message: `Kunne ikke lagre nye åpningstider: ${opInsErr.message}` },
            { status: 500 }
          );
        }
      } else {
        // Also sync to operating_hours if table exists (graceful non-blocking)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyAdmin = supabaseAdmin as any;
        await anyAdmin.from("operating_hours").delete().eq("tenant_id", targetTenantId).catch(() => {});
        await anyAdmin.from("operating_hours").insert(rows).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      hours: rows,
      slot_step_min: slot_step_min || 15,
    });
  } catch (err: unknown) {
    console.error("POST hours error:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
