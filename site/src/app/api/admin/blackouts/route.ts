import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";

export const dynamic = "force-dynamic"; // design-ok

function isDevBypass(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  return (
    req.nextUrl.searchParams.get("dev_bypass") === "true" ||
    Boolean(token && token.startsWith("dev-bypass-"))
  );
}

/** Lists the tenant's blackout windows (admin portal "Active Blackouts" tab). */
export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const allowBypass = isDevBypass(req);
    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json(
        { error: "unauthorized", message: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const tenantId = String(req.nextUrl.searchParams.get("tenant_id") || auth.tenantId || "").trim();
    if (!tenantId) {
      return NextResponse.json({ error: "tenant_required" }, { status: 400 });
    }

    if (!allowBypass && !(await isTenantAdmin(auth.email, tenantId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("blackouts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("start_utc", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "database_error", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, blackouts: data || [] });
  } catch (err: unknown) {
    console.error("Error reading blackouts:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const isDev = process.env.NODE_ENV === "development";
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";
    const allowBypass = Boolean(
      isDev && (
        req.nextUrl.searchParams.get("dev_bypass") === "true" ||
        (token && token.startsWith("dev-bypass-"))
      )
    );

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: "unauthorized", message: "Invalid or expired session." }, { status: 401 });
    }
    const userEmail = auth.email;
    const body = await req.json();
    const { start_utc, end_utc, reason } = body;

    if (typeof start_utc !== "number" || typeof end_utc !== "number" || end_utc <= start_utc) {
      return NextResponse.json(
        { error: "invalid_payload", message: "start_utc and end_utc must be valid timestamps (end_utc > start_utc)." },
        { status: 400 }
      );
    }

    const tenantId = String(body.tenant_id || auth.tenantId || "");
    if (!tenantId) {
      return NextResponse.json({ error: "tenant_required" }, { status: 400 });
    }

    if (!allowBypass && !(await isTenantAdmin(userEmail, tenantId))) {
      return NextResponse.json(
        { error: "forbidden", message: "No studio is linked to this email." },
        { status: 403 }
      );
    }

    const { data: blackout, error: insertErr } = await supabaseAdmin
      .from("blackouts")
      .insert({
        tenant_id: tenantId,
        start_utc,
        end_utc,
        reason: reason ? String(reason).trim() : null,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: "database_error", details: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, blackout }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating blackout:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const isDev = process.env.NODE_ENV === "development";
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";
    const allowBypass = Boolean(
      isDev && (
        req.nextUrl.searchParams.get("dev_bypass") === "true" ||
        (token && token.startsWith("dev-bypass-"))
      )
    );

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: "unauthorized", message: "Invalid or expired session." }, { status: 401 });
    }
    const userEmail = auth.email;
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ error: "missing_id", message: "id is required." }, { status: 400 });
    }

    const blackoutId = Number(idParam);
    const { data: blackout, error: fetchErr } = await supabaseAdmin
      .from("blackouts")
      .select("id, tenant_id")
      .eq("id", blackoutId)
      .single();

    if (fetchErr || !blackout) {
      return NextResponse.json({ error: "blackout_not_found" }, { status: 404 });
    }

    if (!allowBypass && !(await isTenantAdmin(userEmail, blackout.tenant_id))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { error: deleteErr } = await supabaseAdmin
      .from("blackouts")
      .delete()
      .eq("id", blackoutId);

    if (deleteErr) {
      return NextResponse.json({ error: "database_error", details: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("Error deleting blackout:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
