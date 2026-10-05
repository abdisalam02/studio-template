/** @type {import('next').NextConfig} */

/**
 * Global security headers applied to every route.
 *
 * - X-Frame-Options: DENY + CSP `frame-ancestors 'none'` block clickjacking
 *   (the portal is never meant to be embedded).
 * - X-Content-Type-Options stops MIME sniffing.
 * - Referrer-Policy trims cross-origin referrer leakage.
 * - Permissions-Policy disables powerful browser APIs the app never uses.
 *
 * The Content-Security-Policy is intentionally limited to directives that
 * cannot restrict scripts/styles/fonts/images, so it hardens framing and
 * plugin/base-URI behaviour without breaking the Next.js runtime, Google
 * Fonts, Supabase or Resend. Directives left unset fall back to browser
 * defaults (i.e. they are not blocked).
 */
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  // Build output directory. Defaults to `.next`; override with
  // `NEXT_DIST_DIR` when a running dev server holds the default directory
  // (e.g. Windows file locks during a local `next build`).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
