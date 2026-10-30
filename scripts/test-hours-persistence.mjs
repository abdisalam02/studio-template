import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.request.post("http://localhost:3000/api/admin/dev-login", {
    data: { email: "niwache12@gmail.com" },
  });

  const getRes = await context.request.get("http://localhost:3000/api/admin/hours?tenant_id=gangina");
  console.log("GET /api/admin/hours status:", getRes.status());
  const getData = await getRes.json();
  console.log("GET data:", JSON.stringify(getData, null, 2));

  // Test POST
  const postRes = await context.request.post("http://localhost:3000/api/admin/hours", {
    data: {
      tenant_id: "gangina",
      shifts: {
        Monday: { open: true, start: "10:00", end: "18:00" },
        Tuesday: { open: true, start: "10:00", end: "18:00" },
        Wednesday: { open: true, start: "10:00", end: "18:00" },
        Thursday: { open: false, start: "09:00", end: "17:00" },
        Friday: { open: false, start: "09:00", end: "17:00" },
        Saturday: { open: true, start: "11:00", end: "16:00" },
        Sunday: { open: false, start: "10:00", end: "15:00" },
      },
      interval_min: 30,
    },
  });
  console.log("POST status:", postRes.status());
  const postData = await postRes.json();
  console.log("POST data:", JSON.stringify(postData, null, 2));

  // GET again to check persistence
  const get2Res = await context.request.get("http://localhost:3000/api/admin/hours?tenant_id=gangina");
  const get2Data = await get2Res.json();
  console.log("GET 2 data:", JSON.stringify(get2Data, null, 2));

  await browser.close();
}

main().catch(console.error);
