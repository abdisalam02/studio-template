import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Persistent sliding-window limiter.
 *
 * The previous Map-based limiter only worked inside a single serverless
 * instance. This delegates to `consume_rate_limit`, which locks per key and
 * counts rows in `auth_rate_events`, so limits hold across instances.
 */

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  if (!supabaseAdmin) {
    // Auth without a database cannot work; fail closed rather than allow an
    // unlimited stream of OTP emails.
    return false;
  }

  const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("consume_rate_limit failed:", error);
    return false;
  }

  return data === true;
}

/** Stable, non-reversible IP identifier for OTP rows/logs. */
export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * Best-effort client IP extraction from common proxy headers.
 * Falls back to "unknown" so a limiter still functions (keyed globally) when
 * no forwarding header is present.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) return cfIp.trim();
  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const first = vercelIp.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
