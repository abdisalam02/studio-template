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
    .select("id, name, owner_email, phone, ref_prefix, profile, active")
    .eq("id", slug)
    .eq("active", true)
    .maybeSingle();

  if (error || !tenant) return notFound;

  // Merge the stored JSONB profile with the flat columns. Flat columns are the
  // newest source of truth (direct updates); the profile backfills any missing
  // values so older submissions are never lost.
  const profile = asRecord(tenant.profile);
  const profileIdentity = asRecord(profile.identity);
  const profileContact = asRecord(profile.contact);
  const merged = {
    ...profile,
    slug: tenant.id,
    identity: {
      ...profileIdentity,
      brandName: tenant.name || profileIdentity.brandName,
      refPrefix:
        tenant.ref_prefix || profileIdentity.refPrefix || profileIdentity.monogram,
      monogram:
        tenant.ref_prefix || profileIdentity.monogram || profileIdentity.refPrefix,
    },
    contact: {
      ...profileContact,
      email: tenant.owner_email || profileContact.email,
      phone: tenant.phone || profileContact.phone,
    },
  };

  return NextResponse.json(merged, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
