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

/**
 * Per-instance micro-cache for validated sessions.
 *
 * The hosted Supabase round-trip dominates the session probe (~100–200ms from
 * some regions). A short TTL makes repeat probes effectively free while
 * bounding revocation lag to SESSION_CACHE_TTL_MS. `revokeAdminSession` evicts
 * the same-instance entry immediately.
 */
const SESSION_CACHE_TTL_MS = 15_000;
const SESSION_CACHE_MAX = 500;
interface CachedSession {
  result: AdminAuthResult;
  sessionExpiresAt: number;
  cachedAt: number;
}
const sessionCache = new Map<string, CachedSession>();

function readCachedSession(tokenHash: string): AdminAuthResult | null {
  const entry = sessionCache.get(tokenHash);
  if (!entry) return null;
  if (
    Date.now() - entry.cachedAt >= SESSION_CACHE_TTL_MS ||
    entry.sessionExpiresAt <= Date.now()
  ) {
    sessionCache.delete(tokenHash);
    return null;
  }
  return entry.result;
}

function writeCachedSession(
  tokenHash: string,
  result: AdminAuthResult,
  expiresAtIso: string
): void {
  if (sessionCache.size >= SESSION_CACHE_MAX) {
    const oldest = sessionCache.keys().next().value;
    if (oldest) sessionCache.delete(oldest);
  }
  sessionCache.set(tokenHash, {
    result,
    sessionExpiresAt: new Date(expiresAtIso).getTime(),
    cachedAt: Date.now(),
  });
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
  const tokenHash = hashSessionToken(token);
  const expiresAtIso = new Date(expiresAt).toISOString();
  const normalizedTenant = tenantId ? tenantId.trim() : null;

  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .insert({
      token_hash: tokenHash,
      email: normalizedEmail,
      tenant_id: normalizedTenant,
      scope,
      expires_at: expiresAtIso,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createAdminSession failed:", error);
    return null;
  }

  // Pre-warm the cache so the immediate post-login /auth/session probe is a hit.
  writeCachedSession(
    tokenHash,
    {
      authenticated: true,
      email: normalizedEmail,
      tenantId: normalizedTenant,
      scope,
      sessionId: data?.id,
    },
    expiresAtIso
  );

  return { token, expiresAt };
}

/** Revokes a session by its raw cookie value. */
export async function revokeAdminSession(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = hashSessionToken(token);
  sessionCache.delete(tokenHash);
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from("admin_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
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

  const tokenHash = hashSessionToken(token);
  const cached = readCachedSession(tokenHash);
  if (cached) return cached;

  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("id, email, tenant_id, scope, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    sessionCache.delete(tokenHash);
    return { authenticated: false, error: "invalid_session" };
  }

  if (data.revoked_at) {
    sessionCache.delete(tokenHash);
    return { authenticated: false, error: "revoked_session" };
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    sessionCache.delete(tokenHash);
    return { authenticated: false, error: "expired_session" };
  }

  const result: AdminAuthResult = {
    authenticated: true,
    email: data.email,
    tenantId: data.tenant_id,
    scope: data.scope === "platform" ? "platform" : "tenant",
    sessionId: data.id,
  };
  writeCachedSession(tokenHash, result, data.expires_at);
  return result;
}
