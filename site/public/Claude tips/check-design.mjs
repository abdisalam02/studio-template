#!/usr/bin/env node
// Flags generated-looking design and copy tells. Errors fail; warnings only fail with --strict.
// Run: npm run check:design            (add -- --strict to fail on warnings too)
// Allow a line on purpose with a comment containing: design-ok
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOTS = ['src', 'app', 'pages', 'components', 'styles'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build']);
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.mdx']);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mdx', '.html']);

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

// Rules on raw source lines
const RAW = [
  { lvl: 'error', id: 'purple-hue', re: /\b(bg|text|from|via|to|border|ring|fill|stroke)-(indigo|violet|purple|fuchsia)-\d{2,3}\b/, msg: 'Purple/indigo utility. Use the client palette.' },
  { lvl: 'error', id: 'default-font', re: /\b(Inter|Roboto|Poppins|Space[_ ]Grotesk|Geist)\b/, needs: /(font|import)/i, msg: 'Default generator font. Pick from the client direction.' },
  { lvl: 'error', id: 'gradient-text', re: /(bg-clip-text|text-transparent)/, msg: 'Gradient text.' },
  { lvl: 'error', id: 'radial-bg', re: /(bg-\[radial-gradient|radial-gradient\()/, msg: 'Radial gradient background.' },
  { lvl: 'error', id: 'sparkle-emoji', re: /[✨🚀⚡🔥💡🎉✦]/u, msg: 'Sparkle/rocket glyph.' },
  { lvl: 'warn', id: 'emoji-icon', re: /\p{Extended_Pictographic}/u, msg: 'Emoji used as icon. Use text or an original SVG.' },
  { lvl: 'warn', id: 'gradient-bg', re: /\bbg-gradient-to-/, msg: 'Gradient background.' },
  { lvl: 'warn', id: 'glass', re: /\bbackdrop-blur/, msg: 'Glassmorphism.' },
  { lvl: 'warn', id: 'default-shadow', re: /\bshadow-(lg|xl|2xl)\b/, msg: 'Default soft shadow.' },
  { lvl: 'warn', id: 'big-radius', re: /\brounded-(2xl|3xl)\b/, msg: 'Default big radius. Set radius by role.' },
  { lvl: 'warn', id: 'left-border-card', re: /\bborder-l-(2|4|8)\b/, msg: 'Coloured left-border card.' },
  { lvl: 'warn', id: 'orb', re: /\bblur-(2xl|3xl)\b/, msg: 'Blurred gradient orb.' },
  { lvl: 'warn', id: 'motion', re: /(animate-(bounce|pulse|ping)|hover:-translate-y|whileInView|fade-in-up|animate-fade)/, msg: 'Generic motion. One orchestrated moment at most.' },
  { lvl: 'warn', id: 'caps-eyebrow', re: /uppercase/, needs: /tracking-/, msg: 'Tracked ALL-CAPS label.' },
  { lvl: 'warn', id: 'fixed-width', re: /\bw-\[\d{3,}px\]/, msg: 'Fixed pixel width. Breaks 375px.' },
  { lvl: 'warn', id: 'vh-height', re: /(\bmin-h-screen\b|\bh-screen\b|\b100vh\b)/, msg: 'Use dvh (min-h-dvh, h-dvh, 100dvh) on mobile.' },
  { lvl: 'warn', id: 'shadcn-default', re: /from ['"]@\/components\/ui\/(card|badge|button)['"]/, msg: 'Untouched UI-kit primitive. Restyle from tokens.' },
  { lvl: 'warn', id: 'lucide', re: /from ['"]lucide-react['"]/, msg: 'Default icon set.' },
  { lvl: 'warn', id: 'dark-default', re: /defaultTheme=["']dark["']/, msg: 'Dark as default.' },
  { lvl: 'warn', id: 'arrow-cta', re: /\s→\s*(<|["'`])/, msg: 'Arrow appended to link/button text.' },
  { lvl: 'warn', id: 'numbered-marker', re: /[>"'`]\s*\/?0[1-9]\s*[<"'`]/, msg: 'Numbered marker. Only for real sequences.' },
];

// Rules on copy only (string literals and JSX text), so CSS and imports never trigger them
const TEXT = [
  { lvl: 'error', id: 'burn-word', re: BURN, msg: 'Banned copy word or phrase (global GEMINI.md).' },
  { lvl: 'warn', id: 'cta-cliche', re: /(Get Started|Trusted by|\b\d+[kK]\+\s)/, msg: 'Template CTA or social-proof cliche.' },
  { lvl: 'warn', id: 'exclamation', re: /!/, msg: 'Exclamation mark in copy.' },
  { lvl: 'warn', id: 'middle-dot', re: /\S\s·\s\S/, msg: 'Middle-dot meta string.' },
];

function textOf(line) {
  if (/^\s*(import|export)\b.*\bfrom\b/.test(line)) return '';
  const l = line.replace(/\b(className|class|href|src|id|type|key|style)=(\{?)(["'`])(?:\\.|(?!\3).)*\3\}?/g, '');
  const parts = [];
  for (const m of l.matchAll(/(["'`])((?:\\.|(?!\1).)*?)\1/g)) if (/\s/.test(m[2])) parts.push(m[2]);
  for (const m of l.matchAll(/>([^<>{}]+)</g)) parts.push(m[1]);
  return parts.join(' ');
}

const findings = [];
const add = (lvl, path, line, id, msg) => findings.push({ lvl, path, line, id, msg });

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.has(extname(name).toLowerCase())) check(p, CODE_EXT.has(extname(name).toLowerCase()));
  }
}

function check(path, isCode) {
  let dashes = 0;
  readFileSync(path, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (line.includes('design-ok')) return;
    for (const r of RAW) {
      if (r.needs && !r.needs.test(line)) continue;
      if (r.re.test(line)) add(r.lvl, path, i + 1, r.id, r.msg);
    }
    if (!isCode) return;
    const t = textOf(line);
    if (!t) return;
    for (const r of TEXT) if (r.re.test(t)) add(r.lvl, path, i + 1, r.id, r.msg);
    dashes += (t.match(/—/g) || []).length;
  });
  if (dashes > 1) add('warn', path, 0, 'em-dash', `${dashes} em dashes in this file (max 1 per page).`);
}

for (const root of ROOTS) if (existsSync(root)) walk(root);

const errors = findings.filter((f) => f.lvl === 'error');
const warns = findings.filter((f) => f.lvl === 'warn');
for (const f of findings) console.log(`${f.lvl.toUpperCase().padEnd(5)} ${f.path}${f.line ? ':' + f.line : ''} [${f.id}] ${f.msg}`);
console.log(`check:design ${errors.length} error(s), ${warns.length} warning(s). Mark deliberate lines with "design-ok".`);

const strict = process.argv.includes('--strict');
process.exit(errors.length || (strict && warns.length) ? 1 : 0);
