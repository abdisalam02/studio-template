import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Single-use, cross-instance OTP challenges.
 *
 * Only a SHA-256 of the code is stored; the challenge id is the opaque handle
 * returned to the browser. Verification is a locked SQL function that
 * increments attempts, enforces expiry, and burns the row on success — so an
 * intercepted challenge cannot be replayed and a serverless restart cannot
 * resurrect it.
 */

const OTP_TTL_MS = 15 * 60 * 1000;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export interface OtpChallenge {
  id: string;
  code: string;
  expiresAt: number;
}

export async function createOtpChallenge(
  email: string,
  ipHash?: string
): Promise<OtpChallenge | null> {
  if (!supabaseAdmin) {
    console.error("createOtpChallenge: database client unavailable.");
    return null;
  }

  const normalizedEmail = email.toLowerCase().trim();
  // Generate a cryptographically strong 6-digit code (not Math.random).
  const code = crypto.randomInt(100_000, 1_000_000).toString();
  const expiresAt = Date.now() + OTP_TTL_MS;

  // Any outstanding challenge for this email becomes unusable.
  await supabaseAdmin
    .from("admin_otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", normalizedEmail)
    .is("consumed_at", null);

  const { data, error } = await supabaseAdmin
    .from("admin_otp_challenges")
    .insert({
      email: normalizedEmail,
      code_hash: hashCode(code),
      expires_at: new Date(expiresAt).toISOString(),
      ip_hash: ipHash || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createOtpChallenge failed:", error);
    return null;
  }

  return { id: data.id as string, code, expiresAt };
}

export async function verifyOtpCode(
  email: string,
  code: string,
  challengeId: string
): Promise<boolean> {
  if (!supabaseAdmin || !email || !code || !challengeId) return false;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challengeId)) {
    return false;
  }

  const { data, error } = await supabaseAdmin.rpc("verify_otp_challenge", {
    p_id: challengeId,
    p_email: email.toLowerCase().trim(),
    p_code_hash: hashCode(code),
  });

  if (error) {
    console.error("verify_otp_challenge failed:", error);
    return false;
  }

  return data === true;
}
