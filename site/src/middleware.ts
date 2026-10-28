import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Single source of truth for API CORS and admin CSRF.
 *
 * - Public API (`/api/v1`, `/api/webhooks`, `/api/action`, `/api/manage`) is
 *   open with `Access-Control-Allow-Origin: *`; it never uses cookies.
 * - Admin API (`/api/admin`) echoes an allow-listed origin and enables
 *   credentials, because the session lives in an HttpOnly cookie.
 * - State-changing admin requests with a foreign Origin are rejected
 *   (defence in depth on top of SameSite=Strict).
 */

const PRODUCTION_ORIGINS = [
  "https://www.abdisalam.space",
  "https://abdisalam.space",
  "https://noire.niwache12.workers.dev",
  "https://noire-rosy.vercel.app",
];

const DEV_PORTS = new Set(["3000", "3001", "3002", "5173"]);
const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const PUBLIC_PREFIXES = ["/api/v1/", "/api/webhooks", "/api/action", "/api/manage"];
const ADMIN_PREFIX = "/api/admin";

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization, X-Requested-With, Accept";

/** API prefixes that authenticate themselves and bypass the CORS gate. */
const SELF_AUTHENTICATED_API_PREFIXES = ["/api/admin/onboard/approve"];

function isSelfAuthenticated(pathname: string): boolean {
  return SELF_AUTHENTICATED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function configuredOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isLocalhostDevOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (!LOCALHOST_HOSTS.has(url.hostname.toLowerCase())) return false;
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    return DEV_PORTS.has(port);
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string, request: NextRequest): boolean {
  if (!origin || origin === "null") return false;
  try {
    if (new URL(origin).host === request.nextUrl.host) return true;
  } catch {
    // fall through
  }
  if (PRODUCTION_ORIGINS.includes(origin)) return true;
  if (configuredOrigins().includes(origin)) return true;
  return isLocalhostDevOrigin(origin);
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

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/api")) return NextResponse.next();
  if (isSelfAuthenticated(pathname)) return NextResponse.next();

  const isAdmin = pathname.startsWith(ADMIN_PREFIX);
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const origin = request.headers.get("origin") || "";
  const allowed = isAllowedOrigin(origin, request);

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
  matcher: "/api/:path*",
};
