const { chromium, devices } = require('playwright');
const fs = require('fs');

async function runAudit() {
  const outputDir = './audit-screenshots';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const targets = [
    { name: '01-client-home', url: 'https://noire-rosy.vercel.app/' },
    { name: '02-client-book', url: 'https://noire-rosy.vercel.app/book.html' },
    { name: '03-admin-dashboard', url: 'https://www.abdisalam.space/admin' },
    { name: '04-admin-schedule', url: 'https://www.abdisalam.space/admin/settings' },
  ];

  for (const target of targets) {
    // 1. Desktop Capture
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      await desktopPage.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await desktopPage.waitForTimeout(1500);
      await desktopPage.screenshot({ path: `${outputDir}/${target.name}-desktop.png`, fullPage: true });
    } catch (e) {
      console.warn(`Could not capture desktop ${target.name}:`, e.message);
    }
    await desktopPage.close();

    // 2. Mobile Capture
    const mobileContext = await browser.newContext({ ...devices['iPhone 14 Pro'] });
    const mobilePage = await mobileContext.newPage();
    try {
      await mobilePage.goto(target.url, { waitUntil: 'networkidle', timeout: 15000 });
      await mobilePage.screenshot({ path: `${outputDir}/${target.name}-mobile.png`, fullPage: true });

      // If booking page, capture scrolled date/time slots
      if (target.name === '02-client-book') {
        try {
          await mobilePage.evaluate(() => window.scrollBy(0, 650));
          await mobilePage.waitForTimeout(1000);
          await mobilePage.screenshot({ path: `${outputDir}/02-client-slots-mobile.png`, fullPage: false });
        } catch (err) {
          console.warn('Could not capture slots mobile:', err.message);
        }
      }
    } catch (e) {
      console.warn(`Could not capture mobile ${target.name}:`, e.message);
    }
    await mobilePage.close();
  }

  await browser.close();
  console.log('Visual audit complete. Screenshots saved to ./audit-screenshots');
}

runAudit();
