import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAllowedOrigin as isAllowedByPolicy, isLocalhostDevOrigin } from "@/lib/cors";

/**
 * Single source of truth for API CORS and admin CSRF.
 *
 * - Public API (`/api/v1`, `/api/webhooks`, `/api/action`, `/api/manage`) is
 *   open with `Access-Control-Allow-Origin: *`; it never uses cookies.
 * - Admin API (`/api/admin`) echoes an allow-listed origin and enables
 *   credentials, because the session lives in an HttpOnly cookie.
 * - State-changing admin requests with a foreign Origin are rejected
 *   (defence in depth on top of SameSite=Strict).
 *
 * Allowed origins come from CORS_ALLOWED_ORIGINS plus the database
 * (`tenant_domains` and `tenants.allowed_origins`). No customer domain is
 * compiled into this file.
 */

const PUBLIC_PREFIXES = ["/api/v1/", "/api/webhooks", "/api/action", "/api/manage"];
const ADMIN_PREFIX = "/api/admin";
const PLATFORM_PREFIX = "/api/platform";

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization, X-Requested-With, Accept";

/** API prefixes that authenticate themselves and bypass the CORS gate. */
const SELF_AUTHENTICATED_API_PREFIXES = ["/api/admin/onboard/approve"];

function isSelfAuthenticated(pathname: string): boolean {
  return SELF_AUTHENTICATED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function isAllowedOrigin(origin: string, request: NextRequest): Promise<boolean> {
  if (!origin || origin === "null") return false;
  try {
    if (new URL(origin).host === request.nextUrl.host) return true;
  } catch {
    // fall through
  }
  if (isLocalhostDevOrigin(origin)) return true;
  return isAllowedByPolicy(origin);
}

function appendVary(response: NextResponse): void {
  const existing = response.headers.get("Vary");
  if (!existing) {
    response.headers.set("Vary", "Origin");
    return;
  }
  const values = existing.split(",").map((value) => value.trim().toLowerCase());
  if (!values.includes("origin")) {
    response.headers.set("Vary", `${existing}, Origin`);
  }
}

function setPublicCors(response: NextResponse): void {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
}

function setAdminCors(response: NextResponse, origin: string): void {
  appendVary(response);
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin.html") {
    const dest = request.nextUrl.clone();
    dest.pathname = "/admin";
    return NextResponse.redirect(dest, 307);
  }
  if (pathname === "/platform.html") {
    const dest = request.nextUrl.clone();
    dest.pathname = "/platform";
    return NextResponse.redirect(dest, 307);
  }
  const isTokenPage = pathname.startsWith("/a/") || pathname.startsWith("/m/");

  if (!pathname.startsWith("/api")) {
    const response = NextResponse.next();
    // Token-bearing pages must never leak their URL as a referrer or be cached.
    response.headers.set(
      "Referrer-Policy",
      isTokenPage ? "no-referrer" : "strict-origin-when-cross-origin"
    );
    if (isTokenPage) {
      response.headers.set("Cache-Control", "no-store, max-age=0");
    }
    return response;
  }

  if (isSelfAuthenticated(pathname)) return NextResponse.next();

  const isAdmin = pathname.startsWith(ADMIN_PREFIX) || pathname.startsWith(PLATFORM_PREFIX);
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const origin = request.headers.get("origin") || "";
  const allowed = await isAllowedOrigin(origin, request);

  // Preflight
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    if (isAdmin) {
      if (allowed) setAdminCors(response, origin);
    } else if (isPublic) {
      setPublicCors(response);
    }
    return response;
  }

  // CSRF: a browser sending a foreign Origin may not mutate admin state.
  if (
    isAdmin &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    origin &&
    !allowed
  ) {
    return NextResponse.json(
      { error: "forbidden_origin" },
      { status: 403 }
    );
  }

  const response = NextResponse.next();
  if (isAdmin) {
    if (allowed) setAdminCors(response, origin);
    else appendVary(response);
  } else if (isPublic) {
    setPublicCors(response);
  }
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
