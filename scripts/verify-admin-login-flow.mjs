#!/usr/bin/env node
/**
 * Browser regression for admin login isolation.
 *
 * Verifies:
 *   - the login wall is neutral (no studio name/logo) until an email resolves;
 *   - niwache12@gmail.com resolves Gangina branding;
 *   - clearing the email clears the branding;
 *   - an authenticated Gangina session survives a refresh (never falls back to noire);
 *   - Lock clears the session and returns a neutral login wall.
 *
 * Dev-only: mints a session via /api/admin/dev-login. Run from the repo root
 * with the Next dev server on :3000:
 *
 *   node scripts/verify-admin-login-flow.mjs
 *
 * Requires Playwright (already a root dependency) and site/.env.local.
 */

import { chromium } from "playwright";
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

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: BASE });
const page = await context.newPage();

let sessionToken = null;
try {
  /* 1. Fresh login wall — no studio branding. */
  await page.goto("/admin", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("#admin-login-email", { state: "visible", timeout: 120000 });

  const initialTitle = (await page.locator("#login-studio-name").innerText()).trim();
  check("login.initial.neutral_title", initialTitle === "Admin Portal", initialTitle);
  check("login.initial.no_badge", (await page.locator("#admin-login-badge").count()) === 0);
  check("login.initial.empty_email", (await page.locator("#admin-login-email").inputValue()) === "");
  const initialMark = (await page.locator(".login-brand-badge-mark").innerText().catch(() => "")).trim();
  const initialResolved = await page
    .locator(".login-brand-badge")
    .evaluate((el) => el.classList.contains("is-resolved"))
    .catch(() => null);
  check("login.initial.ag_placeholder", initialMark === "A.G" && initialResolved === false, `${initialMark} resolved=${initialResolved}`);

  /* 2. Email lookup resolves Gangina branding. */
  await page.fill("#admin-login-email", "niwache12@gmail.com");
  await page.waitForFunction(
    () => /gangina/i.test(document.querySelector("#login-studio-name")?.textContent || ""),
    null,
    { timeout: 20000 }
  );
  const resolvedTitle = (await page.locator("#login-studio-name").innerText()).trim();
  check("login.email.resolves_gangina", /gangina/i.test(resolvedTitle), resolvedTitle);
  check("login.email.badge_visible", (await page.locator("#admin-login-badge").count()) === 1);
  const logoSrc = await page.locator("#admin-login-logo").getAttribute("src").catch(() => null);
  const badgeText = await page.locator("#admin-login-badge").innerText().catch(() => "");
  check(
    "login.email.brand_asset",
    Boolean(logoSrc) || badgeText.trim().length > 0,
    logoSrc || badgeText.trim()
  );
  const badgeResolved = await page
    .locator(".login-brand-badge")
    .evaluate((el) => el.classList.contains("is-resolved"))
    .catch(() => null);
  check("login.email.badge_resolved", badgeResolved === true, String(badgeResolved));

  /* 3. Clearing the email clears the branding again. */
  await page.fill("#admin-login-email", "");
  await page.waitForFunction(
    () => (document.querySelector("#login-studio-name")?.textContent || "").trim() === "Admin Portal",
    null,
    { timeout: 5000 }
  );
  const clearedTitle = (await page.locator("#login-studio-name").innerText()).trim();
  check("login.clear.neutral_again", clearedTitle === "Admin Portal", clearedTitle);
  check("login.clear.no_badge", (await page.locator("#admin-login-badge").count()) === 0);
  const clearedMark = (await page.locator(".login-brand-badge-mark").innerText().catch(() => "")).trim();
  check("login.clear.ag_placeholder", clearedMark === "A.G", clearedMark);

  /* 4. Authenticate as Gangina (dev-only shortcut), then load /admin. */
  const loginRes = await context.request.post(`${BASE}/api/admin/dev-login`, {
    data: { email: "niwache12@gmail.com" },
  });
  check("session.dev_login", loginRes.status() === 200, `HTTP ${loginRes.status()}`);

  const cookies = await context.cookies(BASE);
  sessionToken = cookies.find((cookie) => cookie.name === "admin_session")?.value || null;
  if (!sessionToken) {
    const setCookie = loginRes.headers()["set-cookie"] || "";
    const match = /admin_session=([^;]+)/.exec(setCookie);
    if (match) {
      sessionToken = match[1];
      await context.addCookies([
        {
          name: "admin_session",
          value: sessionToken,
          url: BASE,
          httpOnly: true,
          sameSite: "Strict",
        },
      ]);
    }
  }
  check("session.cookie_present", Boolean(sessionToken), sessionToken ? "captured" : "missing");

  await page.goto("/admin", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("#canopy-studio-title", { state: "visible", timeout: 60000 });
  await page.waitForSelector("#admin-login-email", { state: "detached", timeout: 15000 }).catch(() => {});
  const headerTitle = (await page.locator("#canopy-studio-title").innerText()).trim();
  check(
    "session.header.gangina",
    /gangina/i.test(headerTitle) && !/noire/i.test(headerTitle),
    headerTitle
  );

  /* 5. Refresh must keep the session tenant (Gangina), not default to noire. */
  await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("#canopy-studio-title", { state: "visible", timeout: 60000 });
  await page.waitForSelector("#admin-login-email", { state: "detached", timeout: 15000 }).catch(() => {});
  const headerTitleAfterReload = (await page.locator("#canopy-studio-title").innerText()).trim();
  check(
    "session.reload.still_gangina",
    /gangina/i.test(headerTitleAfterReload) && !/noire/i.test(headerTitleAfterReload),
    headerTitleAfterReload
  );

  /* 6. Lock → neutral login wall, no stale studio branding. */
  await page.click("#admin-lock-btn");
  await page.waitForSelector("#admin-login-email", { state: "visible", timeout: 20000 });
  // Lock revokes server-side; wait for it so the reload below cannot race the
  // logout request and restore the old session.
  await page.waitForFunction(
    async () => {
      const res = await fetch("/api/admin/auth/session", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      return body?.authenticated === false;
    },
    null,
    { timeout: 20000, polling: 100 }
  );
  const lockedTitle = (await page.locator("#login-studio-name").innerText()).trim();
  check("lock.login.neutral_title", lockedTitle === "Admin Portal", lockedTitle);
  check("lock.login.no_badge", (await page.locator("#admin-login-badge").count()) === 0);
  check("lock.login.empty_email", (await page.locator("#admin-login-email").inputValue()) === "");
  const lockedMark = (await page.locator(".login-brand-badge-mark").innerText().catch(() => "")).trim();
  check("lock.login.ag_placeholder", lockedMark === "A.G", lockedMark);
  check("lock.url.clean", page.url().replace(/\/$/, "").endsWith("/admin"), page.url());

  /* 7. Reload after logout stays locked. */
  await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("#admin-login-email", { state: "visible", timeout: 60000 });
  const lockedAfterReload = (await page.locator("#login-studio-name").innerText()).trim();
  check(
    "lock.reload.still_locked",
    lockedAfterReload === "Admin Portal" &&
      (await page.locator("#admin-login-badge").count()) === 0,
    lockedAfterReload
  );
} catch (err) {
  check("suite.unhandled", false, err?.stack || String(err));
} finally {
  await browser.close();
  if (sessionToken && SUPABASE_URL && SERVICE_KEY) {
    try {
      const tokenHash = hashToken(sessionToken);
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_sessions?token_hash=eq.${tokenHash}`,
        {
          method: "DELETE",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
        }
      );
      console.log(`CLEANUP  dev-login session deleted (HTTP ${res.status})`);
    } catch (err) {
      console.log(`CLEANUP  failed: ${err?.message || err}`);
    }
  }
}

console.log(`\nSUMMARY: ${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
