#!/usr/bin/env node
/**
 * verify-defenses.mjs
 * ---------------------------------------------------------------------------
 * Standalone, local-only defense verifier for the studio admin portal.
 *
 * It sends safe, read-only probes against a *running* Next.js server and
 * checks the hardening added to the API layer:
 *
 *   1. Security headers        (X-Frame-Options / X-Content-Type-Options ...)
 *   2. Admin API protection    (401 for unauthenticated /api/admin/* access)
 *   3. Dev route isolation      (preview-email + dev_bypass guards)
 *   4. Auth rate limiting       (429 after repeated failed OTP verifications)
 *
 * Nothing here creates bookings, sends email, or mutates data. Test 4 uses a
 * throwaway `@example.invalid` address so no real admin account is affected.
 *
 * Usage:
 *   node scripts/verify-defenses.mjs
 *   BASE_URL=http://localhost:3000 node scripts/verify-defenses.mjs
 *
 * Exit code is 0 when every check passes, 1 otherwise (CI friendly).
 * ---------------------------------------------------------------------------
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE_URL = (
  process.env.VERIFY_BASE_URL ||
  process.env.BASE_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(SCRIPT_DIR, "..");

const REQUEST_TIMEOUT_MS = 10_000;
const results = [];

/** Records and prints one check result. */
function record(ok, label, detail) {
  const entry = { ok, label, detail: detail || "" };
  results.push(entry);
  console.log(`${ok ? "[PASS]" : "[FAIL]"} ${label}${detail ? ` — ${detail}` : ""}`);
}

/** fetch() with a hard timeout so the script never hangs. */
function probe(url, options = {}) {
  return fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    ...options,
  });
}

/* ------------------------------------------------------------------------- */
/* Test 1 — Global security headers                                            */
/* ------------------------------------------------------------------------- */
async function testSecurityHeaders() {
  const label = "Security Headers present";
  try {
    const res = await probe(`${BASE_URL}/`);
    const xfo = res.headers.get("x-frame-options");
    const xcto = res.headers.get("x-content-type-options");
    const csp = res.headers.get("content-security-policy");
    const referrer = res.headers.get("referrer-policy");
    const perms = res.headers.get("permissions-policy");

    const ok =
      Boolean(xfo && xcto) &&
      xfo.toLowerCase() === "deny" &&
      xcto.toLowerCase() === "nosniff";

    const parts = [
      `X-Frame-Options=${xfo ?? "MISSING"}`,
      `X-Content-Type-Options=${xcto ?? "MISSING"}`,
    ];
    if (csp) parts.push(`Content-Security-Policy="${csp}"`);
    if (referrer) parts.push(`Referrer-Policy=${referrer}`);
    if (perms) parts.push(`Permissions-Policy="${perms}"`);

    record(ok, label, parts.join(", "));
  } catch (err) {
    record(false, label, `request failed: ${err.message}`);
  }
}

/* ------------------------------------------------------------------------- */
/* Test 2 — Admin endpoints require authentication                            */
/* ------------------------------------------------------------------------- */
async function testAdminEndpointProtected() {
  const label = "Admin endpoints protected (401 on missing token)";
  try {
    const res = await probe(`${BASE_URL}/api/admin/bookings?tenant_id=gangina`);
    const ok = res.status === 401;
    let snippet = "";
    if (!ok) {
      try {
        snippet = (await res.text()).replace(/\s+/g, " ").slice(0, 160);
      } catch {
        snippet = "";
      }
    }
    record(
      ok,
      label,
      `GET /api/admin/bookings → ${res.status}${ok ? "" : ` (expected 401) ${snippet}`}`
    );
  } catch (err) {
    record(false, label, `request failed: ${err.message}`);
  }
}

/* ------------------------------------------------------------------------- */
/* Test 3 — Dev-only routes & dev_bypass are production-isolated             */
/* ------------------------------------------------------------------------- */
function readSource(relativePath) {
  return readFileSync(path.join(SITE_ROOT, relativePath), "utf8");
}

function hasProductionGuard(source) {
  return (
    source.includes('NODE_ENV === "production"') ||
    source.includes("NODE_ENV === 'production'")
  );
}

function hasDevelopmentGuard(source) {
  return (
    source.includes('NODE_ENV === "development"') ||
    source.includes("NODE_ENV === 'development'")
  );
}

async function testDevRouteGuarding() {
  const label = "Production dev guards verified";
  const findings = [];
  let ok = true;

  // Live probe of the development-only email preview harness.
  try {
    const res = await probe(`${BASE_URL}/api/dev/preview-email`);
    if (res.status === 404) {
      findings.push("preview-email → HTTP 404 (production guard active)");
    } else if (res.status === 200) {
      findings.push("preview-email → HTTP 200 (dev server; reachable only outside production)");
    } else {
      ok = false;
      findings.push(`preview-email → HTTP ${res.status} (unexpected)`);
    }
  } catch (err) {
    ok = false;
    findings.push(`preview-email probe failed: ${err.message}`);
  }

  // Static verification that every dev_bypass route is gated to development.
  const devBypassRoutes = [
    "src/app/api/admin/bookings/route.ts",
    "src/app/api/admin/hours/route.ts",
    "src/app/api/admin/settings/route.ts",
    "src/app/api/admin/blackouts/route.ts",
    "src/app/api/admin/bookings/status/route.ts",
    "src/app/api/admin/bookings/reschedule/route.ts",
  ];
  for (const rel of devBypassRoutes) {
    try {
      const source = readSource(rel);
      if (source.includes("dev_bypass") && !hasDevelopmentGuard(source)) {
        ok = false;
        findings.push(`${rel} uses dev_bypass without a development guard`);
      }
    } catch (err) {
      ok = false;
      findings.push(`${rel} unreadable (${err.message})`);
    }
  }

  // Static verification that the preview harness has a production guard.
  try {
    const source = readSource("src/app/api/dev/preview-email/route.ts");
    if (!hasProductionGuard(source)) {
      ok = false;
      findings.push("preview-email missing production guard");
    }
  } catch (err) {
    ok = false;
    findings.push(`preview-email unreadable (${err.message})`);
  }

  // Static verification that the shared auth layer rejects dev bypasses in prod.
  try {
    const source = readSource("src/lib/adminAuth.ts");
    if (!(source.includes("devBypassEnabled") && source.includes('NODE_ENV !== "production"'))) {
      ok = false;
      findings.push("adminAuth dev bypass is not gated to non-production");
    }
  } catch (err) {
    ok = false;
    findings.push(`adminAuth unreadable (${err.message})`);
  }

  record(ok, label, findings.join("; "));
}

/* ------------------------------------------------------------------------- */
/* Test 4 — verify-otp rate limiter returns 429 after abuse                  */
/* ------------------------------------------------------------------------- */
async function testRateLimiting() {
  const label = "Rate limiter active (429 on abuse)";
  const email = `defense-check+${Date.now()}@example.invalid`;
  const maxAttempts = 8;
  const statuses = [];

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const res = await probe(`${BASE_URL}/api/admin/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: "000000", tenant_id: "gangina" }),
      });
      statuses.push(res.status);

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        record(
          true,
          label,
          `429 returned on attempt ${attempt}/${maxAttempts} (Retry-After=${retryAfter ?? "n/a"}); statuses=[${statuses.join(", ")}]`
        );
        return;
      }
    }
    record(
      false,
      label,
      `no 429 after ${maxAttempts} invalid attempts; statuses=[${statuses.join(", ")}]`
    );
  } catch (err) {
    record(false, label, `request failed: ${err.message}`);
  }
}

/* ------------------------------------------------------------------------- */
/* Runner                                                                     */
/* ------------------------------------------------------------------------- */
async function main() {
  console.log("");
  console.log("Defense verification");
  console.log(`Target: ${BASE_URL}`);
  console.log("-".repeat(58));

  await testSecurityHeaders();
  await testAdminEndpointProtected();
  await testDevRouteGuarding();
  await testRateLimiting();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  console.log("-".repeat(58));
  console.log(`RESULT: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log("Failed checks:");
    for (const entry of results.filter((r) => !r.ok)) {
      console.log(`  - ${entry.label}: ${entry.detail}`);
    }
    process.exitCode = 1;
  } else {
    console.log("All defenses verified.");
  }
}

main().catch((err) => {
  console.error("Unexpected verifier error:", err);
  process.exitCode = 1;
});
