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
