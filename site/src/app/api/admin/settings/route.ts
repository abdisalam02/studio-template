import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic"; // design-ok

type TenantUpdate = Database["public"]["Tables"]["tenants"]["Update"];

const STRING_FIELDS = [
  "name",
  "contact_email",
  "phone",
  "whatsapp",
  "address",
  "org_number",
  "mva_status",
  "hours_text",
  "timezone",
  "currency",
] as const;

const NUMBER_FIELDS = [
  "buffer_min",
  "min_notice_min",
  "max_days_ahead",
  "pending_hold_min",
] as const;

function resolveTenantId(req: NextRequest, authTenantId: string | null | undefined, body?: Record<string, unknown>) {
  const fromQuery = req.nextUrl.searchParams.get("tenant_id");
  const fromBody = typeof body?.tenant_id === "string" ? body.tenant_id : "";
  return (fromQuery || fromBody || authTenantId || "").trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = isDev && req.nextUrl.searchParams.get("dev_bypass") === "true";

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "unauthorized", message: "Missing or invalid login." },
        { status: 401 }
      );
    }

    const tenantId = resolveTenantId(req, auth.tenantId);
    if (!tenantId) {
      return NextResponse.json({ error: "tenant_required" }, { status: 400 });
    }
    if (!allowBypass && !(await isTenantAdmin(auth.email, tenantId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, tenant });
  } catch (err) {
    console.error("GET settings error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = Boolean(
      isDev &&
        (body?.dev_bypass === true ||
          req.nextUrl.searchParams.get("dev_bypass") === "true")
    );

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const targetTenantId = resolveTenantId(req, auth.tenantId, body);
    if (!targetTenantId) {
      return NextResponse.json({ error: "tenant_required" }, { status: 400 });
    }
    if (!allowBypass && !(await isTenantAdmin(auth.email, targetTenantId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const updateData: TenantUpdate = { updated_at: new Date().toISOString() };

    for (const field of STRING_FIELDS) {
      if (!(field in body)) continue;
      const raw = body[field];
      const value = typeof raw === "string" ? raw.trim() : "";
      if (field === "name" || field === "currency" || field === "timezone") {
        if (value) updateData[field] = field === "currency" ? value.toUpperCase() : value;
      } else {
        updateData[field] = value || null;
      }
    }

    for (const field of NUMBER_FIELDS) {
      if (!(field in body) || body[field] == null) continue;
      const value = Number(body[field]);
      if (Number.isFinite(value)) updateData[field] = Math.max(0, Math.round(value));
    }

    // Legacy admin clients send `email`; new clients send owner_email.
    const ownerEmailRaw =
      typeof body.owner_email === "string"
        ? body.owner_email
        : typeof body.email === "string"
          ? body.email
          : "";
    const ownerEmail = ownerEmailRaw.toLowerCase().trim();
    if (ownerEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
        return NextResponse.json({ error: "invalid_owner_email" }, { status: 400 });
      }
      updateData.owner_email = ownerEmail;
    }

    if (Object.keys(updateData).length <= 1) {
      return NextResponse.json({ error: "no_fields" }, { status: 400 });
    }

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .update(updateData)
      .eq("id", targetTenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (ownerEmail) {
      await supabaseAdmin.from("tenant_admins").upsert(
        {
          tenant_id: targetTenantId,
          email: ownerEmail,
          role: "owner",
          active: true,
        },
        { onConflict: "tenant_id,email" }
      );
    }

    return NextResponse.json({ success: true, tenant });
  } catch (err) {
    console.error("POST settings error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
