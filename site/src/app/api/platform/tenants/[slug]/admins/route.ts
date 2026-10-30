import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPlatformRequest, authError, isEmail, normalizeEmail } from "@/lib/platformAuth";
import { logAdminEvent } from "@/lib/audit";

export const dynamic = "force-dynamic"; // design-ok

const ROLES = new Set(["owner", "admin"]);

/** GET /api/platform/tenants/[slug]/admins */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const auth = await verifyPlatformRequest(req);
    if (!auth.authenticated) {
      const { error, status } = authError(auth);
      return NextResponse.json({ error }, { status });
    }

    const { slug } = await params;
    const tenantId = (slug || "").trim().toLowerCase();

    const { data, error } = await supabaseAdmin
      .from("tenant_admins")
      .select("email, role, active, created_at")
      .eq("tenant_id", tenantId)
      .order("email", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, tenant_id: tenantId, admins: data || [] });
  } catch (err: unknown) {
    console.error("GET platform admins error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** PUT /api/platform/tenants/[slug]/admins — replace the operator list. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const auth = await verifyPlatformRequest(req);
    if (!auth.authenticated || !auth.email) {
      const { error, status } = authError(auth);
      return NextResponse.json({ error }, { status });
    }

    const { slug } = await params;
    const tenantId = (slug || "").trim().toLowerCase();

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, owner_email")
      .eq("id", tenantId)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const input: unknown[] = Array.isArray(body.admins) ? body.admins : [];
    if (input.length > 20) {
      return NextResponse.json({ error: "too_many_admins" }, { status: 400 });
    }

    const byEmail = new Map<string, { tenant_id: string; email: string; role: string; active: boolean }>();

    for (const raw of input) {
      const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const email = normalizeEmail(row.email);
      if (!isEmail(email)) {
        return NextResponse.json({ error: "invalid_email", email: row.email }, { status: 400 });
      }
      const role = String(row.role || "admin").toLowerCase();
      if (!ROLES.has(role)) {
        return NextResponse.json({ error: "invalid_role" }, { status: 400 });
      }
      byEmail.set(email, {
        tenant_id: tenantId,
        email,
        role,
        active: row.active === undefined ? true : Boolean(row.active),
      });
    }

    const owner = tenant.owner_email.toLowerCase().trim();
    if (owner && isEmail(owner)) {
      byEmail.set(owner, { tenant_id: tenantId, email: owner, role: "owner", active: true });
    }

    if (byEmail.size === 0) {
      return NextResponse.json({ error: "no_admins" }, { status: 400 });
    }

    const emails = [...byEmail.keys()];
    const { data: existingRows } = await supabaseAdmin
      .from("tenant_admins")
      .select("email")
      .eq("tenant_id", tenantId);

    const stale = (existingRows || [])
      .map((row) => row.email)
      .filter((email) => !byEmail.has(email));

    if (stale.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("tenant_admins")
        .delete()
        .eq("tenant_id", tenantId)
        .in("email", stale);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }

    const { error: upsertError } = await supabaseAdmin
      .from("tenant_admins")
      .upsert([...byEmail.values()], { onConflict: "tenant_id,email" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    await logAdminEvent({
      actor: auth.email,
      tenantId,
      action: "admins.update",
      detail: { admins: emails },
    });

    const { data } = await supabaseAdmin
      .from("tenant_admins")
      .select("email, role, active, created_at")
      .eq("tenant_id", tenantId)
      .order("email", { ascending: true });

    return NextResponse.json({ success: true, tenant_id: tenantId, admins: data || [] });
  } catch (err: unknown) {
    console.error("PUT platform admins error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
