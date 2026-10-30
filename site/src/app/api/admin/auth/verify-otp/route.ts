import { NextRequest, NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/otpStore";
import {
  createAdminSession,
  adminSessionCookieOptions,
  ADMIN_SESSION_COOKIE,
} from "@/lib/adminAuth";
import { consumeRateLimit, getClientIp, hashIp } from "@/lib/rateLimit";
import { resolveTenantForEmail, isTenantAdmin } from "@/lib/tenantAuth";
import { isPlatformAdmin } from "@/lib/platformAuth";

export const dynamic = "force-dynamic"; // design-ok

/**
 * Verifies a single-use OTP and creates a server-side session.
 * The raw session token is only ever sent as an HttpOnly cookie; no token is
 * returned in the JSON body.
 */
const WINDOW_SECONDS = 15 * 60;
const IP_LIMIT = 20;
const EMAIL_LIMIT = 10;

function invalidCode() {
  return NextResponse.json(
    { error: "invalid_code", message: "Invalid or expired code." },
    { status: 401 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);
    const ipAllowed = await consumeRateLimit(
      `verify:ip:${hashIp(clientIp)}`,
      IP_LIMIT,
      WINDOW_SECONDS
    );

    if (!ipAllowed) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": "900" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const challengeId = typeof body.challengeId === "string" ? body.challengeId : "";

    if (!email || !/^\d{6}$/.test(code) || !challengeId) {
      return invalidCode();
    }

    const emailAllowed = await consumeRateLimit(
      `verify:email:${email}`,
      EMAIL_LIMIT,
      WINDOW_SECONDS
    );

    if (!emailAllowed) {
      return invalidCode();
    }

    const valid = await verifyOtpCode(email, code, challengeId);
    if (!valid) {
      return invalidCode();
    }

    const requestedScope = String(body.scope || "").trim().toLowerCase();
    const requestedTenant = String(body.tenant_id || "").trim().toLowerCase();
    const platformAdmin = await isPlatformAdmin(email);
    let tenantId: string | null = null;

    if (requestedScope === "platform") {
      if (!platformAdmin) {
        return invalidCode();
      }
      tenantId = null;
    } else if (requestedTenant) {
      if (!(await isTenantAdmin(email, requestedTenant))) {
        return invalidCode();
      }
      tenantId = requestedTenant;
    } else {
      tenantId = await resolveTenantForEmail(email);
    }

    // Platform super-admins may sign in without belonging to a tenant.
    if (!platformAdmin && (!tenantId || !(await isTenantAdmin(email, tenantId)))) {
      return invalidCode();
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
      is_platform_admin: platformAdmin,
    });

    res.cookies.set(ADMIN_SESSION_COOKIE, session.token, adminSessionCookieOptions());
    return res;
  } catch (err: unknown) {
    console.error("Error in verify-otp:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

