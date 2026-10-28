import crypto from "crypto";

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateBookingRef(prefix: string): string {
  const cleanPrefix = (prefix || "BKG").toUpperCase().replace(/[^A-Z0-9]/g, "");
  let code = "";
  const randomBytes = crypto.randomBytes(5);
  for (let i = 0; i < 5; i++) {
    code += ALPHANUMERIC[randomBytes[i] % ALPHANUMERIC.length];
  }
  return `${cleanPrefix}-${code}`;
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyToken(token: string, storedHash: string): boolean {
  if (!token || !storedHash) return false;
  const computedHash = hashToken(token);
  const computedBuffer = Buffer.from(computedHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (computedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, storedBuffer);
}

/**
 * Deterministic review token.
 *
 * The one-time token is only available where the booking is created, and only
 * its hash is stored. Server-side code that reacts later (delivery webhook,
 * status change) still needs to link the owner to /a/<ref>.<token>, so the
 * token is derived from the reference with a server-only secret instead of
 * storing the original.
 */
const REVIEW_LINK_SECRET =
  process.env.REVIEW_LINK_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "noire-review-link";

export function deriveReviewToken(ref: string): string {
  return crypto
    .createHmac("sha256", REVIEW_LINK_SECRET)
    .update(`review:${ref.toUpperCase()}`)
    .digest("base64url");
}

/** Accepts either the original one-time token or the derived review token. */
export function verifyReviewToken(
  ref: string,
  token: string,
  storedHash: string
): boolean {
  if (verifyToken(token, storedHash)) return true;
  if (!ref || !token) return false;

  const derived = deriveReviewToken(ref);
  const received = Buffer.from(token);
  const expected = Buffer.from(derived);
  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
}

export function parseRefToken(param: string): { ref: string; token: string } | null {
  if (!param || typeof param !== "string") return null;
  const dotIndex = param.indexOf(".");
  if (dotIndex <= 0 || dotIndex >= param.length - 1) {
    return null;
  }
  const ref = param.slice(0, dotIndex);
  const token = param.slice(dotIndex + 1);
  if (!ref || !token) return null;
  return { ref, token };
}
