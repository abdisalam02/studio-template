import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";

export const dynamic = "force-dynamic";

/** Read-only audit trail for the admin portal. */
export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = isDev && req.nextUrl.searchParams.get("dev_bypass") === "true";

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const tenantId = req.nextUrl.searchParams.get("tenant_id") || auth.tenantId || "";
    if (!tenantId || !(await isTenantAdmin(auth.email, tenantId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("admin_events")
      .select("id, actor_email, action, booking_ref, detail, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, events: data || [] });
  } catch (err: unknown) {
    console.error("Audit read error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
