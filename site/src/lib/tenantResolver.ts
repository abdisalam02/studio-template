import { supabaseAdmin } from "@/lib/supabase";
import {
  getSeedTenant,
  NEUTRAL_COLORS,
  type TenantConfig,
  type TenantContact,
  type TenantColors,
  type TenantService,
  type CustomField,
} from "@/config/tenant.config";

/**
 * DB-first tenant resolution.
 *
 * `tenant.config.ts` is seed data for local development and migrations only.
 * Runtime lookup never falls back to Gangina; an unknown slug resolves to null.
 */

export interface TenantRow {
  id: string;
  name: string;
  owner_email: string;
  contact_email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  org_number?: string | null;
  mva_status?: string | null;
  hours_text?: string | null;
  currency?: string | null;
  logo_url?: string | null;
  hero_image_url?: string | null;
  watermark_url?: string | null;
  favicon_url?: string | null;
  branding?: unknown;
  from_name?: string | null;
  reply_to?: string | null;
  profile?: unknown;
  ref_prefix?: string | null;
  timezone?: string | null;
  buffer_min?: number | null;
  slot_step_min?: number | null;
  min_notice_min?: number | null;
  max_days_ahead?: number | null;
  pending_hold_min?: number | null;
  active?: boolean | null;
}

export interface ServiceRowLike {
  id: number | string;
  name: string;
  duration_min: number;
  price_nok: number;
  buffer_min?: number | null;
  active?: boolean | null;
  sort?: number | null;
  category?: string | null;
  description?: string | null;
  photo?: string | null;
  tag?: string | null;
}

export interface HourRowLike {
  weekday: number;
  open_min: number;
  close_min: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function numberOr(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapService(row: ServiceRowLike): TenantService {
  return {
    id: row.id,
    name: row.name,
    durationMin: row.duration_min,
    priceNok: row.price_nok,
    bufferMin: row.buffer_min ?? undefined,
    active: row.active ?? true,
    sort: row.sort ?? undefined,
    category: row.category ?? undefined,
    description: row.description ?? undefined,
    photo: row.photo ?? undefined,
    tag: row.tag ?? undefined,
  };
}

/** Builds a TenantConfig from a DB row plus optional services and hours. */
export function buildTenantConfig(
  row: TenantRow,
  services: ServiceRowLike[] = [],
  hours: HourRowLike[] = [],
): TenantConfig {
  const seed = getSeedTenant(row.id);
  const profile = asRecord(row.profile);
  const branding = asRecord(row.branding);
  const brandingPalette = asRecord(branding.palette);
  const brandingAssets = asRecord(branding.assets);
  const profileContact = asRecord(profile.contact);
  const profileIdentity = asRecord(profile.identity);
  const profileTheme = asRecord(profile.theme);
  const profileRules = asRecord(profile.policies ?? profile.rules);
  const profileHours = asRecord(profile.hours);
  const profileColors = asRecord(profileTheme.colors);
  const seedColors = seed?.theme.colors ?? NEUTRAL_COLORS;

  const colors = {
    ...seedColors,
    ...(profileColors as Partial<TenantColors>),
    ...(typeof brandingPalette.accent === "string" && brandingPalette.accent
      ? { accent: brandingPalette.accent }
      : {}),
    ...(typeof brandingPalette.card === "string" && brandingPalette.card
      ? { card: brandingPalette.card }
      : {}),
    ...(typeof brandingPalette.canvas === "string" && brandingPalette.canvas
      ? { canvas: brandingPalette.canvas }
      : {}),
  } as TenantColors;

  const ownerEmail = text(row.owner_email, seed?.contact.ownerEmail);
  const explicitContactEmail = text(row.contact_email);
  const profileEmail = text(profileContact.email);
  const publicEmail =
    explicitContactEmail ||
    (profileEmail && profileEmail.toLowerCase() !== ownerEmail.toLowerCase()
      ? profileEmail
      : "") ||
    text(seed?.contact.email);

  const contact: TenantContact = {
    phone: text(row.phone, profileContact.phone, seed?.contact.phone),
    whatsapp: text(row.whatsapp, profileContact.whatsapp, seed?.contact.whatsapp),
    email: publicEmail,
    ownerEmail,
    instagram: text(profileContact.instagram, profile.social && asRecord(profile.social).instagram, seed?.contact.instagram),
    address: text(row.address, profileContact.address, seed?.contact.address),
    transit: text(profileContact.transit, seed?.contact.transit),
    hours: text(row.hours_text, profileHours.summary, seed?.contact.hours),
    orgNumber: text(row.org_number, profileContact.orgNumber, seed?.contact.orgNumber),
    mvaStatus: text(row.mva_status, profileContact.mvaStatus, seed?.contact.mvaStatus),
  };

  const openWeekdays = hours.length
    ? Array.from(new Set(hours.map((entry) => entry.weekday))).sort((a, b) => a - b)
    : seed?.rules.openWeekdays;

  const customFields = Array.isArray(profileRules.customFields)
    ? (profileRules.customFields as CustomField[])
    : seed?.rules.customFields ?? [];

  return {
    id: row.id,
    shortName: text(profileIdentity.shortName, seed?.shortName, row.name),
    name: text(row.name, profileIdentity.brandName, seed?.name),
    tagline: text(profileIdentity.tagline, seed?.tagline),
    niche: text(profileIdentity.niche, seed?.niche),
    active: row.active !== false,
    contact,
    theme: {
      colors,
      lightColors: seed?.theme.lightColors,
      logoUrl: text(row.logo_url, brandingAssets.logo_url, profileTheme.logoUrl, seed?.theme.logoUrl),
      watermarkUrl: text(row.watermark_url, brandingAssets.watermark_url, profileTheme.watermarkUrl, seed?.theme.watermarkUrl),
      monogram: text(branding.monogram, profileTheme.monogram, seed?.theme.monogram),
      watermarkText: text(profileTheme.watermarkText, seed?.theme.watermarkText, row.name),
    },
    rules: {
      timezone: text(row.timezone, seed?.rules.timezone, "Europe/Oslo"),
      currency: text(row.currency, seed?.rules.currency, "NOK"),
      allowMultiSelect: seed?.rules.allowMultiSelect ?? true,
      minNoticeMin: numberOr(row.min_notice_min, seed?.rules.minNoticeMin ?? 120),
      bufferMin: numberOr(row.buffer_min, seed?.rules.bufferMin ?? 10),
      slotStepMin: numberOr(row.slot_step_min, seed?.rules.slotStepMin ?? 30),
      maxDaysAhead: numberOr(row.max_days_ahead, seed?.rules.maxDaysAhead ?? 60),
      pendingHoldMin: numberOr(row.pending_hold_min, seed?.rules.pendingHoldMin ?? 1440),
      cancellationPolicyText: text(profileRules.cancellationPolicyText, seed?.rules.cancellationPolicyText),
      customFields,
      openWeekdays,
    },
    services: services.length ? services.map(mapService) : seed?.services ?? [],
    integrations: {
      emailFromName: text(row.from_name, row.name, seed?.integrations.emailFromName),
      emailFromAddress:
        text(profile.emailFromAddress, seed?.integrations.emailFromAddress, process.env.EMAIL_FROM_ADDRESS) ||
        "booking@agure.space",
      replyTo: text(row.reply_to, row.contact_email, row.owner_email, seed?.integrations.replyTo),
      supabaseAssetsBucket: seed?.integrations.supabaseAssetsBucket,
      assetsPrefix: seed?.integrations.assetsPrefix,
      refPrefix: text(row.ref_prefix, seed?.integrations.refPrefix),
    },
    auth: {
      allowedAdminEmails: [],
      masterOtpEnabled: seed?.auth.masterOtpEnabled,
    },
  };
}

/** Resolves an active tenant from Supabase. Unknown slugs return null. */
export async function resolveTenant(
  slug: string | null | undefined,
  options: { allowSeed?: boolean } = {},
): Promise<TenantConfig | null> {
  const normalized = (slug || "").trim().toLowerCase();
  if (!normalized) return null;

  if (!supabaseAdmin) {
    return options.allowSeed ? getSeedTenant(normalized) : null;
  }

  const { data: row, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("id", normalized)
    .eq("active", true)
    .maybeSingle();

  if (error || !row) {
    return options.allowSeed ? getSeedTenant(normalized) : null;
  }

  const [{ data: services }, { data: hours }] = await Promise.all([
    supabaseAdmin
      .from("services")
      .select("*")
      .eq("tenant_id", normalized)
      .eq("active", true)
      .order("sort", { ascending: true }),
    supabaseAdmin
      .from("hours")
      .select("weekday, open_min, close_min")
      .eq("tenant_id", normalized)
      .order("weekday", { ascending: true }),
  ]);

  return buildTenantConfig(
    row as unknown as TenantRow,
    (services || []) as ServiceRowLike[],
    (hours || []) as HourRowLike[],
  );
}

/** Hostname lookup for custom frontend domains. */
export async function resolveTenantByHost(
  host: string | null | undefined,
): Promise<TenantConfig | null> {
  const normalized = (host || "").split(":")[0].trim().toLowerCase();
  if (!normalized || !supabaseAdmin) return null;

  const { data } = await supabaseAdmin
    .from("tenant_domains")
    .select("tenant_id")
    .eq("domain", normalized)
    .maybeSingle();

  if (!data?.tenant_id) return null;
  return resolveTenant(data.tenant_id);
}
