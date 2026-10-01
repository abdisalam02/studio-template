# System Architecture & Token Efficiency Brief
**Target Workspace:** `portfolio-dashboard` (A.Gure Portfolio & Client Demos)  
**Date:** September 30, 2026  
**Objective:** Provide Claude with a complete audit of existing workspace guardrails, project build architecture, routing connectivity, and token bottlenecks to design an optimized, hyper-efficient agentic workflow.

---

## 1. Executive Summary

This Next.js 15 (App Router) codebase hosts:
1. **The Core Freelance Portfolio** for **A.Gure** (Oslo, Norway — sole proprietor web design/development).
2. **Interactive Client Demos** (Nails studio, custom bakery, wedding, and decor services).
3. **A Video Walkthrough Studio** (`/preview/*`) equipped with a floating recording dock and automated countdown.
4. **An Internal UI Library & Customizer** containing over 190 pre-built components and theme palettes.

The workspace enforces strict brand identity rules, Scandinavian brutalist/editorial design standards, non-negotiable legal/consumer compliance (Norwegian e-commerce law), and zero-fluff copy policies.

---

## 2. Inventory of Existing `docs/` & Core Guardrails

The workspace operates under a **lazy-loading documentation pattern**: general rules live in `GEMINI.md`, while subsystem details are segmented into specialized `docs/` files loaded strictly on-demand.

### A. [`GEMINI.md`](../GEMINI.md) — Core Workspace Rules
* **Rule 0.1 (Search First):** Grep/glob before reading. Never load full directories, build outputs, or lockfiles.
* **Rule 0.2 (Surgical Edits):** Edit in-place with minimal line diffs. Whole-file rewrites are banned.
* **Rule 0.3 (Output Constraints):** Max 10 lines of planning before action. Final response max 8 lines.
* **Rule 0.4 (Fast Verification):** Verification must use lightweight CLI checks (`npx tsc --noEmit` and `npm run check:legal`). Full `npm run build` is banned for routine edits.
* **Rule 0.5 (Chat Hygiene):** Never paste long diffs or full source code into chat; reference file paths and line ranges.
* **Stop Gates:** Mandatory confirmation before `git push`, deploys, third-party script/embed injections, asset additions, pricing/legal modifications, or file deletions.

### B. [`docs/DESIGN.md`](./DESIGN.md) — Visual & Interaction Standards
* **Aesthetic Direction:** Scandinavian editorial. High contrast ink (`#111113`) on paper (`#f6f5f2`). Generous negative space, hairline borders, no neon glowing orbs, no generic bento grids.
* **Mobile Hard Limit (375px):** Zero horizontal overflow allowed. No fixed pixel containers (`w-[400px]` banned).
* **Domain UX Logic:**
  * *Salons / Clinique / Appointments:* Lookbook $\to$ scannable menu $\to$ live slots $\to$ 1-tap booking.
  * *Custom Cakes / Products:* Multi-step configurator (flavor $\to$ size $\to$ tier $\to$ lead time).
* **Voucher Pattern:** Physical ticket aesthetic with joined thumbnail and status badge (`RESERVASJON MOTTATT` vs `BEKREFTET`). Never monospaced JSON/text dumps.

### C. [`docs/PRICING.md`](./PRICING.md) — Commercial Source of Truth
* **Currencies & Tax:** All prices in NOK. Must state *"Not VAT-registered"* until threshold (>50,000 kr in 12 months) is reached.
* **Pricing Tiers:**
  * *The Booking Drop:* 2,000 kr (1-page mobile site, price menu, 6-photo lookbook, 1-tap booking).
  * *The Studio Website:* 5,500 – 12,500 kr (multi-page custom build).
* **Add-ons:** Booking engine (+1,500 kr), deposit payments (+1,200 kr via Vipps Bedrift/Stripe), extra page (+800 kr), custom domain (+600 kr).
* **Copy Bans:** No unsourced agency comparisons ("agencies charge 40k+"); no fake discounts; past client work must be cited as *"projects like this start at..."* rather than implying past prices.

### D. [`docs/CHANGE_PLAN.md`](./CHANGE_PLAN.md) & [`docs/IMPLEMENTATION.md`](./IMPLEMENTATION.md)
* Master 6-phase audit and execution checklist covering human prerequisites (sole proprietorship registration, domain consolidation), critical bug fixes, legal compliance, and trust architecture.
* Maintained using `[x]` tick-boxes to record state without re-generating plans across turns.

### E. [`docs/ASSETS.md`](./ASSETS.md) — Asset & Rights Registry
* Complete catalog of fonts (Google Fonts via `next/font/google`, OFL-1.1), icons (`react-icons`, MIT), client showcase screenshots, and Pinterest demo images flagged as `TODO — clear rights`.

---

## 3. Architecture & Connectivity Map

The project is structured under **Next.js App Router** with clear boundary separation:

```
src/
├── app/
│   ├── page.tsx                     # Main portfolio landing (Hero, Showcase, Proof)
│   ├── pricing/page.tsx             # Pricing tables, add-on breakdown, terms, FAQ
│   ├── contact/page.tsx             # Hardened contact form (honeypot + privacy notice)
│   ├── privacy/page.tsx             # Norwegian GDPR privacy statement
│   ├── studio/page.tsx              # Interactive studio presentation
│   ├── demo/
│   │   ├── page.tsx                 # Demo index directory
│   │   ├── nails/page.tsx           # Standalone client demo -> loads StudioKloNailsView
│   │   ├── cakes/page.tsx           # Standalone cake ordering demo
│   │   ├── wedding/page.tsx         # Wedding package demo
│   │   └── decorations/page.tsx     # Decor portfolio demo
│   ├── preview/
│   │   ├── nails/page.tsx           # StudioKloNailsView wrapped in PreviewShell
│   │   └── cakes/page.tsx           # Standalone cake configurator + PreviewShell
│   ├── library/page.tsx             # UI component library browser
│   ├── customizer/page.tsx          # Palette & theme testing bench
│   └── api/
│       ├── send-email/route.ts      # Direct Resend API integration (hello@agure.space)
│       └── auth-pin/route.ts        # Access control gate
├── components/
│   ├── Header.tsx & Footer.tsx      # Global portfolio shell
│   ├── LegalFooter.tsx              # Norwegian legal disclosure footer
│   ├── Hero.tsx & ClientWork.tsx    # Showcase and proof components
│   ├── demo/
│   │   └── StudioKloNailsView.tsx   # Self-contained salon booking view (~1,140 lines)
│   ├── preview/
│   │   └── PreviewShell.tsx         # Floating dock with screen recorder (NEXT_PUBLIC_DEMO gated)
│   └── library/
│       ├── registry.ts              # 2,234 lines! 197 component definitions
│       ├── palettes.ts              # 19 custom color themes
│       └── HeroComponents.tsx       # Extracted hero patterns
├── config/
│   └── legal.ts                     # Single source of truth for business/legal data
└── scripts/
    └── check-legal.mjs              # Node.js AST/regex audit script for banned phrases
```

---

## 4. Identified Token Bottlenecks

1. **Large Component Bloat:**
   * `src/components/library/registry.ts` is **2,234 lines**. If an agent reads this file to locate a component, it burns ~20,000+ tokens instantly.
   * `src/app/preview/cakes/page.tsx` is **1,857 lines** (self-contained configurator, price calculator, and order voucher in one file).
   * `src/components/demo/StudioKloNailsView.tsx` is **1,143 lines**.
2. **Exploratory Grep Waste:**
   * Because `/demo/nails` and `/preview/nails` both delegate to `StudioKloNailsView.tsx`, an agent unfamiliar with the directory tree reads `src/app/demo/nails/page.tsx` (only 8 lines), finds nothing, greps again, opens `PreviewShell.tsx`, and burns multiple turns locating the actual UI code.
3. **Repeated Re-Evaluation of Finished Phases:**
   * Context windows accumulate historical chatter about audit phases 1–6, forcing models to re-read thousands of tokens of completed implementation logs on every turn.

---

## 5. The Proposed Solution: `docs/ARCHITECTURE.md` (Codebase Index)

To prevent file searching and unintended large-file reads, introduce a lightweight, permanent Codebase Map:

### Structure of `docs/ARCHITECTURE.md`:
1. **Route-to-File Matrix:** Exactly which file controls which URL route.
2. **Direct Component Map:** Map feature requests directly to files (e.g. *"Nail treatments $\to$ `StudioKloNailsView.tsx:140-180`"*).
3. **Single Sources of Truth Index:** Direct links to `legal.ts`, `DESIGN.md`, `PRICING.md`, avoiding searches.
4. **Large File Warning List:** List files exceeding 800 lines with instructions to *only read specified line ranges*.

---

## 6. Questions for Claude to Analyze & Optimize

1. **Architecture Map Design:** What is the ideal schema for `docs/ARCHITECTURE.md` that keeps its total token footprint under 1,000 tokens while providing 100% routing certainty?
2. **Context Compaction Strategy:** How can multi-turn coding sessions be pruned or segmented so completed tasks don't bloat active context?
3. **Subagent Specialization:** How should we structure subagent delegation (e.g. lightweight `flash` subagents for file searching vs `pro` subagents for execution) to shield the main context?
4. **Tool Batching Rules:** What rules should be added to `GEMINI.md` to force parallel execution of edits and automated sanity checks?
