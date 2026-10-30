#!/usr/bin/env node
/**
 * verify-admin-backend.mjs
 *
 * End-to-end verification of the Client Admin backend:
 *   auth (OTP/session/logout/rate-limit), bookings + triage, hours,
 *   blackouts, settings, audit trail, and multi-tenant isolation.
 *
 * Prerequisites:
 *   - The Next.js dev server is running (default http://localhost:3000).
 *   - site/.env.local contains the Supabase URL + service/anon keys.
 *
 * Usage:
 *   node scripts/verify-admin-backend.mjs
 *   ADMIN_API_BASE=http://localhost:3100 node scripts/verify-admin-backend.mjs
 *
 * The script creates isolated test rows (a temporary tenant admin, bookings,
 * a blackout, OTP challenges and sessions) and removes them afterwards. It
 * snapshots and restores noire's hours/settings. It never prints secrets.
 */

import { readFileSync } from "node:fs";
import { createHash, createHmac, randomBytes } from "node:crypto";

/* ------------------------------------------------------------------ */
/* Environment                                                        */
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
    /* file may not exist */
  }
}

const API_BASE = (process.env.ADMIN_API_BASE || "http://localhost:3000").replace(/\/+$/, "");
const SUPABASE_URL = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in site/.env.local");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */
const NOIRE = "noire";
const GANGINA = "gangina";
const NOIRE_OWNER = "abdisalamadam8@gmail.com";
const ISO_EMAIL = "verify-isolation+noire@example.com";
const OTP_CODE = "482913";
const RESEND_TEST = "delivered@resend.dev";
const TZ = "Europe/Oslo";

/* ------------------------------------------------------------------ */
/* Result collection                                                  */
/* ------------------------------------------------------------------ */
let failures = 0;
let warnings = 0;
const results = [];

function record(status, name, detail = "") {
  results.push({ status, name, detail });
  if (status === "FAIL") failures++;
  if (status === "WARN") warnings++;
  const suffix = detail ? `  [${detail}]` : "";
  console.log(`${status.padEnd(4)} ${name}${suffix}`);
}
function pass(name, detail) {
  record("PASS", name, detail);
}
function fail(name, detail) {
  record("FAIL", name, detail);
}
function warn(name, detail) {
  record("WARN", name, detail);
}
function check(condition, name, detail) {
  if (condition) pass(name, detail);
  else fail(name, detail);
  return Boolean(condition);
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                       */
/* ------------------------------------------------------------------ */
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

// Mirrors site/src/lib/adminAuth.ts: SESSION_SECRET peppers the stored hash.
const SESSION_SECRET = (env.SESSION_SECRET || "").trim();
function hashSessionToken(token) {
  return SESSION_SECRET
    ? createHmac("sha256", SESSION_SECRET).update(token).digest("hex")
    : sha256(token);
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function sb(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await parseBody(res) };
}

async function anon(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Accept: "application/json",
    },
  });
  return { status: res.status, json: await parseBody(res) };
}

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const raw = headers.get("set-cookie");
  return raw ? raw.split(/,(?=[^;,]+=)/) : [];
}

function cookieValue(headers, name) {
  for (const cookie of getSetCookies(headers)) {
    const pair = cookie.split(";")[0];
    const index = pair.indexOf("=");
    if (index > 0 && pair.slice(0, index).trim() === name) {
      return pair.slice(index + 1).trim();
    }
  }
  return null;
}

function rawSetCookie(headers, name) {
  return (
    getSetCookies(headers).find((cookie) =>
      cookie.split(";")[0].trim().startsWith(`${name}=`)
    ) || ""
  );
}

async function api(path, { method = "GET", body, cookie, headers = {} } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const json = await parseBody(res);
  return {
    status: res.status,
    json,
    headers: res.headers,
    sessionToken: cookieValue(res.headers, "admin_session"),
    setCookie: rawSetCookie(res.headers, "admin_session"),
  };
}

/* ------------------------------------------------------------------ */
/* Time helpers (mirror site/src/lib/bookingRules.ts)                 */
/* ------------------------------------------------------------------ */
function tzParts(epochSeconds, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const map = {};
  for (const part of formatter.formatToParts(new Date(epochSeconds * 1000))) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    weekday: weekdays.indexOf(map.weekday),
  };
}

function localDate(epochSeconds, timeZone) {
  const parts = tzParts(epochSeconds, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function epochFromZoned(dateStr, timeStr, timeZone) {
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;

  const target = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0
  );

  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });

  for (let i = 0; i < 3; i++) {
    const values = {};
    for (const part of formatter.formatToParts(new Date(guess))) {
      if (part.type !== "literal") values[part.type] = Number(part.value);
    }
    const localAsUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second || 0
    );
    const diff = target - localAsUtc;
    if (diff === 0) break;
    guess += diff;
  }
  return Math.floor(guess / 1000);
}

function addDays(epochSeconds, days) {
  return epochSeconds + days * 86400;
}

function findNextWeekday(epochSeconds, weekday, timeZone) {
  let cursor = epochSeconds;
  for (let i = 0; i < 14; i++) {
    if (tzParts(cursor, timeZone).weekday === weekday) return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

/* ------------------------------------------------------------------ */
/* Cleanup trackers                                                   */
/* ------------------------------------------------------------------ */
const cleanup = {
  bookingRefs: new Set(),
  blackoutIds: new Set(),
  challengeIds: new Set(),
  sessionHashes: new Set(),
  tenantAdminEmail: null,
  hoursSnapshot: null,
  tenantSnapshot: null,
};

async function clearRateLimits() {
  try {
    await sb("auth_rate_events?id=gt.0", { method: "DELETE" });
  } catch {
    /* best effort */
  }
}

async function cleanupAll() {
  for (const ref of cleanup.bookingRefs) {
    try {
      await sb(`admin_events?booking_ref=eq.${encodeURIComponent(ref)}`, { method: "DELETE" });
      await sb(`bookings?ref=eq.${encodeURIComponent(ref)}`, { method: "DELETE" });
    } catch {
      /* best effort */
    }
  }
  for (const id of cleanup.blackoutIds) {
    try {
      await sb(`blackouts?id=eq.${id}`, { method: "DELETE" });
    } catch {
      /* best effort */
    }
  }
  for (const id of cleanup.challengeIds) {
    try {
      await sb(`admin_otp_challenges?id=eq.${id}`, { method: "DELETE" });
    } catch {
      /* best effort */
    }
  }
  for (const hash of cleanup.sessionHashes) {
    try {
      await sb(`admin_sessions?token_hash=eq.${hash}`, { method: "DELETE" });
    } catch {
      /* best effort */
    }
  }
  if (cleanup.tenantAdminEmail) {
    try {
      await sb(
        `tenant_admins?tenant_id=eq.${NOIRE}&email=eq.${encodeURIComponent(cleanup.tenantAdminEmail)}`,
        { method: "DELETE" }
      );
    } catch {
      /* best effort */
    }
  }
  if (cleanup.hoursSnapshot) {
    try {
      await sb(`hours?tenant_id=eq.${NOIRE}`, { method: "DELETE" });
      if (cleanup.hoursSnapshot.length > 0) {
        await sb("hours", {
          method: "POST",
          body: cleanup.hoursSnapshot,
          prefer: "return=minimal",
        });
      }
    } catch {
      /* best effort */
    }
  }
  if (cleanup.tenantSnapshot) {
    const { name, contact_email, phone, whatsapp, address, org_number, slot_step_min } =
      cleanup.tenantSnapshot;
    try {
      await sb(`tenants?id=eq.${NOIRE}`, {
        method: "PATCH",
        body: { name, contact_email, phone, whatsapp, address, org_number, slot_step_min },
        prefer: "return=minimal",
      });
    } catch {
      /* best effort */
    }
  }
  await clearRateLimits();
}

/* ------------------------------------------------------------------ */
/* Planned test data                                                  */
/* ------------------------------------------------------------------ */
const nowSec = Math.floor(Date.now() / 1000);
const dateA = localDate(addDays(nowSec, 45), TZ);
const dateB = localDate(addDays(nowSec, 46), TZ);
const dateC = localDate(addDays(nowSec, 47), TZ);
const mondayDate = localDate(findNextWeekday(addDays(nowSec, 40), 0, TZ), TZ);
const mondayEpoch = epochFromZoned(mondayDate, "14:30", TZ);
const t3Epoch = epochFromZoned(dateC, "11:00", TZ);

/* Snapshot noire so the suite can always restore it. */
const [hoursSnap, tenantSnap] = await Promise.all([
  sb(`hours?tenant_id=eq.${NOIRE}&select=tenant_id,weekday,open_min,close_min&order=weekday,open_min`),
  sb(`tenants?id=eq.${NOIRE}&select=*`),
]);
cleanup.hoursSnapshot = Array.isArray(hoursSnap.json) ? hoursSnap.json : null;
cleanup.tenantSnapshot = Array.isArray(tenantSnap.json) ? tenantSnap.json[0] : null;

/* ------------------------------------------------------------------ */
/* Suite                                                              */
/* ------------------------------------------------------------------ */
try {
  /* ---------------- server ---------------- */
  let ready = null;
  try {
    ready = await api("/api/admin/auth/session");
  } catch {
    ready = null;
  }
  if (!ready) {
    fail("server.reachable", `cannot reach ${API_BASE}`);
    throw new Error(`cannot reach ${API_BASE}`);
  }
  pass("server.reachable", `${API_BASE} -> HTTP ${ready.status}`);

  /* ---------------- auth ---------------- */
  check(
    ready.status === 200 && ready.json?.authenticated === false,
    "auth.session.anonymous",
    `HTTP ${ready.status}`
  );

  const unauthBookings = await api(`/api/admin/bookings?tenant_id=${NOIRE}`);
  check(
    unauthBookings.status === 401 && !("bookings" in (unauthBookings.json || {})),
    "auth.unauthorized.bookings",
    `HTTP ${unauthBookings.status}`
  );

  /* rate limiter RPC */
  await clearRateLimits();
  const rlKey = `verify-suite:${Date.now()}`;
  const rl = [];
  for (let i = 0; i < 3; i++) {
    const r = await sb("rpc/consume_rate_limit", {
      method: "POST",
      body: { p_key: rlKey, p_limit: 2, p_window_seconds: 60 },
    });
    rl.push(r.status === 200 ? r.json : null);
  }
  check(
    rl[0] === true && rl[1] === true && rl[2] === false,
    "auth.rate_limit.rpc",
    JSON.stringify(rl)
  );
  await sb(`auth_rate_events?key=eq.${encodeURIComponent(rlKey)}`, { method: "DELETE" });

  /* uniform response for unknown addresses */
  const unknownEmail = `verify-unknown-${Date.now()}@example.com`;
  const unknownRes = await api("/api/admin/auth/send-otp", {
    method: "POST",
    body: { email: unknownEmail, tenant_id: NOIRE, scope: "tenant" },
  });
  const unknownChallenge = await sb(
    `admin_otp_challenges?email=eq.${encodeURIComponent(unknownEmail)}&select=id`
  );
  check(
    unknownRes.status === 200 &&
      unknownRes.json?.success === true &&
      Array.isArray(unknownChallenge.json) &&
      unknownChallenge.json.length === 0,
    "auth.send_otp.uniform_unknown",
    `HTTP ${unknownRes.status}`
  );

  /* no owner-email leak when only tenant_id is posted */
  const noEmailRes = await api("/api/admin/auth/send-otp", {
    method: "POST",
    body: { tenant_id: NOIRE, scope: "tenant" },
  });
  const leakedEmail = String(noEmailRes.json?.email || "");
  check(
    noEmailRes.status === 200 && leakedEmail !== NOIRE_OWNER && !leakedEmail.includes("@"),
    "auth.send_otp.no_owner_leak",
    `email=${JSON.stringify(leakedEmail)}`
  );

  /* authorized dispatch creates a real challenge row */
  await clearRateLimits();
  const authOtp = await api("/api/admin/auth/send-otp", {
    method: "POST",
    body: { email: NOIRE_OWNER, tenant_id: NOIRE, scope: "tenant" },
  });
  const authChallengeId = authOtp.json?.challengeId;
  const authChallengeRow = await sb(
    `admin_otp_challenges?id=eq.${authChallengeId}&select=id,email`
  );
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  check(
    authOtp.status === 200 &&
      authOtp.json?.success === true &&
      uuidRe.test(String(authChallengeId)) &&
      Array.isArray(authChallengeRow.json) &&
      authChallengeRow.json.length === 1,
    "auth.send_otp.authorized",
    `HTTP ${authOtp.status}`
  );
  if (authChallengeRow.json?.[0]?.id) cleanup.challengeIds.add(authChallengeRow.json[0].id);

  /* IP limiter on the route itself (no emails are sent for unknown addresses) */
  await clearRateLimits();
  let lastStatus = 0;
  let lastBody = null;
  for (let i = 0; i < 11; i++) {
    const r = await api("/api/admin/auth/send-otp", {
      method: "POST",
      body: {
        email: `verify-bogus-${Date.now()}-${i}@example.com`,
        tenant_id: NOIRE,
        scope: "tenant",
      },
    });
    lastStatus = r.status;
    lastBody = r.json;
  }
  check(
    lastStatus === 429 && lastBody?.error === "rate_limited",
    "auth.send_otp.ip_rate_limit",
    `HTTP ${lastStatus}`
  );
  await clearRateLimits();

  /* temporary non-platform tenant admin for isolation tests */
  const isoAdmin = await sb("tenant_admins", {
    method: "POST",
    body: { tenant_id: NOIRE, email: ISO_EMAIL, role: "admin", active: true },
    prefer: "resolution=merge-duplicates,return=representation",
  });
  cleanup.tenantAdminEmail = ISO_EMAIL;
  check(
    isoAdmin.status === 200 || isoAdmin.status === 201,
    "auth.isolation_admin.seed",
    `HTTP ${isoAdmin.status}`
  );

  /* OTP verify -> HttpOnly session cookie */
  await clearRateLimits();
  const isoChallenge = await sb("admin_otp_challenges", {
    method: "POST",
    body: {
      email: ISO_EMAIL,
      code_hash: sha256(OTP_CODE),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    },
    prefer: "return=representation",
  });
  const isoChallengeId = isoChallenge.json?.[0]?.id;
  if (isoChallengeId) cleanup.challengeIds.add(isoChallengeId);

  const isoVerify = await api("/api/admin/auth/verify-otp", {
    method: "POST",
    body: { email: ISO_EMAIL, code: OTP_CODE, challengeId: isoChallengeId, tenant_id: NOIRE },
  });
  check(
    isoVerify.status === 200 &&
      isoVerify.json?.success === true &&
      isoVerify.json?.tenant_id === NOIRE &&
      isoVerify.json?.scope === "tenant",
    "auth.verify_otp.tenant",
    `HTTP ${isoVerify.status}`
  );
  check(
    Boolean(isoVerify.sessionToken) &&
      /HttpOnly/i.test(isoVerify.setCookie) &&
      /SameSite=Strict/i.test(isoVerify.setCookie) &&
      /Max-Age=43200/i.test(isoVerify.setCookie) &&
      /Path=\//i.test(isoVerify.setCookie),
    "auth.cookie.flags",
    isoVerify.setCookie
  );
  if (isoVerify.sessionToken) cleanup.sessionHashes.add(hashSessionToken(isoVerify.sessionToken));

  let tenantCookie = isoVerify.sessionToken ? `admin_session=${isoVerify.sessionToken}` : "";

  const tenantSession = await api("/api/admin/auth/session", { cookie: tenantCookie });
  check(
    tenantSession.status === 200 &&
      tenantSession.json?.authenticated === true &&
      tenantSession.json?.email === ISO_EMAIL &&
      tenantSession.json?.tenant_id === NOIRE &&
      tenantSession.json?.scope === "tenant",
    "auth.session.tenant",
    `HTTP ${tenantSession.status}`
  );

  /* wrong code */
  const wrongChallenge = await sb("admin_otp_challenges", {
    method: "POST",
    body: {
      email: ISO_EMAIL,
      code_hash: sha256("000000"),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    },
    prefer: "return=representation",
  });
  const wrongChallengeId = wrongChallenge.json?.[0]?.id;
  if (wrongChallengeId) cleanup.challengeIds.add(wrongChallengeId);
  const wrongVerify = await api("/api/admin/auth/verify-otp", {
    method: "POST",
    body: { email: ISO_EMAIL, code: "999999", challengeId: wrongChallengeId, tenant_id: NOIRE },
  });
  check(wrongVerify.status === 401, "auth.verify_otp.wrong_code", `HTTP ${wrongVerify.status}`);

  /* logout revokes the session */
  const logout = await api("/api/admin/auth/logout", { method: "POST", cookie: tenantCookie });
  check(
    logout.status === 200 && logout.json?.success === true && /Max-Age=0/i.test(logout.setCookie),
    "auth.logout",
    `HTTP ${logout.status}`
  );
  const afterLogout = await api("/api/admin/auth/session", { cookie: tenantCookie });
  check(
    afterLogout.status === 200 && afterLogout.json?.authenticated === false,
    "auth.logout.revoked",
    `HTTP ${afterLogout.status}`
  );

  /* fresh tenant session for the rest of the suite */
  const rawSession = randomBytes(32).toString("base64url");
  const rawHash = hashSessionToken(rawSession);
  const sessionInsert = await sb("admin_sessions", {
    method: "POST",
    body: {
      token_hash: rawHash,
      email: ISO_EMAIL,
      tenant_id: NOIRE,
      scope: "tenant",
      expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    },
    prefer: "return=representation",
  });
  cleanup.sessionHashes.add(rawHash);
  tenantCookie = `admin_session=${rawSession}`;
  check(
    sessionInsert.status === 200 || sessionInsert.status === 201,
    "auth.session.direct_seed",
    `HTTP ${sessionInsert.status}`
  );

  /* platform scope with a NULL tenant_id (migration 20261030120000) */
  await clearRateLimits();
  const platChallenge = await sb("admin_otp_challenges", {
    method: "POST",
    body: {
      email: NOIRE_OWNER,
      code_hash: sha256(OTP_CODE),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    },
    prefer: "return=representation",
  });
  const platId = platChallenge.json?.[0]?.id;
  if (platId) cleanup.challengeIds.add(platId);
  const platVerify = await api("/api/admin/auth/verify-otp", {
    method: "POST",
    body: { email: NOIRE_OWNER, code: OTP_CODE, challengeId: platId, scope: "platform" },
  });
  check(
    platVerify.status === 200 &&
      platVerify.json?.scope === "platform" &&
      platVerify.json?.tenant_id === null,
    "auth.verify_otp.platform",
    `HTTP ${platVerify.status}`
  );
  if (platVerify.sessionToken) {
    const platHash = hashSessionToken(platVerify.sessionToken);
    cleanup.sessionHashes.add(platHash);
    const platRow = await sb(
      `admin_sessions?token_hash=eq.${platHash}&select=tenant_id,scope`
    );
    check(
      Array.isArray(platRow.json) &&
        platRow.json[0]?.tenant_id === null &&
        platRow.json[0]?.scope === "platform",
      "auth.platform_session.nullable_tenant",
      JSON.stringify(platRow.json)
    );
    await api("/api/admin/auth/logout", {
      method: "POST",
      cookie: `admin_session=${platVerify.sessionToken}`,
    });
  }

  /* ---------------- isolation ---------------- */
  const crossBookings = await api(`/api/admin/bookings?tenant_id=${GANGINA}`, {
    cookie: tenantCookie,
  });
  check(
    crossBookings.status === 403 && !("bookings" in (crossBookings.json || {})),
    "isolation.bookings.cross_tenant",
    `HTTP ${crossBookings.status}`
  );

  for (const [name, path] of [
    ["hours", `/api/admin/hours?tenant_id=${GANGINA}`],
    ["settings", `/api/admin/settings?tenant_id=${GANGINA}`],
    ["audit", `/api/admin/audit?tenant_id=${GANGINA}`],
    ["blackouts", `/api/admin/blackouts?tenant_id=${GANGINA}`],
  ]) {
    const r = await api(path, { cookie: tenantCookie });
    check(r.status === 403, `isolation.${name}.cross_tenant`, `HTTP ${r.status}`);
  }

  const crossHoursPost = await api("/api/admin/hours", {
    method: "POST",
    cookie: tenantCookie,
    body: { tenant_id: GANGINA, shifts: { Monday: { open: true, start: "09:00", end: "10:00" } } },
  });
  check(crossHoursPost.status === 403, "isolation.hours.post_cross_tenant", `HTTP ${crossHoursPost.status}`);

  const crossSettingsPost = await api("/api/admin/settings", {
    method: "POST",
    cookie: tenantCookie,
    body: { tenant_id: GANGINA, name: "VERIFY HACK" },
  });
  check(
    crossSettingsPost.status === 403,
    "isolation.settings.post_cross_tenant",
    `HTTP ${crossSettingsPost.status}`
  );

  const crossManual = await api("/api/admin/bookings/manual", {
    method: "POST",
    cookie: tenantCookie,
    body: {
      tenant_id: GANGINA,
      client_name: "VERIFY Cross",
      client_phone: "+4700000099",
      date: dateA,
      time: "11:00",
    },
  });
  check(crossManual.status === 403, "isolation.bookings.manual_cross_tenant", `HTTP ${crossManual.status}`);

  /* temp gangina row for mutation-boundary checks */
  const gRef = `GAN-VERIFY-${Date.now()}`;
  const gStart = addDays(nowSec, 44) + 9 * 3600;
  const gInsert = await sb("bookings", {
    method: "POST",
    body: {
      ref: gRef,
      tenant_id: GANGINA,
      service_id: 5,
      start_utc: gStart,
      end_utc: gStart + 1200,
      block_end_utc: gStart + 1800,
      status: "confirmed",
      customer_name: "VERIFY Gangina",
      customer_email: RESEND_TEST,
      customer_phone: "+47000000001",
      notes: "verify-suite",
      price_nok: 350,
      deposit_nok: 0,
      consent_at: nowSec,
      privacy_version: "verify",
      action_token_hash: sha256("verify-action"),
      manage_token_hash: sha256("verify-manage"),
    },
    prefer: "return=representation",
  });
  cleanup.bookingRefs.add(gRef);
  check(
    gInsert.status === 200 || gInsert.status === 201,
    "isolation.gangina_fixture",
    `HTTP ${gInsert.status}`
  );

  const crossStatus = await api("/api/admin/bookings/status", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: gRef, status: "cancelled" },
  });
  check(crossStatus.status === 403, "isolation.bookings.status_cross_tenant", `HTTP ${crossStatus.status}`);

  const crossReschedule = await api("/api/admin/bookings/reschedule", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: gRef, date: dateA, time: "11:00" },
  });
  check(
    crossReschedule.status === 403,
    "isolation.bookings.reschedule_cross_tenant",
    `HTTP ${crossReschedule.status}`
  );

  const crossResend = await api("/api/admin/bookings/resend", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: gRef },
  });
  check(crossResend.status === 403, "isolation.bookings.resend_cross_tenant", `HTTP ${crossResend.status}`);

  const ganginaRow = await sb(`bookings?ref=eq.${encodeURIComponent(gRef)}&select=status`);
  check(
    ganginaRow.json?.[0]?.status === "confirmed",
    "isolation.bookings.cross_tenant_not_mutated",
    JSON.stringify(ganginaRow.json)
  );

  const gBlackoutStart = addDays(nowSec, 44) + 12 * 3600;
  const gBlackout = await sb("blackouts", {
    method: "POST",
    body: {
      tenant_id: GANGINA,
      start_utc: gBlackoutStart,
      end_utc: gBlackoutStart + 3600,
      reason: "VERIFY cross",
    },
    prefer: "return=representation",
  });
  const gBlackoutId = gBlackout.json?.[0]?.id;
  if (gBlackoutId) cleanup.blackoutIds.add(gBlackoutId);
  const crossBlackoutDelete = await api(`/api/admin/blackouts?id=${gBlackoutId}`, {
    method: "DELETE",
    cookie: tenantCookie,
  });
  check(
    crossBlackoutDelete.status === 403,
    "isolation.blackouts.delete_cross_tenant",
    `HTTP ${crossBlackoutDelete.status}`
  );

  /* anonymous RLS checks */
  for (const table of ["bookings", "admin_sessions", "tenant_admins", "admin_events", "auth_rate_events"]) {
    const r = await anon(`${table}?select=*&limit=1`);
    const leaked = r.status === 200 && Array.isArray(r.json) && r.json.length > 0;
    check(!leaked, `isolation.rls.anon_${table}`, `HTTP ${r.status}`);
  }

  const ownerLeak = await anon("tenants?select=id,owner_email&limit=5");
  const leaksOwnerEmail =
    ownerLeak.status === 200 &&
    Array.isArray(ownerLeak.json) &&
    ownerLeak.json.some((row) => row.owner_email);
  if (leaksOwnerEmail) {
    warn(
      "isolation.rls.owner_email",
      "anon can read tenants.owner_email — apply supabase/migrations/20261030130000_harden_tenant_privacy.sql"
    );
  } else {
    pass("isolation.rls.owner_email", `HTTP ${ownerLeak.status}`);
  }

  /* ---------------- hours ---------------- */
  const hoursGet = await api(`/api/admin/hours?tenant_id=${NOIRE}`, { cookie: tenantCookie });
  const originalShifts = hoursGet.json?.shifts;
  const originalInterval = hoursGet.json?.interval_min;
  const originalRows = hoursGet.json?.hours;
  check(
    hoursGet.status === 200 &&
      originalShifts &&
      typeof originalShifts.Monday === "object" &&
      typeof originalInterval === "number" &&
      Array.isArray(originalRows),
    "hours.get",
    `HTTP ${hoursGet.status}`
  );

  const modifiedShifts = structuredClone(originalShifts);
  modifiedShifts.Monday = { open: true, start: "08:30", end: "16:30" };
  modifiedShifts.Tuesday = { open: false, start: "10:00", end: "15:00" };
  const hoursSave = await api("/api/admin/hours", {
    method: "POST",
    cookie: tenantCookie,
    body: { tenant_id: NOIRE, shifts: modifiedShifts, interval_min: 45 },
  });
  check(
    hoursSave.status === 200 &&
      hoursSave.json?.shifts?.Monday?.start === "08:30" &&
      hoursSave.json?.shifts?.Monday?.end === "16:30" &&
      hoursSave.json?.shifts?.Tuesday?.open === false &&
      hoursSave.json?.interval_min === 45,
    "hours.save_shifts",
    `HTTP ${hoursSave.status}`
  );

  const multiRows = [
    { weekday: 0, open_min: 540, close_min: 720 },
    { weekday: 0, open_min: 780, close_min: 1020 },
    ...(originalRows || []).filter((row) => row.weekday !== 0),
  ];
  const hoursMulti = await api("/api/admin/hours", {
    method: "POST",
    cookie: tenantCookie,
    body: { tenant_id: NOIRE, hours: multiRows, slot_step_min: 45 },
  });
  const hoursAfterMulti = await api(`/api/admin/hours?tenant_id=${NOIRE}`, {
    cookie: tenantCookie,
  });
  const mondayRows = (hoursAfterMulti.json?.hours || []).filter((row) => row.weekday === 0);
  check(
    hoursMulti.status === 200 &&
      mondayRows.length === 2 &&
      hoursAfterMulti.json?.shifts?.Monday?.start === "09:00" &&
      hoursAfterMulti.json?.shifts?.Monday?.end === "17:00",
    "hours.multi_interval",
    `Monday rows=${mondayRows.length}`
  );

  const countBefore = (await sb(`hours?tenant_id=eq.${NOIRE}&select=tenant_id`)).json?.length ?? 0;
  const noPayload = await api("/api/admin/hours", {
    method: "POST",
    cookie: tenantCookie,
    body: { tenant_id: NOIRE },
  });
  const countAfter = (await sb(`hours?tenant_id=eq.${NOIRE}&select=tenant_id`)).json?.length ?? 0;
  check(
    noPayload.status === 400 &&
      noPayload.json?.error === "missing_hours" &&
      countAfter === countBefore,
    "hours.missing_payload_no_wipe",
    `HTTP ${noPayload.status}, rows ${countBefore}->${countAfter}`
  );

  const normalizeRows = (rows) =>
    [...(rows || [])]
      .map((row) => ({ weekday: row.weekday, open_min: row.open_min, close_min: row.close_min }))
      .sort((a, b) => a.weekday - b.weekday || a.open_min - b.open_min);

  const hoursRestore = await api("/api/admin/hours", {
    method: "POST",
    cookie: tenantCookie,
    body: { tenant_id: NOIRE, hours: originalRows, slot_step_min: originalInterval },
  });
  const hoursRestored = await api(`/api/admin/hours?tenant_id=${NOIRE}`, {
    cookie: tenantCookie,
  });
  check(
    hoursRestore.status === 200 &&
      JSON.stringify(normalizeRows(hoursRestored.json?.hours)) ===
        JSON.stringify(normalizeRows(originalRows)),
    "hours.restore",
    `HTTP ${hoursRestore.status}`
  );

  /* ---------------- blackouts ---------------- */
  const blackoutsGet = await api(`/api/admin/blackouts?tenant_id=${NOIRE}`, {
    cookie: tenantCookie,
  });
  check(
    blackoutsGet.status === 200 && Array.isArray(blackoutsGet.json?.blackouts),
    "blackouts.get",
    `HTTP ${blackoutsGet.status}`
  );

  const bStart = addDays(nowSec, 44) + 13 * 3600;
  const blackoutCreate = await api("/api/admin/blackouts", {
    method: "POST",
    cookie: tenantCookie,
    body: {
      tenant_id: NOIRE,
      start_utc: bStart,
      end_utc: bStart + 3600,
      reason: "VERIFY blackout",
    },
  });
  const bId = blackoutCreate.json?.blackout?.id;
  if (bId) cleanup.blackoutIds.add(bId);
  check(
    blackoutCreate.status === 201 &&
      Boolean(bId) &&
      blackoutCreate.json?.blackout?.reason === "VERIFY blackout",
    "blackouts.create",
    `HTTP ${blackoutCreate.status}`
  );

  const blackoutsList = await api(`/api/admin/blackouts?tenant_id=${NOIRE}`, {
    cookie: tenantCookie,
  });
  check(
    (blackoutsList.json?.blackouts || []).some((row) => row.id === bId),
    "blackouts.list",
    `id=${bId}`
  );

  const blackoutDelete = await api(`/api/admin/blackouts?id=${bId}`, {
    method: "DELETE",
    cookie: tenantCookie,
  });
  check(
    blackoutDelete.status === 200 && blackoutDelete.json?.success === true,
    "blackouts.delete",
    `HTTP ${blackoutDelete.status}`
  );
  const blackoutsAfter = await api(`/api/admin/blackouts?tenant_id=${NOIRE}`, {
    cookie: tenantCookie,
  });
  check(
    !(blackoutsAfter.json?.blackouts || []).some((row) => row.id === bId),
    "blackouts.deleted",
    `id=${bId}`
  );

  /* ---------------- bookings ---------------- */
  const bookingsGet = await api(`/api/admin/bookings?tenant_id=${NOIRE}`, {
    cookie: tenantCookie,
  });
  const bookingRows = bookingsGet.json?.bookings || [];
  const sortedDesc = bookingRows.every(
    (row, index) => index === 0 || row.start_utc <= bookingRows[index - 1].start_utc
  );
  const hasAliases = bookingRows.every((row) => "email_status" in row);
  const hasFields = bookingRows.every(
    (row) => "start_utc" in row && "price_nok" in row && "customer_name" in row
  );
  check(
    bookingsGet.status === 200 &&
      bookingsGet.json?.tenant?.id === NOIRE &&
      Array.isArray(bookingsGet.json?.bookings) &&
      Array.isArray(bookingsGet.json?.services) &&
      Array.isArray(bookingsGet.json?.hours) &&
      sortedDesc &&
      hasAliases &&
      hasFields,
    "bookings.get",
    `HTTP ${bookingsGet.status}, rows=${bookingRows.length}`
  );

  const manualBody = {
    tenant_id: NOIRE,
    client_name: "VERIFY Manual One",
    client_phone: "+4700000011",
    client_email: RESEND_TEST,
    service_name: "Signature Treatment",
    date: dateA,
    time: "11:00",
  };
  const manual1 = await api("/api/admin/bookings/manual", {
    method: "POST",
    cookie: tenantCookie,
    body: manualBody,
  });
  const ref1 = manual1.json?.booking?.ref;
  if (ref1) cleanup.bookingRefs.add(ref1);
  check(
    manual1.status === 200 &&
      Boolean(ref1) &&
      /^NOI-/.test(String(ref1)) &&
      manual1.json?.booking?.status === "confirmed" &&
      manual1.json?.booking?.price_nok === 950 &&
      manual1.json?.booking?.service_summary === "Signature Treatment" &&
      manual1.json?.booking?.customer_name === "VERIFY Manual One",
    "bookings.manual.portal_contract",
    `HTTP ${manual1.status}, ref=${ref1}`
  );

  const manual2 = await api("/api/admin/bookings/manual", {
    method: "POST",
    cookie: tenantCookie,
    body: { ...manualBody, client_name: "VERIFY Manual Two", client_phone: "+4700000012", date: dateB },
  });
  const ref2 = manual2.json?.booking?.ref;
  if (ref2) cleanup.bookingRefs.add(ref2);

  const manual3 = await api("/api/admin/bookings/manual", {
    method: "POST",
    cookie: tenantCookie,
    body: { ...manualBody, client_name: "VERIFY Manual Three", client_phone: "+4700000013", date: dateC },
  });
  const ref3 = manual3.json?.booking?.ref;
  if (ref3) cleanup.bookingRefs.add(ref3);

  check(
    new Set([ref1, ref2, ref3].filter(Boolean)).size === 3,
    "bookings.manual.unique_refs",
    `${ref1}, ${ref2}, ${ref3}`
  );

  const overlap = await api("/api/admin/bookings/manual", {
    method: "POST",
    cookie: tenantCookie,
    body: { ...manualBody, client_name: "VERIFY Overlap", client_phone: "+4700000014" },
  });
  check(
    overlap.status === 409 && overlap.json?.error === "slot_taken",
    "bookings.manual.overlap",
    `HTTP ${overlap.status}`
  );

  const crossService = await api("/api/admin/bookings/manual", {
    method: "POST",
    cookie: tenantCookie,
    body: {
      tenant_id: NOIRE,
      client_name: "VERIFY Cross Service",
      client_phone: "+4700000015",
      service_id: 5,
      date: dateA,
      time: "15:00",
    },
  });
  check(
    crossService.status === 400 && crossService.json?.error === "invalid_service",
    "bookings.manual.cross_tenant_service",
    `HTTP ${crossService.status}`
  );

  /* status transitions */
  const statusConfirmed = await api("/api/admin/bookings/status", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: ref1, status: "confirmed" },
  });
  check(
    statusConfirmed.status === 200 &&
      statusConfirmed.json?.status === "confirmed" &&
      "email_status" in (statusConfirmed.json?.booking || {}),
    "bookings.status.confirmed",
    `HTTP ${statusConfirmed.status}`
  );
  let dbRow = await sb(`bookings?ref=eq.${encodeURIComponent(ref1)}&select=status`);
  check(dbRow.json?.[0]?.status === "confirmed", "bookings.status.confirmed.persisted", dbRow.json?.[0]?.status);

  const statusDeclined = await api("/api/admin/bookings/status", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: ref1, status: "declined" },
  });
  check(
    statusDeclined.status === 200 && statusDeclined.json?.status === "declined",
    "bookings.status.declined",
    `HTTP ${statusDeclined.status}`
  );
  dbRow = await sb(`bookings?ref=eq.${encodeURIComponent(ref1)}&select=status`);
  check(dbRow.json?.[0]?.status === "declined", "bookings.status.declined.persisted", dbRow.json?.[0]?.status);

  const statusCancelled = await api("/api/admin/bookings/status", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: ref1, status: "cancelled" },
  });
  check(
    statusCancelled.status === 200 && statusCancelled.json?.status === "cancelled",
    "bookings.status.cancelled",
    `HTTP ${statusCancelled.status}`
  );
  dbRow = await sb(`bookings?ref=eq.${encodeURIComponent(ref1)}&select=status`);
  check(dbRow.json?.[0]?.status === "cancelled", "bookings.status.cancelled.persisted", dbRow.json?.[0]?.status);

  const invalidStatus = await api("/api/admin/bookings/status", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: ref1, status: "pending" },
  });
  check(
    invalidStatus.status === 400 && invalidStatus.json?.error === "invalid_payload",
    "bookings.status.invalid",
    `HTTP ${invalidStatus.status}`
  );

  const unknownStatus = await api("/api/admin/bookings/status", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: "NOI-NOPE", status: "confirmed" },
  });
  check(unknownStatus.status === 400, "bookings.status.unknown_ref", `HTTP ${unknownStatus.status}`);

  /* reschedule — split Monday intervals prove the maybeSingle() fix */
  const splitRows = [
    { weekday: 0, open_min: 540, close_min: 720 },
    { weekday: 0, open_min: 780, close_min: 1020 },
    ...(originalRows || []).filter((row) => row.weekday !== 0),
  ];
  await api("/api/admin/hours", {
    method: "POST",
    cookie: tenantCookie,
    body: { tenant_id: NOIRE, hours: splitRows, slot_step_min: 45 },
  });

  const reschedule = await api("/api/admin/bookings/reschedule", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: ref2, date: mondayDate, time: "14:30" },
  });
  const rescheduledRow = await sb(
    `bookings?ref=eq.${encodeURIComponent(ref2)}&select=start_utc,end_utc`
  );
  check(
    reschedule.status === 200 && rescheduledRow.json?.[0]?.start_utc === mondayEpoch,
    "bookings.reschedule.split_shift",
    `HTTP ${reschedule.status}, ${JSON.stringify(rescheduledRow.json)}`
  );

  const rescheduleOverlap = await api("/api/admin/bookings/reschedule", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: ref2, date: dateC, time: "11:30" },
  });
  check(
    rescheduleOverlap.status === 409,
    "bookings.reschedule.overlap",
    `HTTP ${rescheduleOverlap.status}`
  );

  const rescheduleInvalid = await api("/api/admin/bookings/reschedule", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: ref2, date: "not-a-date", time: "99:99" },
  });
  check(rescheduleInvalid.status === 400, "bookings.reschedule.invalid", `HTTP ${rescheduleInvalid.status}`);

  /* restore hours after the split-shift test */
  await api("/api/admin/hours", {
    method: "POST",
    cookie: tenantCookie,
    body: { tenant_id: NOIRE, hours: originalRows, slot_step_min: originalInterval },
  });

  /* resend */
  const resend = await api("/api/admin/bookings/resend", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: ref3, email: RESEND_TEST },
  });
  check(
    resend.status === 200 &&
      resend.json?.customer_email === RESEND_TEST &&
      Boolean(resend.json?.email?.status),
    "bookings.resend",
    `HTTP ${resend.status}, status=${resend.json?.email?.status}`
  );
  const resendRow = await sb(
    `bookings?ref=eq.${encodeURIComponent(ref3)}&select=customer_email,customer_email_status`
  );
  check(
    resendRow.json?.[0]?.customer_email === RESEND_TEST,
    "bookings.resend.persisted",
    JSON.stringify(resendRow.json)
  );

  const resendInvalid = await api("/api/admin/bookings/resend", {
    method: "POST",
    cookie: tenantCookie,
    body: { ref: ref3, email: "not-an-email" },
  });
  check(
    resendInvalid.status === 400 && resendInvalid.json?.error === "invalid_email",
    "bookings.resend.invalid_email",
    `HTTP ${resendInvalid.status}`
  );

  /* audit trail */
  const audit = await api(`/api/admin/audit?tenant_id=${NOIRE}`, { cookie: tenantCookie });
  const events = audit.json?.events || [];
  const actions = new Set(events.map((event) => event.action));
  const expectedActions = [
    "booking.manual_created",
    "booking.confirmed",
    "booking.declined",
    "booking.cancelled",
    "booking.rescheduled",
    "booking.email_resent",
  ];
  const missingActions = expectedActions.filter((action) => !actions.has(action));
  const refs = new Set([ref1, ref2, ref3]);
  const ourEvents = events.filter((event) => refs.has(event.booking_ref));
  check(
    audit.status === 200 &&
      missingActions.length === 0 &&
      ourEvents.length > 0 &&
      ourEvents.every(
        (event) =>
          event.actor_email === ISO_EMAIL.toLowerCase() &&
          typeof event.created_at === "string" &&
          event.created_at.length > 0
      ),
    "bookings.audit",
    `HTTP ${audit.status}, missing=${missingActions.join(",") || "none"}`
  );
  check(
    events.every((event) => !String(event.booking_ref || "").startsWith("GAN-")),
    "bookings.audit.tenant_scope",
    `${events.length} events`
  );

  const bookingsAfter = await api(`/api/admin/bookings?tenant_id=${NOIRE}`, {
    cookie: tenantCookie,
  });
  const afterRows = bookingsAfter.json?.bookings || [];
  const statuses = Object.fromEntries(
    afterRows.filter((row) => refs.has(row.ref)).map((row) => [row.ref, row.status])
  );
  check(
    statuses[ref1] === "cancelled" &&
      statuses[ref2] === "confirmed" &&
      statuses[ref3] === "confirmed",
    "bookings.get.after_mutations",
    JSON.stringify(statuses)
  );

  /* ---------------- settings ---------------- */
  const settingsGet = await api(`/api/admin/settings?tenant_id=${NOIRE}`, {
    cookie: tenantCookie,
  });
  check(
    settingsGet.status === 200 && settingsGet.json?.tenant?.id === NOIRE,
    "settings.get",
    `HTTP ${settingsGet.status}`
  );
  const originalTenant = settingsGet.json?.tenant || cleanup.tenantSnapshot;

  const settingsUpdate = await api("/api/admin/settings", {
    method: "POST",
    cookie: tenantCookie,
    body: {
      tenant_id: NOIRE,
      name: "Atelier Noire VERIFY",
      contact_email: "verify-contact@example.com",
      phone: "+4799999999",
      whatsapp: "4799999999",
      address: "Verify Street 1",
      org_number: "999999999",
    },
  });
  check(
    settingsUpdate.status === 200 &&
      settingsUpdate.json?.tenant?.name === "Atelier Noire VERIFY" &&
      settingsUpdate.json?.tenant?.contact_email === "verify-contact@example.com" &&
      settingsUpdate.json?.tenant?.phone === "+4799999999" &&
      settingsUpdate.json?.tenant?.whatsapp === "4799999999" &&
      settingsUpdate.json?.tenant?.address === "Verify Street 1" &&
      settingsUpdate.json?.tenant?.org_number === "999999999",
    "settings.update",
    `HTTP ${settingsUpdate.status}`
  );

  const settingsAfter = await api(`/api/admin/settings?tenant_id=${NOIRE}`, {
    cookie: tenantCookie,
  });
  check(
    settingsAfter.json?.tenant?.name === "Atelier Noire VERIFY" &&
      settingsAfter.json?.tenant?.contact_email === "verify-contact@example.com",
    "settings.get.after_update",
    `HTTP ${settingsAfter.status}`
  );

  const invalidOwner = await api("/api/admin/settings", {
    method: "POST",
    cookie: tenantCookie,
    body: { tenant_id: NOIRE, owner_email: "not-an-email" },
  });
  check(
    invalidOwner.status === 400 && invalidOwner.json?.error === "invalid_owner_email",
    "settings.invalid_owner_email",
    `HTTP ${invalidOwner.status}`
  );

  const settingsRestore = await api("/api/admin/settings", {
    method: "POST",
    cookie: tenantCookie,
    body: {
      tenant_id: NOIRE,
      name: originalTenant?.name,
      contact_email: originalTenant?.contact_email,
      phone: originalTenant?.phone,
      whatsapp: originalTenant?.whatsapp,
      address: originalTenant?.address,
      org_number: originalTenant?.org_number,
    },
  });
  check(
    settingsRestore.status === 200 &&
      settingsRestore.json?.tenant?.name === originalTenant?.name,
    "settings.restore",
    `HTTP ${settingsRestore.status}`
  );

  /* ---------------- test email ---------------- */
  const testEmail = await api("/api/admin/settings/test-email", {
    method: "POST",
    cookie: tenantCookie,
    body: { tenant_id: NOIRE, recipient: RESEND_TEST },
  });
  const testResult = testEmail.json?.result;
  const testEmailOk =
    testEmail.status === 200 &&
    testEmail.json?.success === true &&
    testEmail.json?.recipient === RESEND_TEST;
  if (testEmailOk && testResult && !testResult.error) {
    pass("settings.test_email", `id=${testResult.data?.id || "returned"}`);
  } else if (testEmailOk) {
    warn(
      "settings.test_email",
      `route returned 200 but Resend reported: ${testResult?.error?.message || JSON.stringify(testResult)}`
    );
  } else {
    fail("settings.test_email", `HTTP ${testEmail.status}: ${JSON.stringify(testEmail.json)}`);
  }
} catch (error) {
  fail("suite.unhandled", error?.stack || String(error));
}

/* ------------------------------------------------------------------ */
/* Cleanup + report                                                   */
/* ------------------------------------------------------------------ */
await cleanupAll();

const counts = results.reduce(
  (acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  },
  {}
);

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

console.log("\n================ API CONTRACTS ================");
console.log(`GET  /api/admin/bookings?tenant_id=:slug
  -> { success, tenant, bookings[{ id, ref, tenant_id, start_utc, end_utc,
       customer_name, customer_email, customer_phone, price_nok, status,
       service_summary, email_status, email_error, customer_email_status,
       customer_email_error, services:{name,duration_min}|null }],
       blackouts[], services[], hours[] }

POST /api/admin/bookings/status
  body { ref | booking_id | id, status: "confirmed"|"declined"|"cancelled" }
  -> { success, status, booking{..., email_status, email_error},
       email: { status, error } | null }

POST /api/admin/bookings/manual
  body { tenant_id, client_name | customer_name, client_phone | customer_phone,
         client_email | customer_email, service_name | service_id,
         date + time | start_utc, notes? }
  -> { success, booking, email: { status, error } | null }

POST /api/admin/bookings/reschedule
  body { ref | booking_id | id, date + time | start_utc }
  -> { success, booking, email: { status, error } | null }

POST /api/admin/bookings/resend
  body { ref | booking_id | id, email? }
  -> { success, customer_email, email_id, email: { status, error } }

GET  /api/admin/hours?tenant_id=:slug
  -> { success, shifts: { Monday..Sunday: { open, start, end } },
       interval_min, slot_step_min, hours[] }

POST /api/admin/hours
  body { tenant_id, shifts: { Monday..Sunday: { open, start, end } },
         interval_min }            (also accepts hours[] + slot_step_min)
  -> { success, shifts, interval_min, slot_step_min, hours[] }

GET    /api/admin/blackouts?tenant_id=:slug -> { success, blackouts[] }
POST   /api/admin/blackouts { tenant_id, start_utc, end_utc, reason? }
       -> 201 { success, blackout }
DELETE /api/admin/blackouts?id=:id -> { success }

GET  /api/admin/settings?tenant_id=:slug -> { success, tenant }
POST /api/admin/settings { tenant_id, name?, contact_email?, phone?, whatsapp?,
       address?, org_number?, owner_email?, ... } -> { success, tenant }

POST /api/admin/settings/test-email { tenant_id, recipient? }
  -> { success, tenant_id, recipient, result: { data, error } }

GET  /api/admin/audit?tenant_id=:slug
  -> { success, events[{ id, actor_email, action, booking_ref, detail,
       created_at }] }
`);

process.exit(failures > 0 ? 1 : 0);
