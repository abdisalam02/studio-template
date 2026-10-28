import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";

export const dynamic = "force-dynamic";

/**
 * Applies the tenant's retention window by anonymising closed bookings.
 * `dry_run: true` only counts how many rows would be anonymised.
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => ({}));
    const tenantId = String(body.tenant_id || auth.tenantId || "");
    const days = Number(body.days ?? 365);
    const dryRun = body.dry_run === true;

    if (!tenantId) {
      return NextResponse.json({ error: "missing_tenant" }, { status: 400 });
    }
    if (!Number.isFinite(days) || days < 30 || days > 3650) {
      return NextResponse.json(
        { error: "invalid_days", message: "Retention must be between 30 and 3650 days." },
        { status: 400 }
      );
    }

    if (!(await isTenantAdmin(auth.email, tenantId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const cutoff = Math.floor(Date.now() / 1000) - days * 86400;

    if (dryRun) {
      const { count, error } = await supabaseAdmin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .lt("start_utc", cutoff)
        .in("status", ["cancelled", "declined", "expired", "completed", "no_show"]);

      if (error) {
        return NextResponse.json({ error: "database_error" }, { status: 500 });
      }

      return NextResponse.json({ success: true, dry_run: true, would_anonymise: count ?? 0 });
    }

    const { data, error } = await supabaseAdmin.rpc("anonymize_old_bookings", {
      p_older_than_days: days,
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error("anonymize_old_bookings failed:", error);
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    // Audit retention: 12 months.
    const { data: purgedEvents, error: purgeError } = await supabaseAdmin.rpc(
      "purge_admin_events",
      { p_older_than_days: 365 }
    );
    if (purgeError) {
      console.warn("purge_admin_events failed:", purgeError);
    }

    return NextResponse.json({
      success: true,
      dry_run: false,
      anonymised: data ?? 0,
      events_purged: purgedEvents ?? 0,
    });
  } catch (err: unknown) {
    console.error("Retention error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
