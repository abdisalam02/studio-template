import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPlatformRequest, authError, isEmail, normalizeEmail, slugify } from "@/lib/platformAuth";
import { logAdminEvent } from "@/lib/audit";

export const dynamic = "force-dynamic"; // design-ok

/**
 * GET  /api/platform/tenants  — full tenant matrix for the control center.
 * POST /api/platform/tenants  — provision a tenant through `provision_tenant`.
 */
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

    const [tenants, services, admins, domains, hours] = await Promise.all([
      supabaseAdmin.from("tenants").select("*").order("name", { ascending: true }),
      supabaseAdmin.from("services").select("tenant_id, active"),
      supabaseAdmin.from("tenant_admins").select("tenant_id, active"),
      supabaseAdmin.from("tenant_domains").select("tenant_id, domain"),
      supabaseAdmin.from("hours").select("tenant_id"),
    ]);

    if (tenants.error) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    function countBy<T extends { tenant_id: string }>(
      rows: T[] | null,
      predicate?: (row: T) => boolean
    ) {
      const map = new Map<string, number>();
      for (const row of rows || []) {
        if (predicate && !predicate(row)) continue;
        map.set(row.tenant_id, (map.get(row.tenant_id) || 0) + 1);
      }
      return map;
    }

    const serviceCount = countBy(services.data, (row: { active: boolean }) => row.active);
    const adminCount = countBy(admins.data, (row: { active: boolean }) => row.active);
    const domainCount = countBy(domains.data);
    const hoursCount = countBy(hours.data);
    const domainsByTenant = new Map<string, string[]>();
    for (const row of domains.data || []) {
      const list = domainsByTenant.get(row.tenant_id) || [];
      list.push(row.domain);
      domainsByTenant.set(row.tenant_id, list);
    }

    return NextResponse.json({
      success: true,
      tenants: (tenants.data || []).map((tenant) => ({
        ...tenant,
        service_count: serviceCount.get(tenant.id) || 0,
        admin_count: adminCount.get(tenant.id) || 0,
        domain_count: domainCount.get(tenant.id) || 0,
        hours_count: hoursCount.get(tenant.id) || 0,
        domains: domainsByTenant.get(tenant.id) || [],
      })),
    });
  } catch (err: unknown) {
    console.error("GET platform tenants error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const auth = await verifyPlatformRequest(req);
    if (!auth.authenticated || !auth.email) {
      const { error, status } = authError(auth);
      return NextResponse.json({ error }, { status });
    }

    const body = await req.json().catch(() => ({}));
    const id = slugify(body.id ?? body.slug ?? body.name);
    const name = String(body.name || "").trim();
    const ownerEmail = normalizeEmail(body.owner_email ?? body.ownerEmail);
    const contactEmail = normalizeEmail(body.contact_email ?? body.contactEmail) || ownerEmail;

    if (!/^[a-z0-9][a-z0-9-]{1,47}$/.test(id)) {
      return NextResponse.json(
        { error: "invalid_slug", message: "Use 2-48 lowercase letters, numbers or dashes." },
        { status: 400 }
      );
    }
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    if (!isEmail(ownerEmail) || !isEmail(contactEmail)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "tenant_exists" }, { status: 409 });
    }

    const payload = {
      id,
      name,
      owner_email: ownerEmail,
      contact_email: contactEmail,
      phone: String(body.phone || "").trim(),
      whatsapp: String(body.whatsapp || "").trim(),
      address: String(body.address || "").trim(),
      org_number: String(body.org_number || "").trim(),
      mva_status: String(body.mva_status || "").trim(),
      hours_text: String(body.hours_text || "").trim(),
      timezone: String(body.timezone || "Europe/Oslo").trim(),
      currency: String(body.currency || "NOK").trim().toUpperCase(),
      ref_prefix: String(body.ref_prefix || "").trim(),
    };

    const { data: provisioned, error } = await supabaseAdmin.rpc("provision_tenant", {
      payload: payload as never,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    await logAdminEvent({
      actor: auth.email,
      tenantId: id,
      action: "tenant.provision",
      detail: { name, owner_email: ownerEmail },
    });

    return NextResponse.json({ success: true, tenant_id: id, tenant, provisioned }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST platform tenants error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
