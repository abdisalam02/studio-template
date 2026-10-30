import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic"; // design-ok
export const revalidate = 0;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/v1/t/[slug]/services
 * Public active service list for booking frontends. `price_nok` is whole kroner.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  const slug = (rawSlug || "").trim().toLowerCase();
  if (!slug) {
    return NextResponse.json(
      { error: "missing_slug" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "server_configuration_error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("id", slug)
    .eq("active", true)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json(
      { error: "tenant_not_found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .eq("tenant_id", slug)
    .eq("active", true)
    .order("sort", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "database_error", message: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { tenant_id: slug, services: data || [] },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
