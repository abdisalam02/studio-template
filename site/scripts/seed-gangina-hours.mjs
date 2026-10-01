/**
 * One-shot seed: inserts opening hours for the gangina tenant.
 * Mon-Fri 10:00-19:00 (600-1140), Sat 11:00-17:00 (660-1020).
 * European weekday index: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6.
 * Run once:  node scripts/seed-gangina-hours.mjs
 * Uses raw fetch (no WebSocket) so works on Node 21+.
 */

import fs from 'node:fs';
import path from 'node:path';

// Load .env.local if not already in process.env
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPath = path.resolve(process.cwd(), 'site/.env.local');
  const altEnvPath = path.resolve(process.cwd(), '.env.local');
  const targetEnv = fs.existsSync(envPath) ? envPath : (fs.existsSync(altEnvPath) ? altEnvPath : null);
  if (targetEnv) {
    fs.readFileSync(targetEnv, 'utf-8').split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        process.env[k.trim()] = v.join('=').trim();
      }
    });
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xlacbuheytguhtqzdhzw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment or .env.local');
  process.exit(1);
}

const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  Prefer: 'return=representation',
};

const TENANT_ID = 'gangina';

const hours = [
  { tenant_id: TENANT_ID, weekday: 0, open_min: 600, close_min: 1140 }, // Mon 10:00–19:00
  { tenant_id: TENANT_ID, weekday: 1, open_min: 600, close_min: 1140 }, // Tue
  { tenant_id: TENANT_ID, weekday: 2, open_min: 600, close_min: 1140 }, // Wed
  { tenant_id: TENANT_ID, weekday: 3, open_min: 600, close_min: 1140 }, // Thu
  { tenant_id: TENANT_ID, weekday: 4, open_min: 600, close_min: 1140 }, // Fri
  { tenant_id: TENANT_ID, weekday: 5, open_min: 660, close_min: 1020 }, // Sat 11:00–17:00
];

// Check current state
const checkRes = await fetch(
  `${SUPABASE_URL}/rest/v1/hours?tenant_id=eq.${TENANT_ID}&select=weekday,open_min,close_min`,
  { headers: HEADERS }
);
if (!checkRes.ok) {
  const txt = await checkRes.text();
  console.error('Error checking existing hours:', checkRes.status, txt);
  process.exit(1);
}
const existing = await checkRes.json();

if (existing.length > 0) {
  console.log(`ℹ  gangina already has ${existing.length} hours row(s):`, existing);
  console.log('   Delete them first if you want to re-seed.');
  process.exit(0);
}

const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/hours`, {
  method: 'POST',
  headers: HEADERS,
  body: JSON.stringify(hours),
});

if (!insertRes.ok) {
  const txt = await insertRes.text();
  console.error('Insert failed:', insertRes.status, txt);
  process.exit(1);
}

const data = await insertRes.json();
console.log(`✅ Seeded ${data.length} hours rows for gangina:`);
data.forEach((r) =>
  console.log(`   weekday=${r.weekday}  open=${r.open_min}  close=${r.close_min}`)
);

