import crypto from "crypto";

const OTP_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "studio-template-otp-secret-key-32chars";

interface OtpEntry {
  codeHash: string;
  expiresAt: number;
}

// In-memory cache for fast lookup
const memoryStore = new Map<string, OtpEntry>();

export function generate6DigitOtp(): string {
  const num = 100000 + Math.floor(Math.random() * 900000);
  return num.toString();
}

export function createOtpChallenge(email: string, code: string): { challengeToken: string; expiresAt: number } {
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
  const normalizedEmail = email.toLowerCase().trim();
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  memoryStore.set(normalizedEmail, { codeHash, expiresAt });

  // Create HMAC challenge token that can be verified even if memory restarts
  const payload = `${normalizedEmail}|${code}|${expiresAt}`;
  const signature = crypto.createHmac("sha256", OTP_SECRET).update(payload).digest("hex");
  const challengeToken = Buffer.from(`${normalizedEmail}|${expiresAt}|${signature}`).toString("base64url");

  return { challengeToken, expiresAt };
}

export function verifyOtpCode(email: string, code: string, challengeToken?: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();

  // 1. Check in-memory store
  const stored = memoryStore.get(normalizedEmail);
  if (stored) {
    if (stored.expiresAt > now) {
      const candidateHash = crypto.createHash("sha256").update(code).digest("hex");
      if (crypto.timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(stored.codeHash, "hex"))) {
        memoryStore.delete(normalizedEmail);
        return true;
      }
    } else {
      memoryStore.delete(normalizedEmail);
    }
  }

  // 2. Fallback to verifying HMAC challenge token if provided
  if (challengeToken) {
    try {
      const decoded = Buffer.from(challengeToken, "base64url").toString("utf-8");
      const [tokenEmail, tokenExpiresStr, tokenSignature] = decoded.split("|");
      const tokenExpires = parseInt(tokenExpiresStr, 10);

      if (tokenEmail === normalizedEmail && tokenExpires > now) {
        const payload = `${normalizedEmail}|${code}|${tokenExpires}`;
        const expectedSig = crypto.createHmac("sha256", OTP_SECRET).update(payload).digest("hex");
        if (crypto.timingSafeEqual(Buffer.from(tokenSignature, "hex"), Buffer.from(expectedSig, "hex"))) {
          memoryStore.delete(normalizedEmail);
          return true;
        }
      }
    } catch {
      return false;
    }
  }

  return false;
}
