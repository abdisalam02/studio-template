# CHANGE_PLAN.md: audit fixes for Antigravity

Tick items as you finish them. Don't rewrite this file. Follow `GEMINI.md` stop gates. Small commits, no pushing.

## Phase 0: me (human) first
- [ ] Register the sole proprietorship (free). Decide how my name and "A.Gure" appear in the legal block.
- [ ] Choose the canonical domain (`agure.space`) and redirect `abdisalam.space` to it.
- [ ] Get written OK from Gangina and Rahim to show their sites. Confirm Gangina's real WhatsApp number.
- [ ] Decide launch price, care plan, grace period (`docs/PRICING.md`).
- [ ] Move client sites to hosting whose terms allow commercial use.

## Phase 1: critical fixes (agent)
- [ ] **Dev panel in production (Gangina site).** Remove or gate the customizer ("Booking Engine Mode", "Hide & Lock Options") behind `NEXT_PUBLIC_DEMO === '1'`. *Done when:* fetching `/` and `/book.html` in production shows none of that UI.
- [ ] **Booking mode.** Make the live mode explicit and match the portfolio wording (request vs live calendar). Remove placeholder data ("Sarah", `client@gmail.com`, `+47 912 34 567`, `#GNG-1048`) from shipped HTML. *Done when:* `check:legal` finds no placeholders.
- [ ] **Dead links.** Replace every `href="#"` (Instagram, TikTok, WhatsApp, "Open WhatsApp") with real URLs or remove the element.
- [ ] **MNO.CRM.** Fix `mailto:hello@mno.crm`, link the real Instagram account, replace the hotlinked Pinterest "Craft workshop" image with a cleared asset, and flag the about text ("dental kit off eBay, no formal training") to me for the client to confirm. Keep the CC-BY model credit.
- [ ] **Demo images.** Replace `pin-*.jpg` in `public/demo/nails` with cleared assets. Rename files after clearing. Rename "Hailey Glazed Donut" to a neutral name.
- [ ] **Demo data.** Remove the real-looking address (Bygdin gate 4). Use fictional details and a "Demo, fictional business" label. Generate the date strip from today's date. Remove the SMS-link claim unless built.
- [ ] **Health claims.** On Gangina's site, mark "safe for enamel", "professional dental adhesive" and "safe dental application" as `TODO-VERIFY` and ask the client for proof, or remove.
- [ ] **Public tools.** Gate "Vault", "Record" and the demo switcher in `/demo/*` behind `NEXT_PUBLIC_DEMO`.

## Phase 2: legal scaffolding
- [ ] Create `src/config/legal.ts` (name, address, email, org number, mva status) and a `LegalFooter` component used on every page of the portfolio and the client template.
- [ ] Add `/privacy` (Norwegian + English draft marked "Review before use") and a notice beside every form. List real sub-processors.
- [ ] Audit third-party loads (fonts, scripts, embeds, images). Self-host fonts. No trackers or embeds without my approval and a consent solution. Instagram embeds count as third-party loading.
- [ ] Per-page metadata (title, description, canonical, `og:url`) using `agure.space`. Set `lang="nb"` on Norwegian pages. Fix the duplicated "A.GURE | A.GURE" title.
- [ ] Add a Norwegian version of the portfolio home and pricing pages.

## Phase 3: pricing page rewrite (per `docs/PRICING.md`)
- [ ] Remove "No monthly fees" where it conflicts with the care plan. Replace with "No platform fees. Optional care plan."
- [ ] Remove "Agencies in Oslo charge 40,000+ kr" unless I supply a source.
- [ ] Change "48 hours to 1 week" to "Target 1-2 weeks".
- [ ] Reword "~6,000 kr like By Gangina" and "~12,500 kr like MNO.CRM" to "projects like this start at ...". Don't imply those clients paid.
- [ ] Fix ownership wording, domain wording (registered in the client's name) and the personal-Vipps suggestion.
- [ ] Add mva line, launch-offer banner (first 5 studios, end condition) and the one-page terms summary.
- [ ] Label "Live Projects" honestly: In development until client permission and launch.

## Phase 4: security
- [ ] Contact form and booking form: honeypot, rate limit or Turnstile, server-side validation, HTML-escaped emails.
- [ ] Add security headers in `next.config` (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame protection). Check the result in a headers checker.
- [ ] Remove any hardcoded passcode. Server-side hashed passcode plus OTP with expiry and attempt limit.
- [ ] Accept/Decline email links: token in the link, confirm page, state change on POST only.
- [ ] Booking backend: lock around the availability check and write, error logging with owner/dev alerts, `Europe/Oslo` everywhere. (See `Setup.gs`.)

## Phase 5: guardrails
- [ ] Put `scripts/check-legal.mjs` and `scripts/check-design.mjs` in a `scripts/` folder at the repo root, next to `package.json`. Add to `package.json` scripts: `"check:legal": "node scripts/check-legal.mjs"`, `"check:design": "node scripts/check-design.mjs"`.
- [ ] Put `src/config/legal.ts` in place and fill it in after registering (check:legal fails while it says TODO).
- [ ] Create `docs/ASSETS.md` (file | source | licence | attribution | permission proof | date). Fill it for every current image, font, icon and model.
- [ ] Add an optional git pre-commit hook that runs `npm run check:legal` and `npx tsc --noEmit`. No new dependencies.

## Phase 6: library and inspo
- [ ] Make `/inspo` and `/library` private (password or not deployed) until every image and reference is cleared. See `docs/INSPO_WORKFLOW.md`.
- [ ] Run `npm run check:design` over `src/components/library/`. Retire or rework components that hit errors.
- [ ] Add `library/INDEX.json` (id, category, structure tags, best for, known tells) so the agent picks by metadata, not by reading files.
- [ ] Retire palette "vibes" that copy generator defaults (see `docs/INSPO_WORKFLOW.md`). Keep only as starting tokens.

## Phase 7: proof and trust
- [ ] Add real testimonials only after clients give written permission. Never placeholders.
- [ ] Add an About block, process (3 steps), and a short "what I need from you" checklist.
- [ ] Add a WhatsApp/DM contact option beside the email form.
- [ ] Accessibility pass: alt text, contrast, focus states, form labels.

## Done means
`npx tsc --noEmit` passes, `npm run check:legal` passes, and all `TODO-VERIFY` / `TODO-CLIENT` items are listed for me.

## Phase 8: structure for agents (token fixes)
- [ ] Move `src/scripts/check-legal.mjs` to `scripts/check-legal.mjs` at the repo root. Inside `src/` the script scans itself and flags its own rule text.
- [ ] Add `scripts/check-design.mjs`, `scripts/gen-arch.mjs`, `scripts/verify.mjs` and these `package.json` scripts: `"check:legal": "node scripts/check-legal.mjs"`, `"check:design": "node scripts/check-design.mjs"`, `"arch": "node scripts/gen-arch.mjs"`, `"verify": "node scripts/verify.mjs"`.
- [ ] Run `npm run arch` to replace the seed `docs/ARCHITECTURE.md`. Re-run it after any route or file move.
- [ ] Split `src/components/library/registry.ts` (2,234 lines) into per-category files under `registry/` plus `index.ts`, and generate `library/INDEX.json` (id, category, structure tags, best for, known tells, file). Do this as its own approved task.
- [ ] Split `src/app/preview/cakes/page.tsx` (1,857 lines): `data.ts` (sizes, sponges, prices), `Configurator.tsx`, `Voucher.tsx`, `page.tsx` as a thin wrapper.
- [ ] Split `src/components/demo/StudioKloNailsView.tsx` (1,143 lines): `data.ts` (treatments, prices), `Lookbook.tsx`, `BookingFlow.tsx`, `Voucher.tsx`.
- [ ] Add a `@section NAME` anchor comment at the top of each remaining block over 300 lines.
- [ ] Trim `docs/IMPLEMENTATION.md` to one line per finished item, then move the full text to `docs/archive/` (never auto-read).
- [ ] Create `docs/STATE.md` and keep it under 30 lines. Update it at the end of every task.
