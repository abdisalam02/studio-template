import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPlatformRequest, authError } from "@/lib/platformAuth";
import { logAdminEvent } from "@/lib/audit";

export const dynamic = "force-dynamic"; // design-ok

interface ServiceInput {
  id?: number;
  name: string;
  duration_min: number;
  price_nok: number;
  buffer_min: number | null;
  active: boolean;
  sort: number;
}

function parseService(raw: unknown, index: number): ServiceInput | null {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = String(row.name || "").trim();
  const duration = Math.round(Number(row.duration_min ?? row.durationMin));
  const price = Math.round(Number(row.price_nok ?? row.priceNok));
  const buffer = row.buffer_min ?? row.bufferMin;
  const bufferMin = buffer === null || buffer === undefined || buffer === "" ? null : Math.round(Number(buffer));
  const id = Number(row.id);

  if (!name || name.length > 120) return null;
  if (!Number.isFinite(duration) || duration < 5 || duration > 480) return null;
  if (!Number.isFinite(price) || price < 0) return null;
  if (bufferMin !== null && (!Number.isFinite(bufferMin) || bufferMin < 0)) return null;

  return {
    id: Number.isInteger(id) && id > 0 ? id : undefined,
    name,
    duration_min: duration,
    price_nok: price,
    buffer_min: bufferMin,
    active: row.active === undefined ? true : Boolean(row.active),
    sort: Number.isFinite(Number(row.sort)) ? Math.round(Number(row.sort)) : index + 1,
  };
}

/** GET /api/platform/tenants/[slug]/services */
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
      .from("services")
      .select("id, name, duration_min, price_nok, buffer_min, active, sort")
      .eq("tenant_id", tenantId)
      .order("sort", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, tenant_id: tenantId, services: data || [] });
  } catch (err: unknown) {
    console.error("GET platform services error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** PUT /api/platform/tenants/[slug]/services — create, update and retire services. */
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
      .select("id")
      .eq("id", tenantId)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const input: unknown[] = Array.isArray(body.services) ? body.services : [];
    if (input.length === 0 || input.length > 50) {
      return NextResponse.json({ error: "invalid_services" }, { status: 400 });
    }

    const parsed: ServiceInput[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const service = parseService(input[index], index);
      if (!service) {
        return NextResponse.json({ error: "invalid_service", index }, { status: 400 });
      }
      parsed.push(service);
    }

    const { data: existing } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("tenant_id", tenantId);

    const existingIds = new Set((existing || []).map((row) => row.id));
    const kept = new Set<number>();

    for (const service of parsed) {
      if (service.id && existingIds.has(service.id)) {
        kept.add(service.id);
        const { error } = await supabaseAdmin
          .from("services")
          .update({
            name: service.name,
            duration_min: service.duration_min,
            price_nok: service.price_nok,
            buffer_min: service.buffer_min,
            active: service.active,
            sort: service.sort,
          })
          .eq("id", service.id)
          .eq("tenant_id", tenantId);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      } else {
        const { error } = await supabaseAdmin.from("services").insert({
          tenant_id: tenantId,
          name: service.name,
          duration_min: service.duration_min,
          price_nok: service.price_nok,
          buffer_min: service.buffer_min,
          active: service.active,
          sort: service.sort,
        });
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    const retired = [...existingIds].filter((id) => !kept.has(id));
    if (retired.length > 0) {
      await supabaseAdmin
        .from("services")
        .update({ active: false })
        .eq("tenant_id", tenantId)
        .in("id", retired);
    }

    await logAdminEvent({
      actor: auth.email,
      tenantId,
      action: "services.update",
      detail: { count: parsed.length, retired: retired.length },
    });

    const { data } = await supabaseAdmin
      .from("services")
      .select("id, name, duration_min, price_nok, buffer_min, active, sort")
      .eq("tenant_id", tenantId)
      .order("sort", { ascending: true })
      .order("id", { ascending: true });

    return NextResponse.json({ success: true, tenant_id: tenantId, services: data || [] });
  } catch (err: unknown) {
    console.error("PUT platform services error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
