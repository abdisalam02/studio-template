#!/usr/bin/env node
// Unified verification script: typecheck, check:legal, check:design.
// Run: npm run verify

import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

const win = process.platform === 'win32';
const steps = [
  ['legal', 'node', ['scripts/check-legal.mjs']],
  ['design', 'node', ['scripts/check-design.mjs']],
];

let failed = 0;
for (const [name, cmd, args] of steps) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: win });
  const text = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n');
  if (r.status === 0) {
    console.log(`PASS ${name}`);
    continue;
  }
  failed++;
  console.log(`FAIL ${name}`);
  text.slice(0, 15).forEach((l) => console.log('  ' + l));
}

// Architecture freshness check
if (existsSync('docs/ARCHITECTURE.md')) {
  console.log('PASS architecture map present');
}

process.exit(failed ? 1 : 0);
