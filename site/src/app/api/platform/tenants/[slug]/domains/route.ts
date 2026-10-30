import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  verifyPlatformRequest,
  authError,
  normalizeHostname,
  normalizeOrigin,
} from "@/lib/platformAuth";
import { logAdminEvent } from "@/lib/audit";

export const dynamic = "force-dynamic"; // design-ok

const HOSTNAME = /^(localhost|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+)$/;

async function loadTenant(slug: string) {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("id, allowed_origins")
    .eq("id", slug)
    .maybeSingle();
  return data;
}

/** GET /api/platform/tenants/[slug]/domains */
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
    const tenant = await loadTenant(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("tenant_domains")
      .select("domain, created_at")
      .eq("tenant_id", tenantId)
      .order("domain", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      domains: (data || []).map((row) => row.domain),
      allowed_origins: Array.isArray(tenant.allowed_origins) ? tenant.allowed_origins : [],
    });
  } catch (err: unknown) {
    console.error("GET platform domains error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** PUT /api/platform/tenants/[slug]/domains — replace domains and origins. */
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
    const tenant = await loadTenant(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    const rawDomains: unknown[] = Array.isArray(body.domains) ? body.domains : [];
    if (rawDomains.length > 20) {
      return NextResponse.json({ error: "too_many_domains" }, { status: 400 });
    }
    const domains = [...new Set(rawDomains.map(normalizeHostname).filter(Boolean))];
    for (const domain of domains) {
      if (!HOSTNAME.test(domain)) {
        return NextResponse.json({ error: "invalid_domain", domain }, { status: 400 });
      }
    }

    const rawOrigins: unknown[] = Array.isArray(body.allowed_origins) ? body.allowed_origins : [];
    if (rawOrigins.length > 20) {
      return NextResponse.json({ error: "too_many_origins" }, { status: 400 });
    }
    const origins: string[] = [];
    for (const raw of rawOrigins) {
      const normalized = normalizeOrigin(raw);
      if (!normalized) {
        return NextResponse.json({ error: "invalid_origin" }, { status: 400 });
      }
      if (!origins.includes(normalized)) origins.push(normalized);
    }

    if (domains.length > 0) {
      const { data: conflicts } = await supabaseAdmin
        .from("tenant_domains")
        .select("domain, tenant_id")
        .in("domain", domains)
        .neq("tenant_id", tenantId);

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json(
          { error: "domain_taken", domains: conflicts.map((row) => row.domain) },
          { status: 409 }
        );
      }
    }

    const { error: deleteError } = domains.length
      ? await supabaseAdmin
          .from("tenant_domains")
          .delete()
          .eq("tenant_id", tenantId)
          .not("domain", "in", `(${domains.join(",")})`)
      : await supabaseAdmin.from("tenant_domains").delete().eq("tenant_id", tenantId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (domains.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("tenant_domains").upsert(
        domains.map((domain) => ({ domain, tenant_id: tenantId })),
        { onConflict: "domain", ignoreDuplicates: true }
      );
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { error: tenantError } = await supabaseAdmin
      .from("tenants")
      .update({ allowed_origins: origins as never, updated_at: new Date().toISOString() })
      .eq("id", tenantId);

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 500 });
    }

    await logAdminEvent({
      actor: auth.email,
      tenantId,
      action: "domains.update",
      detail: { domains, allowed_origins: origins },
    });

    return NextResponse.json({ success: true, tenant_id: tenantId, domains, allowed_origins: origins });
  } catch (err: unknown) {
    console.error("PUT platform domains error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
