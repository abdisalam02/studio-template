import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantForEmail } from "@/lib/tenantAuth";

export const dynamic = "force-dynamic"; // design-ok
export const revalidate = 0;

/**
 * Public branding lookup for the admin login wall.
 *
 * Resolves the studio from the email (via `tenant_admins` / `owner_email`) or
 * an explicit `tenant_id`, then returns ONLY public branding. It never returns
 * `owner_email`, phone numbers, credentials or the onboarding profile.
 */
type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function deriveMonogram(name: string, fallback: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (cleaned.slice(0, 2) || fallback.slice(0, 2) || "ST").toUpperCase();
}

const NO_STORE = { "Cache-Control": "no-store" } as const;

function notFound() {
  return NextResponse.json({ success: false, tenant_id: null }, { headers: NO_STORE });
}

export async function GET(req: NextRequest) {
  try {
    const email = (req.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
    const requestedTenant = (req.nextUrl.searchParams.get("tenant_id") || "")
      .trim()
      .toLowerCase();

    // Email resolution wins so a mismatched tenant_id cannot change which
    // studio the signed-in address belongs to.
    let tenantId: string | null = email ? await resolveTenantForEmail(email) : null;
    if (!tenantId && requestedTenant) tenantId = requestedTenant;

    if (!tenantId) return notFound();
    if (!supabaseAdmin) return notFound();

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id, name, logo_url, branding, ref_prefix, profile")
      .eq("id", tenantId)
      .eq("active", true)
      .maybeSingle();

    if (error || !tenant) return notFound();

    const branding = asRecord(tenant.branding);
    const assets = asRecord(branding.assets);
    const profile = asRecord(tenant.profile);
    const identity = asRecord(profile.identity);

    const name = text(tenant.name) || text(branding.name) || tenantId;
    const logoUrl =
      text(assets.logo_url) || text(branding.logo_url) || text(tenant.logo_url) || null;
    const monogram =
      text(branding.monogram) ||
      text(identity.monogram) ||
      text(tenant.ref_prefix) ||
      deriveMonogram(name, tenant.id);

    // Strict allow-list: exactly the public branding contract.
    return NextResponse.json(
      {
        success: true,
        tenant_id: tenant.id,
        name,
        logo_url: logoUrl,
        monogram: monogram.slice(0, 4).toUpperCase(),
      },
      { headers: NO_STORE }
    );
  } catch (err: unknown) {
    console.error("Admin branding lookup failed:", err);
    return notFound();
  }
}
