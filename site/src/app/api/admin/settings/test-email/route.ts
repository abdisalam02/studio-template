import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getTenantConfig } from "@/config/tenant.config";
import { sendTestNotificationEmail, type Tenant } from "@/lib/email";

export const dynamic = "force-dynamic"; // design-ok

/** Builds a full Tenant row from the central config (used when DB row is missing). */
function tenantFromConfig(tenantId?: string | null): Tenant {
  const config = getTenantConfig(tenantId);
  const prefix =
    (config.name || "BKG")
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 3)
      .toUpperCase() || "BKG";

  return {
    id: config.id,
    name: config.name,
    owner_email: config.contact.ownerEmail,
    phone: config.contact.phone || null,
    profile: null,
    ref_prefix: prefix,
    timezone: config.rules.timezone,
    allowed_origins: [],
    buffer_min: config.rules.bufferMin,
    slot_step_min: config.rules.slotStepMin,
    min_notice_min: config.rules.minNoticeMin,
    max_days_ahead: config.rules.maxDaysAhead,
    pending_hold_min: config.rules.pendingHoldMin,
    active: true,
    created_at: Math.floor(Date.now() / 1000),
  };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const isDev = process.env.NODE_ENV !== "production";
    const hasBearer = Boolean(authHeader?.startsWith("Bearer "));

    // In production a Bearer token is required; in development we allow the
    // admin dev-bypass flow to exercise the live email without an OTP session.
    if (!hasBearer && !isDev) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { tenant_id, email, recipient } = body as {
      tenant_id?: string;
      email?: string;
      recipient?: string;
    };

    // Prefer the real tenant row so owner_email / name stay in sync with the DB.
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
      tenant = tenantFromConfig(tenant_id);
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
