import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic"; // design-ok
export const revalidate = 0;

/* -------------------------------------------------------------------------- */
/*  CORS                                                                      */
/* -------------------------------------------------------------------------- */

/** Origins permitted to read the public tenant profile. */
const ALLOWED_ORIGINS = [
  "https://www.abdisalam.space",
  "https://abdisalam.space",
  "https://noire.niwache12.workers.dev",
  "https://noire-rosy.vercel.app",
];

const DEV_PORTS = new Set(["3000", "3001", "3002", "5173"]);
const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Echoes an authorized request origin, falling back to `*` for anonymous
 * readers of this public, read-only endpoint.
 */
function resolveAllowedOrigin(req: NextRequest): string {
  const origin = req.headers.get("origin") || "";
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) return origin;

    const extra = (process.env.CORS_ALLOWED_ORIGINS || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (extra.includes(origin)) return origin;

    try {
      const url = new URL(origin);
      if (LOCALHOST_HOSTS.has(url.hostname.toLowerCase())) {
        const port = url.port || (url.protocol === "https:" ? "443" : "80");
        if (DEV_PORTS.has(port)) return origin;
      }
    } catch {
      // Ignore a malformed Origin header.
    }
  }
  return "*";
}

function corsHeaders(req: NextRequest): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(req),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

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
  const cors = corsHeaders(req);
  const notFound = NextResponse.json(
    { error: "Tenant not found" },
    { status: 404, headers: cors }
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
      ...cors,
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
