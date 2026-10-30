import { chromium } from "playwright";

async function main() {
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

  // 1. Click on an upcoming booking to open drawer
  await page.click("text=Najib");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "artifacts/admin-visual-pass/05-appointment-drawer-brand.png" });

  // Close drawer
  await page.click("#close-client-drawer-btn");
  await page.waitForTimeout(400);

  // 2. Schedule -> Plan Ahead -> select dates
  await page.click("button:has-text('Opening Hours')");
  await page.waitForTimeout(400);
  await page.click("button:has-text('Plan Ahead')");
  await page.waitForTimeout(400);
  await page.click("button:has-text('Weekends Only')");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "artifacts/admin-visual-pass/06-plan-ahead-selected-dock.png" });

  await browser.close();
  console.log("Captured 05 and 06");
}

main().catch(console.error);
