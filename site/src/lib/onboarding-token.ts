import crypto from "crypto";

/**
 * Tamper-proof approval tokens for the one-click onboarding triage flow.
 *
 * A token is a base64url-encoded JSON payload followed by an HMAC-SHA256
 * signature over that payload:
 *
 *     <base64url(payload)>.<base64url(hmac)>
 *
 * The payload carries an `exp` timestamp (72 hours after creation), so a
 * leaked review link stops working on its own. Verification is constant-time
 * and fails closed: a missing secret, a malformed token, a bad signature or an
 * expired token all resolve to `null`.
 *
 * The signing key prefers a dedicated `ONBOARDING_TOKEN_SECRET`, and falls back
 * to the service-role key (a server-only secret that is always present in this
 * deployment).
 */

/** How long an approval link stays valid. */
const TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

function getSigningSecret(): string | null {
  const secret =
    process.env.ONBOARDING_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  return secret.trim().length > 0 ? secret : null;
}

function sign(encodedPayload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

/**
 * Signs an arbitrary JSON-serialisable payload and stamps it with an expiry.
 *
 * @throws if no signing secret is configured, so a misconfigured environment
 *         can never emit an unsigned (forgeable) token.
 */
export function createApprovalToken(payload: object): string {
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error("onboarding_signing_secret_missing");
  }
  const body = {
    ...(payload as Record<string, unknown>),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

/**
 * Verifies {@link createApprovalToken} output.
 *
 * @returns the decoded payload when the signature is valid and unexpired,
 *          otherwise `null` (invalid, tampered, expired, or unconfigured).
 */
export function verifyApprovalToken(token: string): object | null {
  const secret = getSigningSecret();
  if (!secret || !token || typeof token !== "string") return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0 || separator >= token.length - 1) return null;

  const encoded = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  const expectedSignature = sign(encoded, secret);

  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const exp = (parsed as Record<string, unknown>).exp;
  if (typeof exp !== "number" || !Number.isFinite(exp) || Date.now() > exp) {
    return null;
  }

  return parsed as object;
}
