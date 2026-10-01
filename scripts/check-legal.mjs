#!/usr/bin/env node
// Scans site/ and widget/ for strings that must never ship in a client studio build.
// Run via: npm run check:legal

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

const ROOTS = ['site', 'widget'];

const BANNED = [
  { pattern: /href="#"/g, label: 'Dead link: href="#"' },
  { pattern: /lorem ipsum/gi, label: 'Lorem ipsum placeholder copy' },
  { pattern: /TODO-CLIENT/g, label: 'Unresolved TODO-CLIENT placeholder' },
  { pattern: /SARAH|JOHN DOE|EXAMPLE\.COM/gi, label: 'Unresolved mock personal data' },
  { pattern: /SMS-kvittering/gi, label: 'Unbuilt SMS confirmation claim' },
  { pattern: /SMS-bekreftelse/gi, label: 'Unbuilt SMS confirmation claim' },
];

const EXTS = new Set(['.tsx', '.ts', '.js', '.jsx', '.html']);

function walk(dir) {
  if (!existsSync(dir)) return [];
  let files = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules' || name === '.next') continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else if (EXTS.has(extname(name))) {
      files.push(full);
    }
  }
  return files;
}

let errorCount = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (const { pattern, label } of BANNED) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
        if (pattern.test(line)) {
          const rel = file.replace(process.cwd() + '/', '').replace(process.cwd() + '\\', '');
          console.error(`\n  FAIL  ${label}`);
          console.error(`        ${rel}:${i + 1}`);
          console.error(`        ${line.trim()}`);
          errorCount++;
        }
        pattern.lastIndex = 0;
      }
    }
  }
}

if (errorCount > 0) {
  console.error(`\n${errorCount} legal/placeholder issue(s) found. Resolve before client deployment.\n`);
  process.exit(1);
} else {
  console.log('\n  OK  check:legal — no banned strings or placeholders found.\n');
}
