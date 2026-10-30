import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isPlatformAdmin } from "@/lib/platformAuth";

export const dynamic = "force-dynamic"; // design-ok

const TENANT_FIELDS =
  "id, name, active, ref_prefix, contact_email, logo_url, branding, timezone, currency";

/**
 * Tenants the signed-in operator may switch into.
 *
 * Platform super-admins receive every tenant. Tenant operators receive the
 * tenants from `tenant_admins` (plus any tenant they own). Used by the admin
 * header switcher and the platform matrix.
 */
export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const auth = await verifyAdminRequest(req);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const email = auth.email.toLowerCase().trim();
    const platformAdmin = await isPlatformAdmin(email);

    if (platformAdmin) {
      const { data, error } = await supabaseAdmin
        .from("tenants")
        .select(TENANT_FIELDS)
        .order("name", { ascending: true });

      if (error) {
        return NextResponse.json({ error: "database_error" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        is_platform_admin: true,
        tenants: (data || []).map((tenant) => ({ ...tenant, role: "super_admin" })),
      });
    }

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("tenant_admins")
      .select("tenant_id, role")
      .eq("email", email)
      .eq("active", true);

    if (membershipError) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    const roles = new Map<string, string>();
    for (const row of memberships || []) roles.set(row.tenant_id, row.role);

    const { data: owned } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("owner_email", email);

    for (const row of owned || []) {
      if (!roles.has(row.id)) roles.set(row.id, "owner");
    }

    const ids = [...roles.keys()];
    if (ids.length === 0) {
      return NextResponse.json({
        success: true,
        is_platform_admin: false,
        tenants: [],
      });
    }

    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select(TENANT_FIELDS)
      .in("id", ids)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      is_platform_admin: false,
      tenants: (data || []).map((tenant) => ({
        ...tenant,
        role: roles.get(tenant.id) || "admin",
      })),
    });
  } catch (err: unknown) {
    console.error("GET admin tenants error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
