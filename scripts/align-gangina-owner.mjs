import { readFileSync } from "node:fs";

const env = {};
for (const file of ["site/.env.local", ".env.local"]) {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const SUPABASE_URL = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";

async function main() {
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // 1. Update tenants owner_email to niwache12@gmail.com
  const tRes = await fetch(`${SUPABASE_URL}/rest/v1/tenants?id=eq.gangina`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ owner_email: "niwache12@gmail.com" }),
  });
  console.log("tenants update:", tRes.status, await tRes.text());

  // 2. Activate niwache12 in tenant_admins
  const aRes1 = await fetch(`${SUPABASE_URL}/rest/v1/tenant_admins?tenant_id=eq.gangina&email=eq.niwache12@gmail.com`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ active: true, role: "owner" }),
  });
  console.log("tenant_admins activate niwache12:", aRes1.status, await aRes1.text());

  // 3. Deactivate niwache15 in tenant_admins
  const aRes2 = await fetch(`${SUPABASE_URL}/rest/v1/tenant_admins?tenant_id=eq.gangina&email=eq.niwache15@gmail.com`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ active: false }),
  });
  console.log("tenant_admins deactivate niwache15:", aRes2.status, await aRes2.text());
}

main().catch(console.error);
