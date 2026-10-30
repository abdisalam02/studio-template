import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTestNotificationEmail, type Tenant } from "@/lib/email";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { isTenantAdmin } from "@/lib/tenantAuth";

export const dynamic = "force-dynamic"; // design-ok

/** Builds a full Tenant row from the central config (used when DB row is missing). */

export async function POST(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    const allowBypass = isDev && req.nextUrl.searchParams.get("dev_bypass") === "true";

    const auth = await verifyAdminRequest(req, allowBypass);
    if (!auth.authenticated || !auth.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { tenant_id, email, recipient } = body as {
      tenant_id?: string;
      email?: string;
      recipient?: string;
    };

    const tenantId = tenant_id || auth.tenantId || "";
    if (!tenantId) {
      return NextResponse.json({ error: "tenant_required" }, { status: 400 });
    }
    if (!allowBypass && !(await isTenantAdmin(auth.email, tenantId))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Prefer the real tenant row so owner_email / name stay in sync with the DB.
    let tenant: Tenant | null = null;
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .maybeSingle();

      if (data) tenant = data as unknown as Tenant;
    }
    if (!tenant) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    // Accept `recipient`, fall back to legacy `email`, then the configured owner.
    const targetEmail = (recipient || email || tenant.owner_email || "")
      .trim()
      .toLowerCase();

    if (!targetEmail || !targetEmail.includes("@")) {
      return NextResponse.json(
        {
          error: "invalid_email",
          message: "Provide a valid email address (recipient or email).",
        },
        { status: 400 }
      );
    }

    const result = await sendTestNotificationEmail(tenant, targetEmail);
    return NextResponse.json({
      success: true,
      tenant_id: tenant.id,
      recipient: targetEmail,
      result,
    });
  } catch (err) {
    console.error("Test email error:", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not send the test alert." },
      { status: 500 }
    );
  }
}
