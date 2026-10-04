/**
 * Central tenant configuration.
 *
 * Single source of truth for studio identity, branding, booking rules,
 * services, integrations and auth. The booking engine, transactional emails,
 * the owner review page and the admin portal should read from here instead of
 * hardcoding studio strings, hex colors, prices or tenant slugs.
 *
 * Phase 1: `ganginaConfig` mirrors the current production defaults exactly so
 * existing behaviour (emails, review page, booking flow) is byte-for-byte
 * preserved. Additional studios are added to the `TENANTS` registry below.
 */

export type TenantSlug = string;

/* -------------------------------------------------------------------------- */
/*  Identity & contact                                                        */
/* -------------------------------------------------------------------------- */

export interface TenantContact {
  /** Primary phone number in E.164, e.g. "+4740000000". */
  phone: string;
  /** WhatsApp number as digits for wa.me, e.g. "4740000000". */
  whatsapp: string;
  /** Public contact email shown to customers. */
  email: string;
  /** Owner email that receives booking alerts and OTP login codes. */
  ownerEmail: string;
  /** Instagram handle without the leading "@". */
  instagram: string;
  address: string;
  transit: string;
  orgNumber: string;
  mvaStatus: string;
}

/* -------------------------------------------------------------------------- */
/*  Theme / branding                                                          */
/* -------------------------------------------------------------------------- */

export interface TenantColors {
  /** Page / email canvas background. */
  canvas: string;
  /** Primary surface / card background. */
  card: string;
  /** Header & footer band background. */
  band: string;
  /** Recessed background for insets and note boxes. */
  recessed: string;
  /** Subtle border. */
  border: string;
  /** Strong border for interactive edges. */
  borderStrong: string;
  /** Secondary text / labels. */
  label: string;
  /** Muted text. */
  soft: string;
  /** Primary foreground value. */
  value: string;
  /** Foreground for light "value" surfaces (e.g. primary button text). */
  valueText: string;
  /** Brand accent. */
  accent: string;
  /** Watermark tint. */
  watermark: string;
  /** Positive / success. */
  green: string;
  /** Negative / error. */
  red: string;
  /** Warning / caution. */
  warning: string;
}

export interface TenantTheme {
  colors: TenantColors;
  /** Logo path or absolute URL used by the review page and email header. */
  logoUrl: string;
  /** Optional faint watermark logo. */
  watermarkUrl?: string;
  /** Optional monogram fallback mark. */
  monogram?: string;
  /** Optional wordmark used by the marketing site watermark. */
  watermarkText?: string;
}

/* -------------------------------------------------------------------------- */
/*  Services & booking rules                                                  */
/* -------------------------------------------------------------------------- */

export interface CustomField {
  id: string;
  label: string;
  type: "select" | "text" | "checkbox";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface TenantService {
  id: number | string;
  name: string;
  durationMin: number;
  priceNok: number;
  bufferMin?: number;
  active?: boolean;
  sort?: number;
  /** Display category, used by the service step filter chips. */
  category?: string;
  description?: string;
  photo?: string;
  tag?: string;
}

export interface TenantBookingRules {
  timezone: string;
  currency: string;
  allowMultiSelect: boolean;
  minNoticeMin: number;
  bufferMin: number;
  slotStepMin: number;
  maxDaysAhead: number;
  pendingHoldMin: number;
  cancellationPolicyText: string;
  customFields: CustomField[];
}

/* -------------------------------------------------------------------------- */
/*  Integrations & auth                                                       */
/* -------------------------------------------------------------------------- */

export interface TenantIntegrations {
  /** Display name used for the outgoing "From" and email header. */
  emailFromName: string;
  /** Verified sender address, e.g. "booking@agure.space". */
  emailFromAddress: string;
  /** Optional Reply-To fallback when the tenant has no owner_email. */
  replyTo?: string;
  /** Supabase Storage bucket holding tenant assets (logo/watermark). */
  supabaseAssetsBucket?: string;
  /** Path prefix inside the assets bucket, e.g. "gangina". */
  assetsPrefix?: string;
}

export interface TenantAuth {
  allowedAdminEmails: string[];
  /** Explicitly gate the legacy hardcoded OTP master code. */
  masterOtpEnabled?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Root config                                                               */
/* -------------------------------------------------------------------------- */

export interface TenantConfig {
  id: TenantSlug;
  name: string;
  tagline: string;
  niche: string;
  active: boolean;
  contact: TenantContact;
  theme: TenantTheme;
  rules: TenantBookingRules;
  services: TenantService[];
  integrations: TenantIntegrations;
  auth: TenantAuth;
}

export const DEFAULT_TENANT_SLUG = "gangina";

/* -------------------------------------------------------------------------- */
/*  Tenant definitions                                                        */
/* -------------------------------------------------------------------------- */

export const ganginaConfig: TenantConfig = {
  id: "gangina",
  name: "Gangina Beauty Studio",
  tagline: "Eksklusiv tannsmykking og grillz i Oslo. Sertifisert bonding og presisjonsplassering.",
  niche: "Tannsmykker & Grillz",
  active: true,
  contact: {
    phone: "+4740000000",
    whatsapp: "4740000000",
    email: "post@gangina.no",
    ownerEmail: "niwache15@gmail.com",
    instagram: "gangina.gems",
    address: "Bygdøy Allé, Oslo Sentrum",
    transit: "Kollektiv transport rett til døren",
    orgNumber: "999 888 777",
    mvaStatus: "MVA-registrert",
  },
  theme: {
    colors: {
      canvas: "#0A0A0A",
      card: "#18181B",
      band: "#141417",
      recessed: "#101013",
      border: "#27272A",
      borderStrong: "#3F3F46",
      label: "#A1A1AA",
      soft: "#71717A",
      value: "#FAFAFA",
      valueText: "#18181B",
      accent: "#C9A876",
      watermark: "#2E2E33",
      green: "#4ADE80",
      red: "#F87171",
      warning: "#FBBF24",
    },
    logoUrl: "/img/logo-chrome.png",
    watermarkUrl: "/img/logo-watermark.png",
    monogram: "GG",
    watermarkText: "GANGINA",
  },
  rules: {
    timezone: "Europe/Oslo",
    currency: "kr",
    allowMultiSelect: true,
    minNoticeMin: 120,
    bufferMin: 10,
    slotStepMin: 30,
    maxDaysAhead: 60,
    pendingHoldMin: 1440,
    cancellationPolicyText:
      "Timer må avbestilles senest 24 timer før oppmøte. Uteblivelse eller for sen avbestilling belastes med 50% av behandlingen.",
    customFields: [
      {
        id: "placement",
        label: "Tannplassering / Tooth Placement",
        type: "select",
        options: [
          "Upper Canine",
          "Central Incisor",
          "Premolar",
          "Custom / Usikker",
        ],
        required: false,
      },
    ],
  },
  services: [
    {
      id: 5,
      name: "Single Gem",
      durationMin: 20,
      priceNok: 350,
      bufferMin: 10,
      active: true,
      sort: 1,
      category: "Nail Art & Chrome",
      photo: "/demo/nails/pin-biab.jpg",
      description: "Sertifisert presisjonsplassering med medisinsk adhesiv.",
    },
    {
      id: 6,
      name: "Iridescent Opal Gem",
      durationMin: 25,
      priceNok: 450,
      bufferMin: 10,
      active: true,
      sort: 2,
      category: "Nail Art & Chrome",
      photo: "/demo/nails/pin-glazed-donut.jpg",
      description: "Sertifisert presisjonsplassering med medisinsk adhesiv.",
    },
    {
      id: 7,
      name: "Custom Shape (Butterfly, Star)",
      durationMin: 35,
      priceNok: 550,
      bufferMin: 10,
      active: true,
      sort: 3,
      category: "Nail Art & Chrome",
      photo: "/demo/nails/pin-glass-french.jpg",
      description: "Håndmalt design, kromfinish eller detaljer tilpasset din stil.",
    },
    {
      id: 8,
      name: "Custom Grillz Konsultasjon",
      durationMin: 30,
      priceNok: 0,
      bufferMin: 10,
      active: true,
      sort: 4,
      category: "BIAB & Gel",
      photo: "/demo/nails/pin-russian-prep.jpg",
      description: "Klassisk studiobehandling utført med profesjonelle produkter.",
    },
  ],
  integrations: {
    emailFromName: "Gangina Beauty Studio",
    emailFromAddress: "booking@agure.space",
    replyTo: "niwache15@gmail.com",
    supabaseAssetsBucket: "studio-assets",
    assetsPrefix: "gangina",
  },
  auth: {
    allowedAdminEmails: ["niwache15@gmail.com"],
    masterOtpEnabled: false,
  },
};

export const studioKloConfig: TenantConfig = {
  id: "studio-klo",
  name: "STUDIO KLŌ",
  tagline: "Japansk strukturgelé & organisk neglekunst i Oslo. Naturlig neglehelse og skånsom pleie.",
  niche: "Japansk Strukturgelé & Neglekunst",
  active: true,
  contact: {
    phone: "+4741122333",
    whatsapp: "4741122333",
    email: "hello@studioklo.no",
    ownerEmail: "hello@studioklo.no",
    instagram: "studio.klo",
    address: "Frognerveien, Oslo Sentrum",
    transit: "Trikk 12 til Frogner plass",
    orgNumber: "998 776 554",
    mvaStatus: "MVA-registrert",
  },
  theme: {
    colors: {
      canvas: "#0A0A0A",
      card: "#18181B",
      band: "#141417",
      recessed: "#101013",
      border: "#27272A",
      borderStrong: "#3F3F46",
      label: "#A1A1AA",
      soft: "#71717A",
      value: "#FAFAFA",
      valueText: "#18181B",
      accent: "#4A5848",
      watermark: "#2E2E33",
      green: "#4ADE80",
      red: "#F87171",
      warning: "#FBBF24",
    },
    logoUrl: "/img/logo-chrome.png",
    watermarkUrl: "/img/logo-watermark.png",
    monogram: "SK",
    watermarkText: "KLŌ",
  },
  rules: {
    timezone: "Europe/Oslo",
    currency: "kr",
    allowMultiSelect: true,
    minNoticeMin: 120,
    bufferMin: 10,
    slotStepMin: 30,
    maxDaysAhead: 60,
    pendingHoldMin: 1440,
    cancellationPolicyText:
      "Timer må avbestilles senest 24 timer før oppmøte. Uteblivelse eller for sen avbestilling belastes med 50% av behandlingen.",
    customFields: [
      {
        id: "current_nails",
        label: "Hva har du på neglene nå?",
        type: "select",
        options: [
          "Helt bare negler",
          "Gammel gele (trenger fjerning)",
          "Akryl / Dip",
        ],
        required: true,
      },
    ],
  },
  services: [
    {
      id: 101,
      name: "Japansk Strukturgelé - Nytt Sett",
      durationMin: 60,
      priceNok: 750,
      bufferMin: 10,
      active: true,
      sort: 1,
      category: "BIAB & Gel",
      photo: "/demo/nails/pin-biab.jpg",
    },
    {
      id: 102,
      name: "Nail Art - Tier 2 (Organisk/Abstrakt)",
      durationMin: 30,
      priceNok: 350,
      bufferMin: 10,
      active: true,
      sort: 2,
      category: "Nail Art & Chrome",
      photo: "/demo/nails/nail-1.jpg",
    },
    {
      id: 103,
      name: "Skånsom Fjerning av Gammel Gelé",
      durationMin: 20,
      priceNok: 200,
      bufferMin: 10,
      active: true,
      sort: 3,
      category: "BIAB & Gel",
      photo: "/demo/nails/pin-russian-prep.jpg",
    },
  ],
  integrations: {
    emailFromName: "STUDIO KLŌ",
    emailFromAddress: "booking@agure.space",
    replyTo: "hello@studioklo.no",
    supabaseAssetsBucket: "studio-assets",
    assetsPrefix: "studio-klo",
  },
  auth: {
    allowedAdminEmails: ["hello@studioklo.no"],
    masterOtpEnabled: false,
  },
};

/* -------------------------------------------------------------------------- */
/*  Registry & resolver                                                       */
/* -------------------------------------------------------------------------- */

export const TENANTS: Record<TenantSlug, TenantConfig> = {
  gangina: ganginaConfig,
  "studio-klo": studioKloConfig,
};

/**
 * Resolves a tenant config by slug/id. Always returns a usable config,
 * defaulting gracefully to Gangina.
 */
export function getTenantConfig(slug?: string | null): TenantConfig {
  if (slug && TENANTS[slug]) {
    return TENANTS[slug];
  }
  return ganginaConfig;
}

/** Identity helper for onboarding scripts / config composition. */
export function defineTenant(config: TenantConfig): TenantConfig {
  return config;
}
