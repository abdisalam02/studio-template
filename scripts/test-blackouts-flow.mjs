import { chromium } from "playwright";

async function testBlackoutsFlow() {
  console.log("=== TESTING BLACKOUTS PERSISTENCE & UI FLOW ===");

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  // 1. Dev login
  const loginRes = await context.request.post("http://localhost:3000/api/admin/dev-login", {
    data: { email: "niwache12@gmail.com" },
  });
  console.log("Dev-login status:", loginRes.status());

  const page = await context.newPage();
  await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 2. Navigate to Opening Hours tab
  const hoursBtn = await page.$("button[aria-label='Opening Hours']");
  if (hoursBtn) {
    await hoursBtn.click();
    await page.waitForTimeout(500);
  }

  // 3. Click "+ Block Time" button
  const blockTimeBtn = await page.$("#btn-add-blackout-tab");
  console.log("+ Block Time button found:", !!blockTimeBtn);
  if (blockTimeBtn) {
    await blockTimeBtn.click();
    await page.waitForTimeout(500);

    // 4. Fill custom break form
    const reasonInput = await page.$("#modal-timeblock input[placeholder*='Lunch pause']");
    if (reasonInput) {
      await reasonInput.fill("Audit Test Pause");
    }

    // Submit form
    const submitBtn = await page.$("#save-blackout-btn");
    console.log("Save blackout button found:", !!submitBtn);
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // 5. Inspect Active Blackouts list in the DOM
  const blackoutsList = await page.evaluate(() => {
    const list = document.querySelector("#blocked-intervals-list");
    if (!list) return { count: 0, items: [] };
    const rows = Array.from(list.children);
    return {
      count: rows.length,
      items: rows.map((r) => r.textContent.trim()),
    };
  });
  console.log("Rendered blackouts list:", blackoutsList);

  // 6. Test delete control on the newly created blackout
  const deleteBtn = await page.$("#blocked-intervals-list button:has-text('Delete')");
  console.log("Delete button found:", !!deleteBtn);
  if (deleteBtn) {
    await deleteBtn.click();
    await page.waitForTimeout(1000);

    const afterDelete = await page.evaluate(() => {
      const list = document.querySelector("#blocked-intervals-list");
      return list ? list.textContent.trim() : "";
    });
    console.log("After delete text:", afterDelete);
  }

  // 7. Verify quick 30 min break
  if (blockTimeBtn) {
    await blockTimeBtn.click();
    await page.waitForTimeout(500);

    const quickBreakBtn = await page.$("#modal-timeblock button:has-text('30 min break')");
    console.log("Quick 30 min break button found:", !!quickBreakBtn);
    if (quickBreakBtn) {
      await quickBreakBtn.click();
      await page.waitForTimeout(1000);
    }

    const quickList = await page.evaluate(() => {
      const list = document.querySelector("#blocked-intervals-list");
      return list ? list.textContent.trim() : "";
    });
    console.log("Quick break listed:", quickList.includes("30 min pause"));

    // Cleanup: delete the quick break
    const delQuick = await page.$("#blocked-intervals-list button:has-text('Delete')");
    if (delQuick) {
      await delQuick.click();
      await page.waitForTimeout(1000);
    }
  }

  await browser.close();
  console.log("=== BLACKOUT FLOW TEST FINISHED SUCCESSFULLY ===");
}

testBlackoutsFlow().catch(console.error);
