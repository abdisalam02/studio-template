/**
 * Consolidated type surface.
 *
 * The canonical tenant type definitions live in `@/config/tenant.config`.
 * This module re-exports them so existing imports of `@/types` keep working
 * without duplicating the interfaces.
 */

export type {
  TenantSlug,
  TenantContact,
  TenantColors,
  TenantTheme,
  CustomField,
  TenantService,
  TenantBookingRules,
  TenantIntegrations,
  TenantAuth,
  TenantConfig,
} from "@/config/tenant.config";
