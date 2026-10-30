import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminRequest } from "@/lib/adminAuth";

/**
 * Platform (super-admin) authorization.
 *
 * `platform_admins` is the source of truth. A platform session is issued with
 * `scope = 'platform'` and is accepted by every `/api/platform/*` route. Tenant
 * routes additionally accept platform admins through `isTenantAdmin`, which
 * keeps the tenant boundary intact for ordinary tenant sessions.
 */

export const PLATFORM_TENANT_BUCKET = "tenant-assets";

export interface PlatformAuthResult {
  authenticated: boolean;
  email?: string;
  error?: string;
}

/** True when the address is an active platform super-admin. */
export async function isPlatformAdmin(email: string | null | undefined): Promise<boolean> {
  const normalized = (email || "").toLowerCase().trim();
  if (!normalized || !supabaseAdmin) return false;

  const { data } = await supabaseAdmin
    .from("platform_admins")
    .select("email, active")
    .eq("email", normalized)
    .eq("active", true)
    .maybeSingle();

  return Boolean(data);
}

/**
 * Validates a platform request. Requires both an active `platform_admins` row
 * and a session minted with `scope = 'platform'`.
 */
export async function verifyPlatformRequest(
  req: NextRequest,
  allowDevBypass = false
): Promise<PlatformAuthResult> {
  const auth = await verifyAdminRequest(req, allowDevBypass);
  if (!auth.authenticated || !auth.email) {
    return { authenticated: false, error: auth.error || "unauthorized" };
  }

  if (!(await isPlatformAdmin(auth.email))) {
    return { authenticated: false, email: auth.email, error: "forbidden" };
  }

  if (auth.scope !== "platform") {
    return { authenticated: false, email: auth.email, error: "platform_scope_required" };
  }

  return { authenticated: true, email: auth.email };
}

/** Shared JSON error helper. */
export function authError(result: PlatformAuthResult) {
  const status = result.error === "forbidden" || result.error === "platform_scope_required" ? 403 : 401;
  return { error: result.error || "unauthorized", status };
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase().trim() : "";
}

export function slugify(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function normalizeHostname(value: unknown): string {
  let host = String(value ?? "").trim().toLowerCase();
  host = host.replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  return host.replace(/^www\./, "");
}

export function normalizeOrigin(value: unknown): string {
  const raw = String(value ?? "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}
