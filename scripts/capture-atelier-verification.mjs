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

  // 1. Capture Calendar sticky header (verify zero slit)
  await page.screenshot({ path: "artifacts/admin-visual-pass-v2/07-calendar-header-no-slit.png" });

  // 2. Click on appointment cards to open the Atelier Studio Pass drawer
  const apptCards = await page.$$(".timeline-slot-row, .dagsagenda-booking-card, [data-ref]");
  for (let i = 0; i < Math.min(apptCards.length, 3); i++) {
    await apptCards[i].click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `artifacts/admin-visual-pass-v2/08-atelier-ticket-drawer-${i}.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  // 3. Open Create Appointment Modal (+New Booking) to verify balanced buttons
  await page.click("button:has-text('+ New Booking')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/admin-visual-pass-v2/09-new-booking-balanced-buttons.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // 4. Opening Hours Tab (verify zero slit on sticky segmented tabs)
  await page.click("button:has-text('Opening Hours')");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/admin-visual-pass-v2/10-schedule-tabs-no-slit.png" });

  await browser.close();
  console.log("Visual verification completed successfully!");
}

main().catch(console.error);
