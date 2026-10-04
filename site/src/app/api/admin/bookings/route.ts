import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic"; // design-ok

export async function GET(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = Boolean(
      isDev && (req.nextUrl.searchParams.get("dev_bypass") === "true" || isDev)
    );

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
    }

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "unauthorized", message: "Missing or invalid login." }, { status: 401 });
    }

    const userEmail = (auth.email || "niwache12@gmail.com").toLowerCase();
    const tenantParam = req.nextUrl.searchParams.get("tenant_id") || "gangina";

    // Query tenant by id or match default gangina
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantParam)
      .maybeSingle();

    const tenantId = tenant?.id || tenantParam;

    // Check salon access
    if (tenant && tenant.owner_email) {
      const ownerEmail = tenant.owner_email.toLowerCase();
      const isOwner = ownerEmail === userEmail;
      const isAllowedAdmin = [
        "niwache12@gmail.com",
        "ganginabeauty@gmail.com",
        "admin@agure.space",
        "support@agure.space",
      ].includes(userEmail);
      const isDevEmail =
        userEmail.includes("niwache") ||
        userEmail.includes("gangina") ||
        userEmail.includes("abdisalam");

      if (!isOwner && !isAllowedAdmin && !isDevEmail) {
        return NextResponse.json(
          { error: "forbidden", message: "You do not have access to this studio." },
          { status: 403 }
        );
      }
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

    let finalHours = hoursRes.data || [];
    if (finalHours.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opHoursRes = await (supabaseAdmin as any)
        .from("operating_hours")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("weekday", { ascending: true });
      if (opHoursRes.data && opHoursRes.data.length > 0) {
        finalHours = opHoursRes.data;
      }
    }

    return NextResponse.json({
      success: true,
      tenant: tenant || { id: tenantId, name: "Gangina Beauty Studio" },
      bookings: bookingsRes.data || [],
      blackouts: blackoutsRes.data || [],
      services: servicesRes.data || [],
      hours: finalHours,
    }, { status: 200 });
  } catch (err: unknown) {
    console.error("Error in admin bookings API:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: "server_error", message }, { status: 500 });
  }
}
