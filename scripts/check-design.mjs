#!/usr/bin/env node
// Flags generated-looking design tropes and copy tells in client builds.
// Run: npm run check:design

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOTS = ['site', 'widget'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'library', 'inspo', 'customizer', 'showcase', 'demo']);
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html']);

const BURN = new RegExp(
  '\\b(' +
    'elevat(e|es|ed|ing)|empower(s|ed|ing)?|unleash(es|ed|ing)?|unlock(s|ed|ing)?|harness(es|ed|ing)?|' +
    'revolutioni[sz](e|es|ed|ing)|transform(s|ed|ing)?|delve(s|d)?|curat(e|es|ed|ing)|craft(s|ed|ing)?|' +
    'amplif(y|ies|ied)|supercharg(e|es|ed|ing)|seamless(ly)?|bespoke|cutting-edge|robust|dynamic|' +
    'intuitive|holistic|tailored|frictionless|mission-critical|effortless(ly)?|next-level|game-changer|' +
    's[øo]ml[øo]s(t)?|skreddersydd|banebrytende|revolusjonerende' +
  ')\\b|in today\'?s fast-paced world|whether you\'?re an?\\b|say goodbye to|look no further',
  'i'
);

const RAW = [
  { lvl: 'error', id: 'purple-hue', re: /\b(bg|text|from|via|to|border|ring|fill|stroke)-(indigo|violet|purple|fuchsia)-\d{2,3}\b/, msg: 'Purple/indigo AI utility. Use client brand palette.' },
  { lvl: 'error', id: 'gradient-text', re: /(bg-clip-text|text-transparent)/, msg: 'Gradient text.' },
  { lvl: 'error', id: 'radial-bg', re: /(bg-\[radial-gradient|radial-gradient\()/, msg: 'Radial gradient background.' },
  { lvl: 'error', id: 'sparkle-emoji', re: /[✨🚀⚡🔥💡🎉✦]/u, msg: 'Sparkle/rocket glyph in UI.' },
  { lvl: 'warn', id: 'gradient-bg', re: /\bbg-gradient-to-/, msg: 'Gradient background.' },
  { lvl: 'warn', id: 'glass', re: /\bbackdrop-blur/, msg: 'Glassmorphism.' },
  { lvl: 'warn', id: 'fixed-width', re: /\bw-\[\d{3,}px\]/, msg: 'Fixed pixel width breaks 375px mobile.' },
  { lvl: 'warn', id: 'vh-height', re: /(\bmin-h-screen\b|\bh-screen\b|\b100vh\b)/, msg: 'Use dvh (min-h-dvh, h-dvh, 100dvh) on mobile.' },
];

const findings = [];
const add = (lvl, path, line, id, msg) => findings.push({ lvl, path, line, id, msg });

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.has(extname(name).toLowerCase())) check(p);
  }
}

function check(path) {
  readFileSync(path, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (line.includes('design-ok')) return;
    for (const r of RAW) {
      if (r.re.test(line)) add(r.lvl, path, i + 1, r.id, r.msg);
    }
    // Ignore CSS syntax properties & DOM style transforms
    const copyLine = line
      .replace(/\b(text-)?transform\s*:[^;]+;/gi, '')
      .replace(/\b(text-)?transform\s*:[^"';\n]+/gi, '')
      .replace(/\.style\.transform\b/gi, '')
      .replace(/\btransition:[^;]+;/gi, '')
      .replace(/\bwill-change:\s*transform/gi, '')
      .replace(/\btransform\([^)]*\)/gi, '');
    if (BURN.test(copyLine)) {
      add('error', path, i + 1, 'burn-word', 'Banned copy verb/adjective detected.');
    }
  });
}

for (const root of ROOTS) if (existsSync(root)) walk(root);

const errors = findings.filter((f) => f.lvl === 'error');
const warns = findings.filter((f) => f.lvl === 'warn');
for (const f of findings) console.log(`${f.lvl.toUpperCase().padEnd(5)} ${f.path}:${f.line} [${f.id}] ${f.msg}`);
console.log(`check:design ${errors.length} error(s), ${warns.length} warning(s).`);

const strict = process.argv.includes('--strict');
process.exit(errors.length || (strict && warns.length) ? 1 : 0);
