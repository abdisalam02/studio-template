import { NextRequest } from "next/server";

/**
 * Resolves the canonical base URL for the booking engine.
 * Ensures:
 * 1. Never points to a local dev host in production.
 * 2. Never points to unrelated domains (e.g. agure.space).
 * 3. Always uses www.abdisalam.space for abdisalam.space (avoids CORS-breaking 308 apex redirect).
 * 4. Preserves localhost in local development.
 */
export function getEngineBaseUrl(req?: NextRequest): string {
  // If in development and testing locally:
  if (process.env.NODE_ENV === "development") {
    if (req?.nextUrl.hostname === "localhost" || req?.nextUrl.hostname === "127.0.0.1") {
      return req.nextUrl.origin;
    }
    if (process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost")) {
      return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
    }
    // Derive the local dev origin from the incoming request when available.
    if (req?.nextUrl.origin) {
      return req.nextUrl.origin;
    }
    // Last-resort local default (development only; never used in production).
    const devHost = process.env.HOST || "localhost";
    const devPort = process.env.PORT || "3000";
    return `http://${devHost}:${devPort}`;
  }

  // 1. Inspect request headers if available (matches incoming domain)
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (
      host &&
      !host.includes("localhost") &&
      !host.includes("127.0.0.1") &&
      !host.includes("agure.space")
    ) {
      const cleanHost =
        host === "abdisalam.space" || host.startsWith("abdisalam.space:")
          ? "www.abdisalam.space"
          : host;
      const proto = req.headers.get("x-forwarded-proto") || "https";
      return `${proto}://${cleanHost}`;
    }
  }

  // 2. Check environment variable, but sanitize agure.space or apex domain
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("agure.space")) {
    let cleaned = envUrl.trim().replace(/\/$/, "");
    if (cleaned.includes("abdisalam.space") && !cleaned.includes("www.abdisalam.space")) {
      cleaned = cleaned.replace("abdisalam.space", "www.abdisalam.space");
    }
    return cleaned;
  }

  // 3. Production canonical fallback
  return "https://www.abdisalam.space";
}
