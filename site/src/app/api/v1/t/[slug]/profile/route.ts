import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic"; // design-ok
export const revalidate = 0;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Removes private owner addresses from any public JSON shape. */
function withoutPrivateEmail(record: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...record };
  for (const key of Object.keys(copy)) {
    if (/^owner_?email$/i.test(key)) delete copy[key];
  }
  return copy;
}

function tenantInitials(name: string): string {
  const cleaned = (name || "Studio").replace(/^by\s+/i, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0]?.[0] || "S").toUpperCase();
}

/* -------------------------------------------------------------------------- */
/*  GET /api/v1/t/[slug]/profile                                              */
/* -------------------------------------------------------------------------- */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const notFound = NextResponse.json(
    { error: "Tenant not found" },
    { status: 404 }
  );

  const { slug: rawSlug } = await params;
  const slug = (rawSlug || "").trim().toLowerCase();
  if (!slug || !supabaseAdmin) return notFound;

  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("id", slug)
    .eq("active", true)
    .maybeSingle();

  if (error || !tenant) return notFound;

  // The profile is public. Flat columns are the newest source of truth; the
  // onboarding JSONB backfills values it has not written yet. owner_email is
  // private and must never be returned here.
  const profile = asRecord(tenant.profile);
  const profileIdentity = asRecord(profile.identity);
  const profileContact = asRecord(profile.contact);
  const brand = asRecord(tenant.branding);
  // A legacy onboarding profile may have stored the owner address as the
  // public contact. Never publish an address that matches owner_email.
  const profileEmail = String(profileContact.email || "").trim();
  const ownerEmail = String(tenant.owner_email || "").trim();
  const publicEmail =
    tenant.contact_email ||
    (profileEmail && profileEmail.toLowerCase() !== ownerEmail.toLowerCase()
      ? profileEmail
      : "");

  const merged = {
    ...withoutPrivateEmail(profile),
    slug: tenant.id,
    timezone: tenant.timezone || "Europe/Oslo",
    currency: tenant.currency || "NOK",
    branding: {
      logo_url: tenant.logo_url || "",
      hero_image_url: tenant.hero_image_url || "",
      watermark_url: tenant.watermark_url || "",
      favicon_url: tenant.favicon_url || "",
      tagline: String(brand.tagline || profileIdentity.tagline || ""),
      monogram: String(
        brand.monogram ||
          profileIdentity.monogram ||
          tenantInitials(tenant.name || tenant.id)
      ),
      palette: asRecord(brand.palette),
      typography: asRecord(brand.typography),
    },
    theme: profile.theme || null,
    custom_fields:
      profile.custom_fields ||
      asRecord(profile.policies).customFields ||
      asRecord(profile.contact).customFields ||
      [],
    identity: {
      ...withoutPrivateEmail(profileIdentity),
      brandName: tenant.name || profileIdentity.brandName,
      refPrefix:
        tenant.ref_prefix || profileIdentity.refPrefix || profileIdentity.monogram,
      monogram:
        tenant.ref_prefix || profileIdentity.monogram || profileIdentity.refPrefix,
    },
    contact: {
      ...withoutPrivateEmail(profileContact),
      email: publicEmail,
      phone: tenant.phone || profileContact.phone || "",
      whatsapp: tenant.whatsapp || profileContact.whatsapp || "",
      address: tenant.address || profileContact.address || "",
      orgNumber: tenant.org_number || profileContact.orgNumber || "",
      mvaStatus: tenant.mva_status || profileContact.mvaStatus || "",
      hours: tenant.hours_text || profileContact.hours || "",
    },
  };

  return NextResponse.json(merged, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
