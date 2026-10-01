#!/usr/bin/env node
// One command for all checks. Prints only what failed (short). Run: npm run verify
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const win = process.platform === 'win32';
const steps = [
  ['tsc', 'npx', ['tsc', '--noEmit']],
  ['legal', 'node', ['scripts/check-legal.mjs']],
  ['design', 'node', ['scripts/check-design.mjs']],
];

let failed = 0;
for (const [name, cmd, args] of steps) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: win });
  const text = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n');
  if (r.status === 0) {
    const summary = name === 'design' ? text[text.length - 1] : '';
    console.log(`PASS ${name} ${summary}`.trim());
    continue;
  }
  failed++;
  console.log(`FAIL ${name}`);
  const keep = name === 'design' ? (l) => /^ERROR/.test(l) : (l) => /error|TS\d+|\[[a-z-]+\]/i.test(l);
  text.filter(keep).slice(0, 12).forEach((l) => console.log('  ' + l));
}

// Architecture map freshness (routes and layouts are what matter)
function newest(dir, latest = 0) {
  if (!existsSync(dir)) return latest;
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.next') continue;
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) latest = newest(p, latest);
    else if (/^(page|route|layout)\.(tsx|ts|jsx|js)$/.test(n)) latest = Math.max(latest, st.mtimeMs);
  }
  return latest;
}
const appDir = existsSync('src/app') ? 'src/app' : 'app';
if (existsSync('docs/ARCHITECTURE.md') && newest(appDir) > statSync('docs/ARCHITECTURE.md').mtimeMs) {
  console.log('WARN docs/ARCHITECTURE.md is older than a route file. Run: npm run arch');
}

process.exit(failed ? 1 : 0);
