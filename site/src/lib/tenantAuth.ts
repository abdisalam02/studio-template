import { supabaseAdmin } from "@/lib/supabase";
import { getTenantConfig, findTenantByAdminEmail } from "@/config/tenant.config";

/**
 * Tenant authorization.
 *
 * `tenant_admins` is the source of truth. The tenant owner and the static
 * config are kept as fallbacks during rollout, so an operator can never be
 * locked out by a missing seed row.
 */

export async function isTenantAdmin(
  email: string | null | undefined,
  tenantId: string | null | undefined
): Promise<boolean> {
  const normalizedEmail = (email || "").toLowerCase().trim();
  const normalizedTenant = (tenantId || "").trim();
  if (!normalizedEmail || !normalizedTenant) return false;

  if (supabaseAdmin) {
    const { data: adminRow } = await supabaseAdmin
      .from("tenant_admins")
      .select("email")
      .eq("tenant_id", normalizedTenant)
      .eq("email", normalizedEmail)
      .eq("active", true)
      .maybeSingle();

    if (adminRow) return true;

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("owner_email")
      .eq("id", normalizedTenant)
      .maybeSingle();

    if (tenant?.owner_email?.toLowerCase().trim() === normalizedEmail) {
      return true;
    }
  }

  const config = getTenantConfig(normalizedTenant);
  if (config.id !== normalizedTenant) return false;

  return config.auth.allowedAdminEmails.some(
    (entry) => entry.toLowerCase().trim() === normalizedEmail
  );
}

/** Finds the tenant an email is allowed to administer. */
export async function resolveTenantForEmail(
  email: string | null | undefined
): Promise<string | null> {
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (!normalizedEmail) return null;

  if (supabaseAdmin) {
    const { data: adminRow } = await supabaseAdmin
      .from("tenant_admins")
      .select("tenant_id")
      .eq("email", normalizedEmail)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    if (adminRow?.tenant_id) return adminRow.tenant_id;

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("owner_email", normalizedEmail)
      .eq("active", true)
      .maybeSingle();

    if (tenant?.id) return tenant.id;
  }

  return findTenantByAdminEmail(normalizedEmail)?.id ?? null;
}
