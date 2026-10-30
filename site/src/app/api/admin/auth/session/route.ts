import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic"; // design-ok

/** Lightweight session probe used by the admin portal on load. */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    // A session probe is not an error; return 200 so the portal can render
    // the login gate without a spurious console failure.
    return NextResponse.json(
      { authenticated: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      email: auth.email,
      tenant_id: auth.tenantId ?? null,
      scope: auth.scope || "tenant",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

