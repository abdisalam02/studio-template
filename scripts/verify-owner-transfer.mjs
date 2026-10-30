#!/usr/bin/env node
/**
 * Ownership-transfer regression.
 *
 * Creates an isolated temporary tenant, then changes its owner via
 * POST /api/admin/settings. Asserts:
 *   - the displaced owner's tenant_admins row is deactivated;
 *   - the new owner is active with role owner;
 *   - the displaced owner's sessions are revoked;
 *   - the displaced email can no longer request an OTP.
 *
 * Dev-only (uses /api/admin/dev-login for a platform-admin caller). Run from
 * the repo root with the Next dev server on :3000:
 *
 *   node scripts/verify-owner-transfer.mjs
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

async function sb(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
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

const stamp = Date.now();
const tenantId = `verify-owner-${stamp}`;
const oldEmail = `verify-old-${stamp}@example.com`;
const newEmail = `verify-new-${stamp}@example.com`;
const oldTokenHash = hashToken(`verify-old-session-${stamp}`);
let platformToken = null;

try {
  /* 1. Isolated tenant with an old owner, an owner row, and a live session. */
  const tenantInsert = await sb("tenants", {
    method: "POST",
    body: { id: tenantId, name: "Verify Owner Transfer", owner_email: oldEmail },
    prefer: "return=minimal",
  });
  const adminInsert = await sb("tenant_admins", {
    method: "POST",
    body: { tenant_id: tenantId, email: oldEmail, role: "owner", active: true },
    prefer: "return=minimal",
  });
  const sessionInsert = await sb("admin_sessions", {
    method: "POST",
    body: {
      token_hash: oldTokenHash,
      email: oldEmail,
      tenant_id: tenantId,
      scope: "tenant",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
    prefer: "return=minimal",
  });
  check(
    "owner_transfer.fixture",
    tenantInsert.status < 300 && adminInsert.status < 300 && sessionInsert.status < 300,
    `tenant=${tenantInsert.status} admin=${adminInsert.status} session=${sessionInsert.status}`
  );

  /* 2. A platform admin performs the transfer. */
  const loginRes = await fetch(`${BASE}/api/admin/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "niwache12@gmail.com" }),
  });
  platformToken = cookieFrom(loginRes);
  check("owner_transfer.caller_login", loginRes.status === 200 && Boolean(platformToken));

  const changeRes = await fetch(`${BASE}/api/admin/settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `admin_session=${platformToken}`,
    },
    body: JSON.stringify({ tenant_id: tenantId, owner_email: newEmail }),
  });
  const changeBody = await changeRes.json();
  check(
    "owner_transfer.response",
    changeRes.status === 200 && changeBody?.owner_changed === true,
    `HTTP ${changeRes.status} ${JSON.stringify(changeBody)}`
  );
  check(
    "owner_transfer.no_reauth_for_new_owner",
    changeBody?.reauthentication_required === false,
    String(changeBody?.reauthentication_required)
  );

  /* 3. One active owner; the displaced owner is deactivated. */
  const rows = await sb(
    `tenant_admins?tenant_id=eq.${tenantId}&select=email,role,active&order=email`
  );
  const oldRow = (rows.json || []).find((row) => row.email === oldEmail);
  const newRow = (rows.json || []).find((row) => row.email === newEmail);
  check("owner_transfer.old_owner_inactive", oldRow?.active === false, JSON.stringify(oldRow));
  check(
    "owner_transfer.new_owner_active",
    newRow?.active === true && newRow?.role === "owner",
    JSON.stringify(newRow)
  );

  /* 4. Displaced owner's live sessions are revoked. */
  const sessions = await sb(
    `admin_sessions?tenant_id=eq.${tenantId}&email=eq.${encodeURIComponent(oldEmail)}&select=revoked_at`
  );
  check(
    "owner_transfer.old_sessions_revoked",
    Array.isArray(sessions.json) &&
      sessions.json.length === 1 &&
      Boolean(sessions.json[0].revoked_at),
    JSON.stringify(sessions.json)
  );

  /* 5. The displaced email can no longer request an OTP. */
  await sb("auth_rate_events?id=gt.0", { method: "DELETE" }).catch(() => {});
  const oldOtp = await fetch(`${BASE}/api/admin/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: oldEmail }),
  });
  const oldOtpBody = await oldOtp.json();
  const oldChallenges = await sb(
    `admin_otp_challenges?email=eq.${encodeURIComponent(oldEmail)}&select=id`
  );
  check(
    "owner_transfer.old_email_no_otp",
    oldOtp.status === 200 &&
      !oldOtpBody?.tenant_id &&
      Array.isArray(oldChallenges.json) &&
      oldChallenges.json.length === 0,
    `${JSON.stringify(oldOtpBody)} challenges=${JSON.stringify(oldChallenges.json)}`
  );
} catch (err) {
  check("owner_transfer.unhandled", false, err?.stack || String(err));
} finally {
  // Clean up the isolated tenant and its rows.
  await sb(`admin_otp_challenges?email=eq.${encodeURIComponent(oldEmail)}`, { method: "DELETE" }).catch(() => {});
  await sb(`admin_sessions?tenant_id=eq.${tenantId}`, { method: "DELETE" }).catch(() => {});
  await sb(`tenant_admins?tenant_id=eq.${tenantId}`, { method: "DELETE" }).catch(() => {});
  await sb(`tenants?id=eq.${tenantId}`, { method: "DELETE" }).catch(() => {});
  await sb("auth_rate_events?id=gt.0", { method: "DELETE" }).catch(() => {});
  if (platformToken) {
    await fetch(`${BASE}/api/admin/auth/logout`, {
      method: "POST",
      headers: { Cookie: `admin_session=${platformToken}` },
    }).catch(() => {});
    await sb(`admin_sessions?token_hash=eq.${hashToken(platformToken)}`, { method: "DELETE" }).catch(() => {});
  }
  console.log("CLEANUP  temporary tenant + sessions deleted");
}

console.log(`\nSUMMARY: ${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
