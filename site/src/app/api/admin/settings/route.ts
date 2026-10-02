import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic"; // design-ok

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id") || "gangina";

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    return NextResponse.json({ success: true, tenant });
  } catch (err) {
    console.error("GET settings error:", err);
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
    const { tenant_id, name, owner_email, buffer_min } = body;

    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = Boolean(
      isDev && (
        body?.dev_bypass === true ||
        req.nextUrl.searchParams.get("dev_bypass") === "true" ||
        (token && token.startsWith("dev-bypass-"))
      )
    );

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const updateData: {
      name?: string;
      owner_email?: string;
      buffer_min?: number;
      min_notice_min?: number;
      max_days_ahead?: number;
    } = {};
    if (name) updateData.name = name;
    if (owner_email) updateData.owner_email = owner_email;
    if (buffer_min != null) updateData.buffer_min = buffer_min;
    if (body.min_notice_min != null) updateData.min_notice_min = body.min_notice_min;
    if (body.max_days_ahead != null) updateData.max_days_ahead = body.max_days_ahead;

    const targetTenantId = tenant_id || "gangina";
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .update(updateData)
      .eq("id", targetTenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tenant });
  } catch (err) {
    console.error("POST settings error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
