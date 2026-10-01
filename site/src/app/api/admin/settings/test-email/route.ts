import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTestNotificationEmail, type Tenant } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tenant_id, email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "invalid_email", message: "Oppgi en gyldig e-postadresse." }, { status: 400 });
    }

    let tenant: Tenant | null = null;
    if (supabaseAdmin && tenant_id) {
      const { data } = await supabaseAdmin
        .from("tenants")
        .select("*")
        .eq("id", tenant_id)
        .maybeSingle();

      if (data) tenant = data as unknown as Tenant;
    }

    if (!tenant) {
      tenant = {
        id: tenant_id || "gangina",
        name: "Gangina Beauty Studio",
        owner_email: email,
        ref_prefix: "GNG",
        timezone: "Europe/Oslo",
        allowed_origins: [],
        buffer_min: 10,
        slot_step_min: 15,
        min_notice_min: 120,
        max_days_ahead: 60,
        pending_hold_min: 1440,
        active: true,
        created_at: 1790772301,
      };
    }

    const result = await sendTestNotificationEmail(tenant, email);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("Test email error:", err);
    return NextResponse.json({ error: "server_error", message: "Kunne ikke sende test-varsel." }, { status: 500 });
  }
}
