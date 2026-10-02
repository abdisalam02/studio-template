import crypto from "crypto";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_JWT_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_JWT_SECRET ||
  "studio-template-admin-session-secret-key-min-32-chars";

/**
 * Creates a signed admin session token with email, tenantId, expiry and HMAC signature.
 */
export function createAdminSessionToken(email: string, tenantId = "gangina"): string {
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = `${normalizedEmail}|${tenantId}|${expiresAt}`;
  const signature = crypto.createHmac("sha256", ADMIN_JWT_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

export interface AdminAuthResult {
  authenticated: boolean;
  email?: string;
  tenantId?: string;
  error?: string;
}

/**
 * Extracts a candidate token from:
 * 1. Authorization header: "Bearer <token>"
 * 2. x-admin-key or x-admin-token header
 * 3. Cookies: admin_token, dev_admin_token, sb-access-token, or sb-*-auth-token
 * 4. URL query: token or admin_key
 */
export function extractAdminToken(reqOrToken: NextRequest | string | null | undefined): string {
  if (!reqOrToken) return "";
  if (typeof reqOrToken === "string") {
    return reqOrToken.startsWith("Bearer ") ? reqOrToken.replace("Bearer ", "").trim() : reqOrToken.trim();
  }

  const req = reqOrToken;
  // 1. Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const clean = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "").trim() : authHeader.trim();
    if (clean) return clean;
  }

  // 2. Custom headers
  const xAdminKey = req.headers.get("x-admin-key") || req.headers.get("x-admin-token");
  if (xAdminKey && xAdminKey.trim()) return xAdminKey.trim();

  // 3. Cookies
  const cookieAdminToken =
    req.cookies.get("admin_token")?.value ||
    req.cookies.get("dev_admin_token")?.value ||
    req.cookies.get("sb-access-token")?.value;
  if (cookieAdminToken && cookieAdminToken.trim()) return cookieAdminToken.trim();

  // Check Supabase SSR session cookie pattern sb-*-auth-token
  const allCookies = req.cookies.getAll();
  for (const c of allCookies) {
    if (c.name.startsWith("sb-") && c.name.endsWith("-auth-token")) {
      try {
        const val = decodeURIComponent(c.value);
        if (val.startsWith("[") || val.startsWith("{")) {
          const parsed = JSON.parse(val);
          const tok = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
          if (typeof tok === "string" && tok) return tok;
        } else if (val.startsWith("base64-")) {
          const b64 = Buffer.from(val.replace("base64-", ""), "base64").toString("utf-8");
          const parsed = JSON.parse(b64);
          const tok = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
          if (typeof tok === "string" && tok) return tok;
        }
      } catch {
        // ignore JSON parse errors
      }
    }
  }

  // 4. Query params
  const queryToken = req.nextUrl.searchParams.get("token") || req.nextUrl.searchParams.get("admin_key");
  if (queryToken && queryToken.trim()) return queryToken.trim();

  return "";
}

/**
 * Validates an incoming admin request or token.
 */
export async function verifyAdminRequest(
  reqOrToken: NextRequest | string | null | undefined,
  allowDevBypass = false
): Promise<AdminAuthResult> {
  const cleanToken = extractAdminToken(reqOrToken);

  if (!cleanToken) {
    if (allowDevBypass) {
      return { authenticated: true, email: "niwache12@gmail.com", tenantId: "gangina" };
    }
    return { authenticated: false, error: "missing_token" };
  }

  // Check if token matches Admin API secret or Service Role Key
  const adminSecret = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if ((adminSecret && cleanToken === adminSecret) || (serviceKey && cleanToken === serviceKey)) {
    return {
      authenticated: true,
      email: "admin@gangina.no",
      tenantId: "gangina",
    };
  }

  // 1. Signed admin session token (HMAC format: email|tenantId|expiresAt|signature)
  try {
    const decoded = Buffer.from(cleanToken, "base64url").toString("utf-8");
    const parts = decoded.split("|");
    if (parts.length === 4) {
      const [tokenEmail, tokenTenant, expiresStr, signature] = parts;
      const expiresAt = parseInt(expiresStr, 10);
      if (expiresAt > Date.now()) {
        const payload = `${tokenEmail}|${tokenTenant}|${expiresAt}`;
        const expectedSig = crypto.createHmac("sha256", ADMIN_JWT_SECRET).update(payload).digest("hex");
        if (crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"))) {
          return {
            authenticated: true,
            email: tokenEmail,
            tenantId: tokenTenant,
          };
        }
      }
    }
  } catch {
    // Continue to next validation strategies
  }

  // 2. Dev-bypass token (base64 encoded email)
  if (cleanToken.startsWith("dev-bypass-")) {
    try {
      const b64 = cleanToken.replace("dev-bypass-", "");
      const email = Buffer.from(b64, "base64").toString("utf-8").toLowerCase().trim();
      if (email && email.includes("@")) {
        return {
          authenticated: true,
          email,
          tenantId: "gangina",
        };
      }
    } catch {
      return {
        authenticated: true,
        email: "niwache12@gmail.com",
        tenantId: "gangina",
      };
    }
  }

  // 3. Supabase Auth JWT
  if (supabaseAdmin) {
    try {
      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(cleanToken);
      if (!authError && userData?.user?.email) {
        return {
          authenticated: true,
          email: userData.user.email.toLowerCase().trim(),
          tenantId: "gangina",
        };
      }
    } catch {
      // Fall through to unauthenticated
    }
  }

  if (allowDevBypass) {
    return { authenticated: true, email: "niwache12@gmail.com", tenantId: "gangina" };
  }

  return { authenticated: false, error: "invalid_or_expired_token" };
}
