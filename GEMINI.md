# GEMINI.md: studio-template (Agency Client Studio Boilerplate)

Master agency boilerplate for 1-page client studio sites and embeddable booking widgets.
Global working and token-saving rules apply. **This workspace file wins on conflict.**

## 0. Start every task here
1. Read `docs/STATE.md` (resume point, <30 lines), then `docs/ARCHITECTURE.md` (route and component map). Both are concise.
2. Open files strictly by line range. Never read files over 500 lines whole.
3. Finish with `npm run verify` (`tsc` + `check:legal` + `check:design`). Full builds only for structural changes or prior to approved deployment.
4. After each task, update `docs/STATE.md` (at most 5 lines).

| File | Read when |
|---|---|
| `docs/STATE.md` | always, first |
| `docs/ARCHITECTURE.md` | always, second |
| `docs/DESIGN.md` | UI, layout, typography, components |
| `docs/ONBOARDING.md` | client tenant onboarding, Supabase setup, payment config |
| `docs/ASSETS.md` | adding or modifying images, icons, fonts, 3D assets |

## 1. Architecture & Multi-Tenant Boundaries
- **Directory Structure:**
  - `site/`: 1-page mobile-first studio website (Next.js App Router, Tailwind).
  - `widget/`: Standalone embeddable booking modal/component (can be embedded into any external site).
  - `supabase/`: Schema migrations, Row Level Security (RLS) policies, Edge Functions (booking notifications, webhooks).
  - `docs/`: Agency runbooks and token-saving guardrails.
- **Client Configuration:** All tenant details (business name, address, org number, services, opening hours) live in `site/src/config/client.ts` or Supabase `tenants` table. Never hardcode client details across components.
- **Supabase Security:** Every table MUST have Row Level Security (RLS) enabled. Public users only read public active services and available time slots. Personal client data (phone, name, email) is accessible only by service-role or authenticated studio owner.

## 2. Token-Saving & Working Rules
1. **Search Before Reading:** Grep/glob for exact identifiers. Never load whole folders, lockfiles, or build outputs.
2. **Surgical In-Place Edits:** Apply targeted chunk replacements. Never rewrite entire files.
3. **Strict Output Limits:** Plan in at most 10 lines. Final response at most 8 lines (what changed, files touched, open items). Do not paste long code blocks in chat.
4. **Verification Loop:** Verify once at the end with `npm run verify`. Fix failures at most twice; if still failing, stop and report blockers.
5. **No Unsolicited Refactoring:** Stay strictly within the blast radius of the requested task. Do not touch unrelated working files.

## 3. Stop Gates (Ask Before Executing)
- `git push`, deploys, publishing, or destructive database operations (dropping tables, altering migrations).
- Adding third-party tracking scripts, analytics pixels, or unvetted external dependencies.
- Modifying legal terms, cancellation policies, or payment integrations without explicit confirmation.
- Modifying Supabase RLS security policies.
- Deleting files.

## 4. UI Standards & Mobile Hygiene
- **Scandinavian Editorial Aesthetic:** High-contrast typography, generous negative space, hairline borders, no neon gradient orbs or glassmorphism fluff.
- **375px Hard Limit:** Zero horizontal overflow. No fixed pixel widths (`w-[400px]` banned).
- **Mobile Viewport:** Use `100dvh` or `min-h-dvh` instead of `100vh` or `min-h-screen`.
- **Copy Restrictions:** No AI buzzwords (*elevate, seamless, cutting-edge, empower, bespoke*). Direct, concrete, human facts only.
