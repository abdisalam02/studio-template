import { GANGINA_CONFIG } from "./gangina";
import { STUDIO_KLO_CONFIG } from "./studio-klo";
import type { TenantConfig } from "./types";

export const TENANTS: Record<string, TenantConfig> = {
  gangina: GANGINA_CONFIG,
  "studio-klo": STUDIO_KLO_CONFIG,
};

export function getTenantConfig(slug?: string | null): TenantConfig {
  if (slug && TENANTS[slug]) {
    return TENANTS[slug];
  }
  return GANGINA_CONFIG;
}
