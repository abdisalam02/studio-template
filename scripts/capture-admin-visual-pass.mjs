import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

async function main() {
  mkdirSync("artifacts/admin-visual-pass-v2", { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await context.request.post("http://localhost:3000/api/admin/dev-login", {
    data: { email: "niwache12@gmail.com" },
  });

  const page = await context.newPage();
  await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Schedule Tab - Weekly & Editorial Time Pickers
  await page.click("button:has-text('Opening Hours')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/admin-visual-pass-v2/01-schedule-weekly-timepickers.png" });

  // 2. Click time picker toggle on Monday to show popover
  const timeToggle = await page.$(".editorial-time-toggle-btn");
  if (timeToggle) {
    await timeToggle.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "artifacts/admin-visual-pass-v2/02-editorial-time-popover.png" });
    // dismiss by keyboard Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  // 3. Plan Ahead Tab - Closed Marks & Selection
  await page.click(".schedule-segmented-tabs button:nth-child(2)");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/admin-visual-pass-v2/03-plan-ahead-closed-marks.png" });

  // 4. Select Weekends & Expand "Customize Each Date Individually"
  await page.click("button:has-text('Weekends Only')");
  await page.waitForTimeout(400);
  await page.click("button:has-text('Customize Each Date')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/admin-visual-pass-v2/04-plan-ahead-granular-custom.png" });

  // 5. Settings Tab - 2-Column Restored Theme Rows
  await page.click("button:has-text('Settings')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/admin-visual-pass-v2/05-settings-2col-theme-rows.png" });

  await browser.close();
  console.log("Visual pass v2 captured successfully!");
}

main().catch(console.error);
