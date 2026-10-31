import { chromium } from "playwright";
import { readFileSync } from "node:fs";

/**
 * Blackout (Block Time) end-to-end regression test.
 *
 * Asserts, against a live dev server and the live Supabase project:
 *  1. Opening Block Time from a selected calendar day pre-fills that day (not "today").
 *  2. A 13:00 block is stored as 13:00 in `tenants.timezone`, even when the
 *     browser is in a different timezone (America/New_York here).
 *  3. The blackout list renders the studio-time interval and deletes the row.
 *  4. The quick 30-min break persists exactly 30 minutes.
 *
 * Run: node scripts/test-blackouts-flow.mjs
 * Requires: dev server on :3000, site/.env.local with service-role key.
 */

const BASE = "http://localhost:3000";
const TENANT = "gangina";
const STUDIO_TZ = "Europe/Oslo";
const BROWSER_TZ = "America/New_York";
const CUSTOM_REASON = "TZ Assert";
const QUICK_REASON = "30 min break";

const env = {};
for (const line of readFileSync("site/.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const SUPABASE = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const rest = (path, init = {}) =>
  fetch(`${SUPABASE}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

let failures = 0;
function check(label, condition, detail) {
  if (condition) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label}${detail ? ` -> ${JSON.stringify(detail)}` : ""}`);
  }
}

function zonedEpoch(dateStr, timeStr, timeZone) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes, seconds = 0] = timeStr.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hours, minutes, seconds);
  let guess = target;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 3; i += 1) {
    const parts = Object.fromEntries(
      fmt
        .formatToParts(new Date(guess))
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, Number(p.value)])
    );
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const diff = target - asUtc;
    if (diff === 0) break;
    guess += diff;
  }
  return Math.floor(guess / 1000);
}

function isoInZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function rowsFor(reason) {
  const res = await rest(
    `blackouts?select=id,tenant_id,start_utc,end_utc,reason&tenant_id=eq.${TENANT}&reason=eq.${encodeURIComponent(reason)}`
  );
  return res.json();
}

async function cleanup() {
  const res = await rest(
    `blackouts?tenant_id=eq.${TENANT}&reason=in.(${encodeURIComponent(`"${CUSTOM_REASON}","${QUICK_REASON}","Day closed"`)})`,
    { method: "DELETE", headers: { Prefer: "return=representation" } }
  );
  if (res.ok) {
    const removed = await res.json().catch(() => []);
    if (Array.isArray(removed) && removed.length) console.log(`cleanup removed ${removed.length} row(s)`);
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  timezoneId: BROWSER_TZ,
});

try {
  await cleanup();

  const login = await context.request.post(`${BASE}/api/admin/dev-login`, {
    data: { email: "niwache12@gmail.com" },
  });
  check("dev-login returns 200", login.status() === 200, login.status());

  const page = await context.newPage();
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector(".admin-shell", { timeout: 120000 });
  // Let the initial tenant fetch settle: a late blackouts GET must not clobber a row we just created.
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(500);

  // Tomorrow in studio time: never "today", so the date-sync assertion is meaningful.
  const targetDate = isoInZone(new Date(Date.now() + 24 * 60 * 60 * 1000), STUDIO_TZ);
  console.log(`target date (${STUDIO_TZ} tomorrow): ${targetDate}`);

  await page.locator('[aria-label="Toggle calendar sheet position"]').click();
  await page.waitForTimeout(600);

  let cell = page.locator(`[data-date="${targetDate}"]`);
  for (let i = 0; i < 4 && (await cell.count()) === 0; i += 1) {
    await page.locator("#cal-next-month").click();
    await page.waitForTimeout(350);
  }
  check("month grid exposes the target day", (await cell.count()) > 0, targetDate);
  await cell.first().click();
  await page.waitForTimeout(400);

  await page.locator('button[aria-label="Opening Hours"]').click();
  await page.waitForTimeout(400);
  await page.locator("#btn-add-blackout-tab").click();
  await page.waitForSelector("#modal-timeblock", { timeout: 20000 });

  const dateInput = page.locator('#modal-timeblock input[type="date"]');
  const prefill = await dateInput.inputValue();
  check("Block Time pre-fills the selected day", prefill === targetDate, { prefill, targetDate });

  const hint = (await page.locator("#block-timezone-hint").innerText()).trim();
  check("modal states the studio timezone", hint.includes("Europe/Oslo"), hint);

  const timeInputs = page.locator("#modal-timeblock .editorial-time-raw-input");
  await timeInputs.nth(0).fill("13:00");
  await timeInputs.nth(1).fill("13:30");
  await page.locator('#modal-timeblock input[placeholder*="Lunch pause"]').fill(CUSTOM_REASON);
  await page.locator("#save-blackout-btn").click();
  await page
    .waitForFunction(
      (reason) => document.querySelector("#blocked-intervals-list")?.textContent?.includes(reason),
      CUSTOM_REASON,
      { timeout: 10000 }
    )
    .catch(() => {});

  const customRows = await rowsFor(CUSTOM_REASON);
  const row = Array.isArray(customRows) ? customRows[0] : null;
  const expectedStart = zonedEpoch(targetDate, "13:00", STUDIO_TZ);
  const expectedEnd = zonedEpoch(targetDate, "13:30", STUDIO_TZ);
  const browserLocalStart = zonedEpoch(targetDate, "13:00", BROWSER_TZ);

  check("custom block persisted one row", Array.isArray(customRows) && customRows.length === 1, customRows);
  check("custom block start is 13:00 studio time", row?.start_utc === expectedStart, {
    stored: row?.start_utc,
    expected: expectedStart,
  });
  check("custom block end is 13:30 studio time", row?.end_utc === expectedEnd, {
    stored: row?.end_utc,
    expected: expectedEnd,
  });
  check(
    "custom block ignores the browser timezone",
    row?.start_utc !== browserLocalStart,
    { stored: row?.start_utc, browserLocalStart }
  );

  const listText = await page.locator("#blocked-intervals-list").innerText();
  check("list renders the studio-time interval", /13:00\s*[–-]\s*13:30/.test(listText), listText);
  check("list renders the created block", listText.includes(CUSTOM_REASON), listText);

  await page
    .locator("#blocked-intervals-list > div")
    .filter({ hasText: CUSTOM_REASON })
    .locator('button:has-text("Delete")')
    .click();
  await page.waitForTimeout(1200);
  const afterDelete = await rowsFor(CUSTOM_REASON);
  check("delete removes the row from the database", Array.isArray(afterDelete) && afterDelete.length === 0, afterDelete);
  check(
    "delete removes the row from the list",
    !(await page.locator("#blocked-intervals-list").innerText()).includes(CUSTOM_REASON)
  );

  // Quick 30-minute break.
  await page.locator("#btn-add-blackout-tab").click();
  await page.waitForSelector("#modal-timeblock", { timeout: 20000 });
  await page.locator("#modal-timeblock button", { hasText: "30 min break" }).first().click();
  await page.waitForTimeout(1500);

  const quickRows = await rowsFor(QUICK_REASON);
  const quickRow = Array.isArray(quickRows) ? quickRows[0] : null;
  check("quick break persisted", Array.isArray(quickRows) && quickRows.length === 1, quickRows);
  check(
    "quick break lasts exactly 30 minutes",
    quickRow ? quickRow.end_utc - quickRow.start_utc === 1800 : false,
    quickRow
  );

  await page
    .locator("#blocked-intervals-list > div")
    .filter({ hasText: QUICK_REASON })
    .locator('button:has-text("Delete")')
    .click();
  await page.waitForTimeout(1200);
  const quickAfter = await rowsFor(QUICK_REASON);
  check("quick break delete works", Array.isArray(quickAfter) && quickAfter.length === 0, quickAfter);

  // Close the rest of the day: must end at 23:59:59 studio time, not browser time.
  const studioNow = new Intl.DateTimeFormat("en-GB", {
    timeZone: STUDIO_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const [studioHour, studioMinute] = studioNow.split(":").map(Number);
  const dayStillOpen = studioHour < 23 || (studioHour === 23 && studioMinute < 59);

  await page.locator("#btn-add-blackout-tab").click();
  await page.waitForSelector("#modal-timeblock", { timeout: 20000 });
  await page.locator("#modal-timeblock button", { hasText: "Close the rest of the day" }).first().click();
  await page.waitForTimeout(1500);

  const closedRows = await rowsFor("Day closed");
  if (dayStillOpen) {
    const closedRow = Array.isArray(closedRows) ? closedRows[0] : null;
    const expectedClose = zonedEpoch(isoInZone(new Date(), STUDIO_TZ), "23:59:59", STUDIO_TZ);
    check("close-rest-of-day persisted", Array.isArray(closedRows) && closedRows.length === 1, closedRows);
    check("close-rest-of-day ends at 23:59:59 studio time", closedRow?.end_utc === expectedClose, {
      stored: closedRow?.end_utc,
      expected: expectedClose,
    });
    if (closedRow) {
      await page
        .locator("#blocked-intervals-list > div")
        .filter({ hasText: "Day closed" })
        .locator('button:has-text("Delete")')
        .click();
      await page.waitForTimeout(1200);
      const closedAfter = await rowsFor("Day closed");
      check("close-rest-of-day delete works", Array.isArray(closedAfter) && closedAfter.length === 0, closedAfter);
    }
  } else {
    check("close-rest-of-day is rejected after 23:59 studio time", (closedRows?.length ?? 0) === 0, closedRows);
  }
} finally {
  await cleanup();
  await browser.close();
}

console.log(failures === 0 ? "\nALL BLACKOUT CHECKS PASSED" : `\n${failures} BLACKOUT CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
