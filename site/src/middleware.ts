import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cross-origin bridge for the tenant front-ends.
 *
 * The hosted studios call the API same-origin, but external tenant front-ends
 * (for example the Noire app) call `/api/v1/t/:slug/*` from a different
 * origin. Browsers gate those calls behind CORS, so this middleware:
 *
 *   - answers preflight OPTIONS with 204 + the requisite headers,
 *   - echoes the concrete origin (never `*`) so credentialed requests work,
 *   - authorises known production domains, same-origin requests and the
 *     common localhost development ports.
 *
 * Extend the production allow-list without a code change by setting
 * `CORS_ALLOWED_ORIGINS` to a comma-separated list of full origins.
 */

/** Canonical production origins for the hosted studios. */
const PRODUCTION_ORIGINS = [
  "https://www.abdisalam.space",
  "https://abdisalam.space",
  // External Noire intake front-end (one-click onboarding submissions).
  "https://noire.niwache12.workers.dev",
];

/** Local development ports the tenant front-ends commonly run on. */
const DEV_PORTS = new Set(["3000", "3001", "3002", "5173"]);

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const ALLOWED_METHODS = "GET, POST, PUT, DELETE, OPTIONS, PATCH";
const ALLOWED_HEADERS =
  "Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token, x-admin-key, x-admin-token";

/** Full origins supplied at runtime via a comma-separated env variable. */
function configuredOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS || "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Matches http(s)://localhost|127.0.0.1|[::1]:<dev port> outside production. */
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
  // No Origin header: a same-origin or server-to-server call needs no CORS.
  if (!origin || origin === "null") return false;

  // Same-origin requests still send an Origin header for non-GET methods.
  try {
    if (new URL(origin).host === request.nextUrl.host) return true;
  } catch {
    // Fall through to the explicit allow-lists.
  }

  if (PRODUCTION_ORIGINS.includes(origin)) return true;
  if (configuredOrigins().includes(origin)) return true;
  return isLocalhostDevOrigin(origin);
}

/** Adds `Origin` to `Vary` without clobbering any existing value. */
function appendVaryOrigin(response: NextResponse): void {
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

function applyCorsHeaders(response: NextResponse, origin: string, allowed: boolean): void {
  appendVaryOrigin(response);
  if (!allowed) return;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
}

export function middleware(request: NextRequest) {
  // Only API requests participate in CORS.
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin") || "";
  const allowed = isAllowedOrigin(origin, request);

  // Preflight: answer directly so the browser never blocks the real request.
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    applyCorsHeaders(response, origin, allowed);
    if (allowed) {
      response.headers.set("Access-Control-Max-Age", "86400");
    }
    return response;
  }

  const response = NextResponse.next();
  applyCorsHeaders(response, origin, allowed);
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
