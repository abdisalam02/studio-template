import crypto from "crypto";
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
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
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
 * Validates an incoming admin request token.
 * Supports:
 * 1. HMAC Signed Admin Session tokens (generated on verify-otp)
 * 2. Supabase Auth JWT access tokens (via supabaseAdmin.auth.getUser)
 * 3. dev-bypass-<base64> tokens (in development mode or fallback)
 */
export async function verifyAdminRequest(
  token: string | null | undefined,
  allowDevBypass = false
): Promise<AdminAuthResult> {
  if (!token) {
    return { authenticated: false, error: "missing_token" };
  }

  const cleanToken = token.startsWith("Bearer ") ? token.replace("Bearer ", "").trim() : token.trim();
  if (!cleanToken) {
    return { authenticated: false, error: "missing_token" };
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

  // 2. Dev-bypass token
  if (cleanToken.startsWith("dev-bypass-")) {
    if (allowDevBypass || process.env.NODE_ENV !== "production") {
      try {
        const b64 = cleanToken.replace("dev-bypass-", "");
        const email = Buffer.from(b64, "base64").toString("utf-8").toLowerCase().trim();
        return {
          authenticated: true,
          email: email || "niwache12@gmail.com",
          tenantId: "gangina",
        };
      } catch {
        return {
          authenticated: true,
          email: "niwache12@gmail.com",
          tenantId: "gangina",
        };
      }
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
        };
      }
    } catch {
      // Fall through to unauthenticated
    }
  }

  return { authenticated: false, error: "invalid_or_expired_token" };
}
