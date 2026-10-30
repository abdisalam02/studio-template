import { NextRequest } from "next/server";

/**
 * Resolves the canonical base URL for booking and email links.
 *
 * Production must set NEXT_PUBLIC_SITE_URL. Vercel previews use VERCEL_URL,
 * and local development uses the incoming request origin.
 */
export function getEngineBaseUrl(req?: NextRequest): string {
  const configured = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  if (configured) return configured;

  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      const proto = req.headers.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`;
    }
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV === "development") {
    return req?.nextUrl.origin || "http://localhost:3000";
  }

  console.error("getEngineBaseUrl: NEXT_PUBLIC_SITE_URL is not configured.");
  return "";
}
