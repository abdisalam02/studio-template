import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPlatformRequest, authError } from "@/lib/platformAuth";

export const dynamic = "force-dynamic"; // design-ok

/** GET /api/platform/audit — cross-tenant audit trail. */
export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const auth = await verifyPlatformRequest(req);
    if (!auth.authenticated) {
      const { error, status } = authError(auth);
      return NextResponse.json({ error }, { status });
    }

    const params = req.nextUrl.searchParams;
    const tenantId = (params.get("tenant_id") || "").trim().toLowerCase();
    const action = (params.get("action") || "").trim();
    const limitRaw = Number(params.get("limit") || 100);
    const limit = Math.min(500, Math.max(1, Number.isFinite(limitRaw) ? Math.round(limitRaw) : 100));

    let query = supabaseAdmin
      .from("admin_events")
      .select("id, actor_email, tenant_id, action, booking_ref, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tenantId) query = query.eq("tenant_id", tenantId);
    if (action) query = query.eq("action", action);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    const tenantIds = [...new Set((data || []).map((row) => row.tenant_id))];
    const names = new Map<string, string>();
    if (tenantIds.length > 0) {
      const { data: tenants } = await supabaseAdmin
        .from("tenants")
        .select("id, name")
        .in("id", tenantIds);
      for (const tenant of tenants || []) names.set(tenant.id, tenant.name);
    }

    return NextResponse.json({
      success: true,
      events: (data || []).map((row) => ({
        ...row,
        tenant_name: names.get(row.tenant_id) || row.tenant_id,
      })),
    });
  } catch (err: unknown) {
    console.error("GET platform audit error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
