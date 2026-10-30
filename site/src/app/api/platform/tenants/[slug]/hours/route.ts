import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPlatformRequest, authError } from "@/lib/platformAuth";
import { logAdminEvent } from "@/lib/audit";

export const dynamic = "force-dynamic"; // design-ok

interface HourInput {
  weekday: number;
  open_min: number;
  close_min: number;
}

function parseHours(raw: unknown[]): { hours: HourInput[]; error?: string } {
  const hours: HourInput[] = [];

  for (const entry of raw) {
    const row = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const weekday = Math.round(Number(row.weekday));
    const open = Math.round(Number(row.open_min ?? row.openMin));
    const close = Math.round(Number(row.close_min ?? row.closeMin));

    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { hours: [], error: "invalid_weekday" };
    if (!Number.isInteger(open) || open < 0 || open > 1439) return { hours: [], error: "invalid_open" };
    if (!Number.isInteger(close) || close < 1 || close > 1440 || close <= open) {
      return { hours: [], error: "invalid_close" };
    }

    hours.push({ weekday, open_min: open, close_min: close });
  }

  for (let weekday = 0; weekday <= 6; weekday += 1) {
    const day = hours
      .filter((hour) => hour.weekday === weekday)
      .sort((a, b) => a.open_min - b.open_min);
    for (let index = 1; index < day.length; index += 1) {
      if (day[index].open_min < day[index - 1].close_min) {
        return { hours: [], error: "overlapping_hours" };
      }
    }
  }

  return { hours };
}

/** GET /api/platform/tenants/[slug]/hours */
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
      .from("hours")
      .select("weekday, open_min, close_min")
      .eq("tenant_id", tenantId)
      .order("weekday", { ascending: true })
      .order("open_min", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, tenant_id: tenantId, hours: data || [] });
  } catch (err: unknown) {
    console.error("GET platform hours error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** PUT /api/platform/tenants/[slug]/hours — replace the weekly schedule. */
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
    const input: unknown[] = Array.isArray(body.hours) ? body.hours : [];
    if (input.length > 60) {
      return NextResponse.json({ error: "too_many_intervals" }, { status: 400 });
    }

    const { hours, error: parseError } = parseHours(input);
    if (parseError) {
      return NextResponse.json({ error: parseError }, { status: 400 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("hours")
      .delete()
      .eq("tenant_id", tenantId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (hours.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("hours").insert(
        hours.map((hour) => ({ tenant_id: tenantId, ...hour }))
      );
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    await logAdminEvent({
      actor: auth.email,
      tenantId,
      action: "hours.update",
      detail: { intervals: hours.length },
    });

    return NextResponse.json({ success: true, tenant_id: tenantId, hours });
  } catch (err: unknown) {
    console.error("PUT platform hours error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
