#!/usr/bin/env node
/**
 * verify-auth-lookup-security.mjs
 *
 * Focused pre-push audit for:
 *   1. GET /api/admin/auth/lookup (public branding, no private data)
 *   2. Gangina owner + OTP dispatch (challenge row + Resend)
 *   3. 401s on all protected admin endpoints (reads AND mutations)
 *   4. Demo/dev-bypass cannot touch real tenant rows
 *   5. Production env documentation (RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
 *      SESSION_SECRET)
 *
 * Usage:
 *   node scripts/verify-auth-lookup-security.mjs
 *   ADMIN_LOG_PATH=<next-dev.log> node scripts/verify-auth-lookup-security.mjs
 */

import { existsSync, readFileSync } from "node:fs";

/* ------------------------------------------------------------------ */
/* Env                                                                */
/* ------------------------------------------------------------------ */
const env = {};
for (const file of ["site/.env.local", ".env.local"]) {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
      if (match) {
        env[match[1]] = match[2].trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
      }
    }
  } catch {
    /* optional */
  }
}

const API_BASE = (process.env.ADMIN_API_BASE || "http://localhost:3000").replace(/\/+$/, "");
const SUPABASE_URL = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
const RESEND_KEY = env.RESEND_API_KEY || "";
const LOG_PATH = process.env.ADMIN_LOG_PATH || "";

const GANGINA = "gangina";
const OWNER = "niwache12@gmail.com";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in site/.env.local");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Results                                                            */
/* ------------------------------------------------------------------ */
let failures = 0;
let warnings = 0;
const results = [];

function record(status, name, detail = "") {
  results.push({ status, name, detail });
  if (status === "FAIL") failures++;
  if (status === "WARN") warnings++;
  console.log(`${status.padEnd(4)} ${name}${detail ? `  [${detail}]` : ""}`);
}
function pass(name, detail) { record("PASS", name, detail); }
function fail(name, detail) { record("FAIL", name, detail); }
function warn(name, detail) { record("WARN", name, detail); }
function check(condition, name, detail) {
  if (condition) pass(name, detail);
  else fail(name, detail);
  return Boolean(condition);
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                       */
/* ------------------------------------------------------------------ */
async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  return { status: res.status, json: await parseBody(res), headers: res.headers };
}

async function sb(path, { method = "GET", body } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await parseBody(res) };
}

async function clearRateLimits() {
  try { await sb("auth_rate_events?id=gt.0", { method: "DELETE" }); } catch { /* best effort */ }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_DATA_KEYS = ["tenant", "bookings", "hours", "blackouts", "events", "services"];

/* ------------------------------------------------------------------ */
/* Suite                                                              */
/* ------------------------------------------------------------------ */
let challengeId = null;

try {
  const sessionProbe = await api("/api/admin/auth/session");
  check(
    sessionProbe.status === 200,
    "server.reachable",
    `${API_BASE} -> HTTP ${sessionProbe.status}`
  );

  /* ---------------- 1. Public branding lookup ---------------- */
  const byEmail = await api(`/api/admin/auth/lookup?email=${encodeURIComponent(OWNER)}`);
  const byEmailJson = byEmail.json || {};
  const keys = Object.keys(byEmailJson).sort();

  check(
    byEmail.status === 200 && byEmailJson.success === true && byEmailJson.tenant_id === GANGINA,
    "lookup.email.gangina",
    `HTTP ${byEmail.status} tenant=${byEmailJson.tenant_id}`
  );
  check(
    keys.join(",") === "logo_url,monogram,name,success,tenant_id",
    "lookup.strict_shape",
    keys.join(",")
  );
  check(
    typeof byEmailJson.name === "string" &&
      /gangina/i.test(byEmailJson.name) &&
      typeof byEmailJson.monogram === "string" &&
      byEmailJson.monogram.length > 0 &&
      (byEmailJson.logo_url === null || typeof byEmailJson.logo_url === "string"),
    "lookup.gangina.branding",
    `name=${JSON.stringify(byEmailJson.name)} monogram=${JSON.stringify(byEmailJson.monogram)} logo=${JSON.stringify(byEmailJson.logo_url)}`
  );

  for (const forbidden of [
    "owner_email",
    "phone",
    "whatsapp",
    "contact_email",
    "email",
    "profile",
    "credentials",
    "contact",
    "tenants",
  ]) {
    check(!(forbidden in byEmailJson), `lookup.no_${forbidden}`, "absent");
  }

  check(
    /no-store/i.test(byEmail.headers.get("cache-control") || ""),
    "lookup.no_store",
    byEmail.headers.get("cache-control") || "missing"
  );

  const byTenant = await api(`/api/admin/auth/lookup?tenant_id=${GANGINA}`);
  check(
    byTenant.status === 200 && byTenant.json?.success === true && byTenant.json?.tenant_id === GANGINA,
    "lookup.tenant_id.gangina",
    `HTTP ${byTenant.status}`
  );

  const mismatch = await api(
    `/api/admin/auth/lookup?email=${encodeURIComponent(OWNER)}&tenant_id=noire`
  );
  check(
    mismatch.json?.tenant_id === GANGINA,
    "lookup.email_wins_over_mismatched_tenant",
    `tenant=${mismatch.json?.tenant_id}`
  );

  const unknownEmail = await api(
    `/api/admin/auth/lookup?email=${encodeURIComponent(`unknown-${Date.now()}@example.com`)}`
  );
  check(
    unknownEmail.status === 200 &&
      unknownEmail.json?.success === false &&
      unknownEmail.json?.tenant_id === null,
    "lookup.unknown_email",
    `HTTP ${unknownEmail.status}`
  );

  const unknownTenant = await api("/api/admin/auth/lookup?tenant_id=does-not-exist");
  check(
    unknownTenant.status === 200 &&
      unknownTenant.json?.success === false &&
      unknownTenant.json?.tenant_id === null,
    "lookup.unknown_tenant",
    `HTTP ${unknownTenant.status}`
  );

  const emptyLookup = await api("/api/admin/auth/lookup");
  check(
    emptyLookup.status === 200 &&
      emptyLookup.json?.success === false &&
      emptyLookup.json?.tenant_id === null,
    "lookup.empty",
    `HTTP ${emptyLookup.status}`
  );

  /* ---------------- 2. Gangina tenant + OTP ---------------- */
  const gangina = await sb(
    `tenants?id=eq.${GANGINA}&select=id,name,owner_email,contact_email,phone,ref_prefix,branding,logo_url,active`
  );
  const ganginaRow = gangina.json?.[0];
  check(
    gangina.status === 200 &&
      ganginaRow?.owner_email === OWNER &&
      ganginaRow?.active === true,
    "gangina.owner_email",
    `owner=${ganginaRow?.owner_email} active=${ganginaRow?.active}`
  );

  await clearRateLimits();
  const logBefore =
    LOG_PATH && existsSync(LOG_PATH) ? readFileSync(LOG_PATH, "utf8").length : 0;

  const otp = await api("/api/admin/auth/send-otp", {
    method: "POST",
    body: { email: OWNER },
  });
  challengeId = otp.json?.challengeId || null;

  check(
    otp.status === 200 &&
      otp.json?.success === true &&
      otp.json?.tenant_id === GANGINA &&
      otp.json?.scope === "tenant" &&
      UUID_RE.test(String(challengeId)),
    "otp.send.gangina",
    `HTTP ${otp.status} tenant=${otp.json?.tenant_id}`
  );
  check(
    /gangina/i.test(String(otp.json?.sender_identity || "")),
    "otp.sender_identity",
    String(otp.json?.sender_identity || "")
  );

  const challenge = await sb(
    `admin_otp_challenges?id=eq.${challengeId}&select=id,email,consumed_at,attempts,expires_at,created_at`
  );
  const challengeRow = challenge.json?.[0];
  check(
    Boolean(challengeRow) &&
      challengeRow.email === OWNER.toLowerCase() &&
      challengeRow.consumed_at === null &&
      Number(challengeRow.attempts || 0) === 0 &&
      new Date(challengeRow.expires_at).getTime() > Date.now(),
    "otp.challenge.persisted",
    `email=${challengeRow?.email} consumed=${challengeRow?.consumed_at}`
  );

  if (LOG_PATH && existsSync(LOG_PATH)) {
    // Give the dev-server log a moment to flush the route line.
    await new Promise((resolve) => setTimeout(resolve, 500));
    const logTail = readFileSync(LOG_PATH, "utf8").slice(logBefore);
    const deliveryFailure = /OTP email delivery failed/i.test(logTail);
    check(
      !deliveryFailure,
      "otp.resend.no_delivery_error",
      deliveryFailure ? "server log contains 'OTP email delivery failed'" : "no delivery error logged"
    );
    check(
      /POST \/api\/admin\/auth\/send-otp.*200/.test(logTail),
      "otp.route.200_logged",
      "200 logged"
    );
  } else {
    warn("otp.resend.log_unavailable", "set ADMIN_LOG_PATH to assert delivery from the dev log");
  }

  if (RESEND_KEY) {
    const domainsRes = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${RESEND_KEY}` },
    });
    check(domainsRes.status === 200, "resend.api_key.valid", `HTTP ${domainsRes.status}`);
    if (domainsRes.ok) {
      const domains = await domainsRes.json();
      const agure = (domains.data || []).find((domain) => domain.name === "agure.space");
      check(
        agure?.status === "verified" && agure?.capabilities?.sending === "enabled",
        "resend.agure_domain.verified",
        `status=${agure?.status} sending=${agure?.capabilities?.sending}`
      );
    }
  } else {
    fail("resend.api_key.present", "RESEND_API_KEY is empty");
  }

  /* ---------------- 3. Unauthenticated reads -> 401 ---------------- */
  const protectedGets = [
    ["bookings", `/api/admin/bookings?tenant_id=${GANGINA}`],
    ["hours", `/api/admin/hours?tenant_id=${GANGINA}`],
    ["settings", `/api/admin/settings?tenant_id=${GANGINA}`],
    ["blackouts", `/api/admin/blackouts?tenant_id=${GANGINA}`],
    ["audit", `/api/admin/audit?tenant_id=${GANGINA}`],
  ];

  for (const [name, path] of protectedGets) {
    const res = await api(path);
    const leaked = SAFE_DATA_KEYS.filter((key) => key in (res.json || {}));
    check(
      res.status === 401 && leaked.length === 0,
      `authz.401.${name}`,
      `HTTP ${res.status}${leaked.length ? ` leaked=${leaked.join(",")}` : ""}`
    );
  }

  /* ---------------- 4. Unauthenticated mutations -> 401 + no writes ---------------- */
  const bookingSnapshot = await sb(
    `bookings?tenant_id=eq.${GANGINA}&select=ref,status&order=start_utc.desc&limit=1`
  );
  const targetBooking = bookingSnapshot.json?.[0] || null;
  const tenantBefore = await sb(
    `tenants?id=eq.${GANGINA}&select=name,contact_email,phone`
  );
  const bookingCountBefore =
    (await sb(`bookings?tenant_id=eq.${GANGINA}&select=id`)).json?.length ?? 0;
  const blackoutCountBefore =
    (await sb(`blackouts?tenant_id=eq.${GANGINA}&select=id`)).json?.length ?? 0;

  const futureStart = Math.floor(Date.now() / 1000) + 45 * 86400;
  const mutations = [
    [
      "settings.post",
      "POST",
      "/api/admin/settings",
      { tenant_id: GANGINA, name: "UNAUTH HACK", phone: "+47000000000" },
    ],
    [
      "hours.post",
      "POST",
      "/api/admin/hours",
      { tenant_id: GANGINA, shifts: { Monday: { open: true, start: "09:00", end: "10:00" } } },
    ],
    [
      "blackouts.post",
      "POST",
      "/api/admin/blackouts",
      { tenant_id: GANGINA, start_utc: futureStart, end_utc: futureStart + 3600, reason: "UNAUTH" },
    ],
    [
      "bookings.status.post",
      "POST",
      "/api/admin/bookings/status",
      { ref: targetBooking?.ref, status: "cancelled" },
    ],
    [
      "bookings.manual.post",
      "POST",
      "/api/admin/bookings/manual",
      {
        tenant_id: GANGINA,
        client_name: "UNAUTH",
        client_phone: "+47000000000",
        date: "2099-01-01",
        time: "11:00",
      },
    ],
    ["blackouts.delete", "DELETE", "/api/admin/blackouts?id=999999", undefined],
  ];

  for (const [name, method, path, body] of mutations) {
    const res = await api(path, { method, body });
    check(res.status === 401, `authz.401.${name}`, `HTTP ${res.status}`);
  }

  const tenantAfter = await sb(`tenants?id=eq.${GANGINA}&select=name,contact_email,phone`);
  check(
    JSON.stringify(tenantAfter.json?.[0]) === JSON.stringify(tenantBefore.json?.[0]),
    "authz.no_tenant_mutation",
    JSON.stringify(tenantAfter.json?.[0])
  );

  if (targetBooking?.ref) {
    const bookingAfter = await sb(
      `bookings?ref=eq.${encodeURIComponent(targetBooking.ref)}&select=status`
    );
    check(
      bookingAfter.json?.[0]?.status === targetBooking.status,
      "authz.no_booking_mutation",
      `${targetBooking.ref}: ${targetBooking.status} -> ${bookingAfter.json?.[0]?.status}`
    );
  }

  const bookingCountAfter =
    (await sb(`bookings?tenant_id=eq.${GANGINA}&select=id`)).json?.length ?? 0;
  const blackoutCountAfter =
    (await sb(`blackouts?tenant_id=eq.${GANGINA}&select=id`)).json?.length ?? 0;
  check(
    bookingCountAfter === bookingCountBefore,
    "authz.no_new_bookings",
    `${bookingCountBefore} -> ${bookingCountAfter}`
  );
  check(
    blackoutCountAfter === blackoutCountBefore,
    "authz.no_new_blackouts",
    `${blackoutCountBefore} -> ${blackoutCountAfter}`
  );

  /* ---------------- 5. Demo mode / dev bypass ---------------- */
  const demoCases = [
    ["demo.query", "GET", `/api/admin/bookings?tenant_id=${GANGINA}&demo=1`, undefined],
    ["demo.tenant", "GET", "/api/admin/bookings?tenant_id=demo-studio", undefined],
    ["demo.dev_bypass", "GET", `/api/admin/bookings?tenant_id=${GANGINA}&dev_bypass=true`, undefined],
    [
      "demo.settings.dev_bypass",
      "POST",
      "/api/admin/settings?dev_bypass=true",
      { tenant_id: GANGINA, name: "UNAUTH HACK" },
    ],
  ];
  for (const [name, method, path, body] of demoCases) {
    const res = await api(path, { method, body });
    check(res.status === 401, `authz.401.${name}`, `HTTP ${res.status}`);
  }

  const devLoginUnknown = await api("/api/admin/dev-login", {
    method: "POST",
    body: { email: "attacker@example.com" },
  });
  check(
    devLoginUnknown.status === 404,
    "demo.dev_login.rejects_unknown_email",
    `HTTP ${devLoginUnknown.status}`
  );

  const devLoginEmpty = await api("/api/admin/dev-login", { method: "POST", body: {} });
  check(
    devLoginEmpty.status === 400,
    "demo.dev_login.requires_email",
    `HTTP ${devLoginEmpty.status}`
  );

  const devLoginSrc = readFileSync("site/src/app/api/admin/dev-login/route.ts", "utf8");
  check(
    devLoginSrc.includes('process.env.NODE_ENV === "production"') &&
      devLoginSrc.includes("status: 403"),
    "demo.dev_login.production_guard",
    "NODE_ENV production -> 403"
  );

  const adminAuthSrc = readFileSync("site/src/lib/adminAuth.ts", "utf8");
  check(
    adminAuthSrc.includes('allowDevBypass && process.env.NODE_ENV !== "production"'),
    "demo.dev_bypass.production_guard",
    "bypass disabled in production"
  );

  /* ---------------- 6. Production env documentation ---------------- */
  const envExample = readFileSync(".env.example", "utf8");
  const onboarding = readFileSync("docs/ONBOARDING.md", "utf8");

  for (const key of ["RESEND_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SESSION_SECRET"]) {
    check(envExample.includes(key), `env.example.${key}`, "documented");
    check(onboarding.includes(key), `docs.onboarding.${key}`, "documented");
  }

  const localEnv = readFileSync("site/.env.local", "utf8");
  const isSet = (key) => new RegExp(`^${key}=.+`, "m").test(localEnv);
  check(isSet("RESEND_API_KEY"), "env.local.RESEND_API_KEY", "set");
  check(isSet("SUPABASE_SERVICE_ROLE_KEY"), "env.local.SUPABASE_SERVICE_ROLE_KEY", "set");

  const sessionSecretSet = isSet("SESSION_SECRET");
  record(
    sessionSecretSet ? "PASS" : "WARN",
    "env.local.SESSION_SECRET",
    sessionSecretSet
      ? "set (HMAC-peppered session hashes)"
      : "unset locally (legacy SHA-256 fallback; set it in production)"
  );

  const fallbackEmail = /^ADMIN_FALLBACK_EMAIL=(.*)$/m.exec(localEnv)?.[1]?.trim() || "";
  const fallbackTenant = /^ADMIN_FALLBACK_TENANT=(.*)$/m.exec(localEnv)?.[1]?.trim() || "";
  check(
    !fallbackEmail && !fallbackTenant,
    "env.local.dev_bypass_disabled",
    `email=${fallbackEmail ? "set" : "empty"} tenant=${fallbackTenant ? "set" : "empty"}`
  );
} catch (error) {
  fail("suite.unhandled", error?.stack || String(error));
} finally {
  if (challengeId) {
    try {
      await sb(`admin_otp_challenges?id=eq.${challengeId}`, { method: "DELETE" });
    } catch {
      /* best effort */
    }
  }
  await clearRateLimits();
}

/* ------------------------------------------------------------------ */
/* Summary                                                            */
/* ------------------------------------------------------------------ */
const counts = results.reduce((acc, item) => {
  acc[item.status] = (acc[item.status] || 0) + 1;
  return acc;
}, {});

console.log("\n================ SUMMARY ================");
console.log(
  `PASS ${counts.PASS || 0}   FAIL ${failures}   WARN ${warnings}   (total ${results.length})`
);
if (warnings > 0) {
  console.log("\nWarnings:");
  for (const item of results.filter((entry) => entry.status === "WARN")) {
    console.log(`  - ${item.name}: ${item.detail}`);
  }
}
if (failures > 0) {
  console.log("\nFailures:");
  for (const item of results.filter((entry) => entry.status === "FAIL")) {
    console.log(`  - ${item.name}: ${item.detail}`);
  }
}

console.log("\n================ PRODUCTION SECRETS ================");
console.log("  RESEND_API_KEY              -> set in Vercel; sender domain verified");
console.log("  SUPABASE_SERVICE_ROLE_KEY   -> set in Vercel; server-only (never NEXT_PUBLIC_*)");
console.log("  SESSION_SECRET              -> set in Vercel (32+ random bytes); optional locally");
console.log("  ADMIN_FALLBACK_*            -> must be empty in production");
console.log("  SESSION_SECRET rotation invalidates all existing admin sessions.");

process.exit(failures > 0 ? 1 : 0);
