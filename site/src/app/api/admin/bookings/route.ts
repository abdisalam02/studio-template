import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";

    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = Boolean(
      isDev && (
        req.nextUrl.searchParams.get("dev_bypass") === "true" ||
        token.startsWith("dev-bypass-")
      )
    );

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const auth = await verifyAdminRequest(authHeader, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "unauthorized", message: "Mangler eller ugyldig innlogging." }, { status: 401 });
    }

    const userEmail = auth.email || "niwache12@gmail.com";
    const tenantParam = req.nextUrl.searchParams.get("tenant_id") || "gangina";

    // Query tenant by id or match default gangina
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantParam)
      .maybeSingle();

    const tenantId = tenant?.id || tenantParam;

    if (!allowBypass && tenant && tenant.owner_email.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json({ error: "forbidden", message: "Du har ikke tilgang til denne salongen." }, { status: 403 });
    }

    // Query all bookings for this tenant ordered by start_utc descending
    const [bookingsRes, blackoutsRes, servicesRes, hoursRes] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("*, services(name, duration_min)")
        .eq("tenant_id", tenantId)
        .order("start_utc", { ascending: false }),
      supabaseAdmin
        .from("blackouts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("start_utc", { ascending: true }),
      supabaseAdmin
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("sort", { ascending: true }),
      supabaseAdmin
        .from("hours")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("weekday", { ascending: true }),
    ]);

    if (bookingsRes.error) {
      console.error("Failed to query bookings:", bookingsRes.error);
      return NextResponse.json({ error: "database_error", details: bookingsRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tenant: tenant || { id: tenantId, name: "Gangina Beauty Studio" },
      bookings: bookingsRes.data || [],
      blackouts: blackoutsRes.data || [],
      services: servicesRes.data || [],
      hours: hoursRes.data || [],
    }, { status: 200 });
  } catch (err: unknown) {
    console.error("Error in admin bookings API:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
