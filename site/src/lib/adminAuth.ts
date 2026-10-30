import crypto from "crypto";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Admin authentication.
 *
 * Sessions are opaque random tokens stored as SHA-256 hashes in
 * `admin_sessions`. When `SESSION_SECRET` is set, the stored hash is an
 * HMAC-SHA256 pepper instead, binding the session rows to the deployment
 * secret (rotating it invalidates every session). The cookie is the only
 * transport: HttpOnly, Secure in production, SameSite=Strict, 12 hours,
 * revocable server-side. There is no service-role bearer path, no
 * query-string token and no long-lived HMAC cookie to leak.
 */

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;

export interface AdminAuthResult {
  authenticated: boolean;
  email?: string;
  tenantId?: string | null;
  scope?: "tenant" | "platform";
  sessionId?: string;
  error?: string;
}

/** Optional deployment pepper; unset keeps the legacy plain SHA-256 hashes. */
const SESSION_SECRET = (process.env.SESSION_SECRET || "").trim();

function hashSessionToken(token: string): string {
  if (SESSION_SECRET) {
    return crypto.createHmac("sha256", SESSION_SECRET).update(token).digest("hex");
  }
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}

export function clearedAdminSessionCookieOptions() {
  return {
    ...adminSessionCookieOptions(),
    maxAge: 0,
  };
}

/** Creates a session row and returns the raw token for the cookie. */
export async function createAdminSession(
  email: string,
  tenantId: string | null,
  scope: "tenant" | "platform" = "tenant"
): Promise<{ token: string; expiresAt: number } | null> {
  if (!supabaseAdmin) {
    console.error("createAdminSession: database client unavailable.");
    return null;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000;

  const { error } = await supabaseAdmin.from("admin_sessions").insert({
    token_hash: hashSessionToken(token),
    email: normalizedEmail,
    tenant_id: tenantId ? tenantId.trim() : null,
    scope,
    expires_at: new Date(expiresAt).toISOString(),
  });

  if (error) {
    console.error("createAdminSession failed:", error);
    return null;
  }

  return { token, expiresAt };
}

/** Revokes a session by its raw cookie value. */
export async function revokeAdminSession(token: string): Promise<void> {
  if (!supabaseAdmin || !token) return;
  await supabaseAdmin
    .from("admin_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hashSessionToken(token))
    .is("revoked_at", null);
}

/** Validates the request's admin session cookie. */
export async function verifyAdminRequest(
  req: NextRequest | null | undefined,
  allowDevBypass = false
): Promise<AdminAuthResult> {
  // Development bypass is honoured only outside production, and only when the
  // call site explicitly asks for it (local tooling / tests).
  const devBypassEnabled = allowDevBypass && process.env.NODE_ENV !== "production";

  if (devBypassEnabled) {
    const fallbackEmail = (process.env.ADMIN_FALLBACK_EMAIL || "").toLowerCase().trim();
    const fallbackTenant = (process.env.ADMIN_FALLBACK_TENANT || "").trim();
    // A configured bypass may mint a dev session. If it is not configured,
    // fall through to the real HttpOnly cookie instead of rejecting the user.
    if (fallbackEmail && fallbackTenant) {
      return {
        authenticated: true,
        email: fallbackEmail,
        tenantId: fallbackTenant,
        scope: "tenant",
      };
    }
  }

  if (!req) return { authenticated: false, error: "missing_request" };
  if (!supabaseAdmin) return { authenticated: false, error: "server_configuration_error" };

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (!token) return { authenticated: false, error: "missing_session" };

  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("id, email, tenant_id, scope, expires_at, revoked_at")
    .eq("token_hash", hashSessionToken(token))
    .maybeSingle();

  if (error || !data) {
    return { authenticated: false, error: "invalid_session" };
  }

  if (data.revoked_at) {
    return { authenticated: false, error: "revoked_session" };
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return { authenticated: false, error: "expired_session" };
  }

  return {
    authenticated: true,
    email: data.email,
    tenantId: data.tenant_id,
    scope: data.scope === "platform" ? "platform" : "tenant",
    sessionId: data.id,
  };
}
