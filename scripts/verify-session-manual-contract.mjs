#!/usr/bin/env node
/**
 * Session probe latency + manual booking contract verification.
 *
 * Covers:
 *   - GET /api/admin/auth/session: unauthenticated 200 (no DB), valid <50ms
 *     after login (pre-warmed cache) and warm <50ms, Cache-Control: no-store.
 *   - POST /api/admin/bookings/manual with
 *     { tenant_id, client_name, client_phone, client_email, service_name,
 *       scheduled_at, duration_min, notes }.
 *   - tenant-scoped pricing from the tenant's own active services catalog.
 *   - cross-tenant / unknown service rejection.
 *   - logout evicts the cached session.
 *
 * Dev-only: creates a session via /api/admin/dev-login. Run from the repo root
 * with the Next dev server on :3000:
 *
 *   node scripts/verify-session-manual-contract.mjs
 */

import { readFileSync } from "node:fs";
import { createHash, createHmac } from "node:crypto";

const BASE = (process.env.ADMIN_BASE || "http://localhost:3000").replace(/\/+$/, "");

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
const SUPABASE_URL = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
const SESSION_SECRET = (env.SESSION_SECRET || "").trim();

function hashToken(token) {
  return SESSION_SECRET
    ? createHmac("sha256", SESSION_SECRET).update(token).digest("hex")
    : createHash("sha256").update(token).digest("hex");
}

let failures = 0;
function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

async function timed(fn) {
  const start = performance.now();
  const value = await fn();
  return { value, ms: performance.now() - start };
}

function cookieFrom(res) {
  const raw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") || ""];
  for (const cookie of raw) {
    const match = /admin_session=([^;]+)/.exec(cookie);
    if (match) return match[1];
  }
  return null;
}

async function sb(path, { method = "GET", body } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

let sessionToken = null;
let bookingRef = null;

try {
  // Warm up route compilation.
  await fetch(`${BASE}/api/admin/auth/session`).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 300));

  /* 1. Unauthenticated: 200 + no DB work. */
  const unauthTimes = [];
  let unauthStatus = 0;
  let unauthBody = null;
  for (let i = 0; i < 10; i++) {
    const { value, ms } = await timed(() => fetch(`${BASE}/api/admin/auth/session`));
    unauthStatus = value.status;
    unauthBody = await value.json();
    unauthTimes.push(ms);
  }
  const unauthAvg = unauthTimes.reduce((a, b) => a + b, 0) / unauthTimes.length;
  check(
    "session.unauth.status_body",
    unauthStatus === 200 && unauthBody?.authenticated === false,
    `HTTP ${unauthStatus} ${JSON.stringify(unauthBody)}`
  );
  check(
    "session.unauth.fast",
    unauthAvg < 50,
    `avg=${unauthAvg.toFixed(1)}ms max=${Math.max(...unauthTimes).toFixed(1)}ms`
  );

  /* 2. Authenticate (dev-only). */
  const loginRes = await fetch(`${BASE}/api/admin/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "niwache12@gmail.com" }),
  });
  sessionToken = cookieFrom(loginRes);
  const loginBody = await loginRes.json();
  check(
    "session.login",
    loginRes.status === 200 && loginBody?.tenant_id === "gangina",
    JSON.stringify(loginBody)
  );
  check("session.cookie", Boolean(sessionToken));

  const cookieHeader = { Cookie: `admin_session=${sessionToken}` };

  /* 3. First valid probe immediately after login (cache pre-warmed). */
  const first = await timed(() =>
    fetch(`${BASE}/api/admin/auth/session`, { headers: cookieHeader })
  );
  const firstBody = await first.value.json();
  check(
    "session.valid.body",
    first.value.status === 200 &&
      firstBody?.authenticated === true &&
      firstBody?.tenant_id === "gangina" &&
      (firstBody?.scope === "tenant" || firstBody?.scope === "platform"),
    JSON.stringify(firstBody)
  );
  check(
    "session.valid.first_after_login",
    first.ms < 50,
    `${first.ms.toFixed(1)}ms`
  );

  /* 4. Warm valid probes. */
  const warmTimes = [];
  for (let i = 0; i < 10; i++) {
    const { value, ms } = await timed(() =>
      fetch(`${BASE}/api/admin/auth/session`, { headers: cookieHeader })
    );
    await value.json();
    warmTimes.push(ms);
  }
  const warmAvg = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;
  check(
    "session.valid.warm_fast",
    warmAvg < 50,
    `avg=${warmAvg.toFixed(1)}ms max=${Math.max(...warmTimes).toFixed(1)}ms`
  );

  const headersRes = await fetch(`${BASE}/api/admin/auth/session`, { headers: cookieHeader });
  check(
    "session.no_store",
    /no-store/i.test(headersRes.headers.get("cache-control") || ""),
    headersRes.headers.get("cache-control") || "missing"
  );
  await headersRes.json();

  /* 5. Manual booking: scheduled_at + duration_min contract. */
  const daysAhead = 40 + Math.floor(Math.random() * 10);
  const minuteOffset = Math.floor(Math.random() * 60);
  const scheduledAt = new Date(
    Date.now() + daysAhead * 86400_000 + minuteOffset * 60_000
  ).toISOString();

  const manualBody = {
    tenant_id: "gangina",
    client_name: "VERIFY Contract",
    client_phone: "+47000000000",
    client_email: "delivered@resend.dev",
    service_name: "Single Gem",
    scheduled_at: scheduledAt,
    duration_min: 25,
    notes: "session/manual contract verification",
  };
  const manual = await fetch(`${BASE}/api/admin/bookings/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cookieHeader },
    body: JSON.stringify(manualBody),
  });
  const manualJson = await manual.json();
  bookingRef = manualJson?.booking?.ref || null;
  const durationSeconds =
    manualJson?.booking?.end_utc && manualJson?.booking?.start_utc
      ? manualJson.booking.end_utc - manualJson.booking.start_utc
      : null;

  check(
    "manual.contract.status",
    manual.status === 200 && manualJson?.success === true,
    `HTTP ${manual.status}`
  );
  check(
    "manual.contract.service_name",
    manualJson?.booking?.service_summary === "Single Gem",
    manualJson?.booking?.service_summary
  );
  check(
    "manual.contract.tenant_price",
    manualJson?.booking?.tenant_id === "gangina" && manualJson?.booking?.price_nok === 350,
    `tenant=${manualJson?.booking?.tenant_id} price=${manualJson?.booking?.price_nok}`
  );
  check(
    "manual.contract.duration",
    manualJson?.duration_min === 25 && durationSeconds === 25 * 60,
    `duration_min=${manualJson?.duration_min} seconds=${durationSeconds}`
  );
  check(
    "manual.contract.scheduled_at",
    typeof manualJson?.scheduled_at === "string" &&
      Math.abs(
        new Date(manualJson.scheduled_at).getTime() - new Date(scheduledAt).getTime()
      ) < 2000,
    `${manualJson?.scheduled_at} vs ${scheduledAt}`
  );
  check(
    "manual.contract.client_fields",
    manualJson?.booking?.customer_name === "VERIFY Contract" &&
      manualJson?.booking?.customer_phone === "+47000000000" &&
      manualJson?.booking?.customer_email === "delivered@resend.dev",
    JSON.stringify({
      name: manualJson?.booking?.customer_name,
      phone: manualJson?.booking?.customer_phone,
      email: manualJson?.booking?.customer_email,
    })
  );

  /* 6. Tenant-scoped service catalog. */
  const crossTenant = await fetch(`${BASE}/api/admin/bookings/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cookieHeader },
    body: JSON.stringify({
      ...manualBody,
      client_name: "VERIFY Cross Tenant",
      service_name: "Signature Treatment", // noire's service
      scheduled_at: new Date(Date.now() + 46 * 86400_000).toISOString(),
    }),
  });
  const crossJson = await crossTenant.json();
  check(
    "manual.tenant_scoped_service",
    crossTenant.status === 400 && crossJson?.error === "invalid_service",
    `HTTP ${crossTenant.status} ${JSON.stringify(crossJson)}`
  );

  const unknownService = await fetch(`${BASE}/api/admin/bookings/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cookieHeader },
    body: JSON.stringify({
      ...manualBody,
      client_name: "VERIFY Unknown Service",
      service_name: "Does Not Exist",
      scheduled_at: new Date(Date.now() + 47 * 86400_000).toISOString(),
    }),
  });
  const unknownJson = await unknownService.json();
  check(
    "manual.unknown_service_rejected",
    unknownService.status === 400 && unknownJson?.error === "invalid_service",
    `HTTP ${unknownService.status}`
  );

  /* 7. Logout evicts the cached session. */
  const logout = await fetch(`${BASE}/api/admin/auth/logout`, {
    method: "POST",
    headers: cookieHeader,
  });
  check("session.logout", logout.status === 200, `HTTP ${logout.status}`);
  const afterLogout = await fetch(`${BASE}/api/admin/auth/session`, { headers: cookieHeader });
  const afterLogoutBody = await afterLogout.json();
  check(
    "session.logout.evicted",
    afterLogoutBody?.authenticated === false,
    JSON.stringify(afterLogoutBody)
  );
} catch (err) {
  check("suite.unhandled", false, err?.stack || String(err));
} finally {
  if (bookingRef) {
    await sb(`admin_events?booking_ref=eq.${encodeURIComponent(bookingRef)}`, {
      method: "DELETE",
    }).catch(() => {});
    await sb(`bookings?ref=eq.${encodeURIComponent(bookingRef)}`, { method: "DELETE" }).catch(() => {});
    console.log(`CLEANUP  booking ${bookingRef} deleted`);
  }
  if (sessionToken) {
    await sb(`admin_sessions?token_hash=eq.${hashToken(sessionToken)}`, {
      method: "DELETE",
    }).catch(() => {});
    console.log("CLEANUP  dev-login session deleted");
  }
}

console.log(`\nSUMMARY: ${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
