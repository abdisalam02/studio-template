import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSession,
  adminSessionCookieOptions,
  ADMIN_SESSION_COOKIE,
} from "@/lib/adminAuth";
import { resolveTenantForEmail, isTenantAdmin } from "@/lib/tenantAuth";
import { isPlatformAdmin } from "@/lib/platformAuth";

export const dynamic = "force-dynamic"; // design-ok

/**
 * Development-only shortcut. In production the route is indistinguishable from
 * a missing endpoint. It now creates the same DB-backed session as the OTP
 * flow instead of minting a stateless HMAC token.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || process.env.ADMIN_FALLBACK_EMAIL || "")
      .toLowerCase()
      .trim();
    if (!email) {
      return NextResponse.json({ error: "email_required" }, { status: 400 });
    }
    const requestedTenant = String(body.tenant_id || "").trim().toLowerCase();
    const platformAdmin = await isPlatformAdmin(email);
    const tenantId =
      requestedTenant && (await isTenantAdmin(email, requestedTenant))
        ? requestedTenant
        : await resolveTenantForEmail(email);
    if (!tenantId && !platformAdmin) {
      return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
    }

    const session = await createAdminSession(
      email,
      tenantId,
      platformAdmin ? "platform" : "tenant"
    );
    if (!session) {
      return NextResponse.json({ error: "session_failed" }, { status: 500 });
    }

    const res = NextResponse.json({
      success: true,
      email,
      tenant_id: tenantId,
      scope: platformAdmin ? "platform" : "tenant",
    });
    res.cookies.set(ADMIN_SESSION_COOKIE, session.token, adminSessionCookieOptions());
    return res;
  } catch (err: unknown) {
    console.error("Dev login error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

