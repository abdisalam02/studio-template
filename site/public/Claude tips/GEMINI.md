# GEMINI.md: portfolio-dashboard (A.Gure)

Project rules only. Working, safety, code and copy-ban rules live in the global file. **This file wins on conflict.**

## 0. Start every task here
1. Read `docs/STATE.md` (resume point), then `docs/ARCHITECTURE.md` (route and file map). Both are small.
2. Open only what the map points to, by line range.
3. Finish with `npm run verify` (tsc + check:legal + check:design). No `npm run build` for routine edits.
4. After the task, update `docs/STATE.md` (max 5 lines).

| File | Read when |
|---|---|
| `docs/STATE.md` | always, first |
| `docs/ARCHITECTURE.md` | always, second |
| `docs/DESIGN.md` | UI, layout, components |
| `docs/INSPO_WORKFLOW.md` | picking references or library components |
| `docs/PRICING.md` | prices, offers, marketing copy |
| `docs/ASSETS.md` | any image, icon, font, logo, model |
| `docs/CHANGE_PLAN.md` | tick items only, don't rewrite |

## 1. Identity & voice (portfolio and A.Gure marketing only)
- Name **A.Gure** only. Domain `agure.space` (canonical), email `hello@agure.space`. Oslo. Freelance sole proprietor.
- Legal details come from `src/config/legal.ts` and `LegalFooter`. Never hardcode them per page.
- Voice: casual, direct, 1-on-1 builder. Portfolio in English with a Norwegian option. Client demos in Norwegian (bokmål).
- Prefer: "What you get", "Simple pricing", "Add-ons", "Real websites I've built", "Why work with me?".
- Marketing copy doesn't name hosting vendors ("live link for your bio, or your own domain"). Privacy page and contracts must name the real sub-processors.

## 2. Honesty & claims
- Every factual claim must be true and provable on publish day. Otherwise remove it or mark `TODO-VERIFY` and list it in the reply.
- No comparative or superlative claims ("agencies charge 40,000+", "fastest", "guaranteed") without a source in a code comment beside the claim.
- A site is **live** only if publicly launched with the client's written permission. Otherwise "In development" or "Demo".
- "No monthly fees" only where true for that package. Use "No platform fees. Optional care plan from X kr/mo."
- Ownership wording: "You own the finished site and your content. Open-source and licensed assets keep their own licences."
- Turnaround wording: "Target 1-2 weeks". A "launch price" needs a real normal price and an end condition.
- Health, safety or certification claims only with client-supplied proof. In demos use neutral fictional wording.
- Prices in NOK with mva status ("Not VAT-registered" until that changes).

## 3. Assets
- Allowed: own photos, client photos with written permission, AI-generated images (no real people, brands or celebrities), stock whose licence allows commercial web use.
- Forbidden: Pinterest, Instagram, Google Images, TikTok, other people's sites, hotlinked third-party images, celebrity names or likenesses, Flaticon/Freepik downloads without a recorded licence.
- Every image, font, icon set, logo and 3D model gets a row in `docs/ASSETS.md`. Keep CC-BY credits visible. Don't name files after their source (`pin-*.jpg`).
- Demos are fictional businesses with a "Demo, fictional business" label, `hello@example.com`, "+47 000 00 000".

## 4. Legal, privacy & security defaults
- Footer legal block on every page (name, address, email, org number, mva status).
- Privacy page plus a short notice beside every form. No non-essential cookies or trackers. Self-host fonts. `ag_theme` in `localStorage` is fine.
- Forms: honeypot plus rate limit, server-side validation, escaped user text in emails and HTML.
- Dev tools (customizer, "Vault", "Record", mode toggles) only when `NEXT_PUBLIC_DEMO === '1'`. No `href="#"`, invalid `mailto:` links or placeholder data in shipped pages.
- Passcodes and tokens server-side only, hashed. OTPs expire and have an attempt limit. Accept/Decline links open a confirm page and change state only on POST.
- Vipps needs the client's own Vipps business agreement. Never suggest a personal number. Cards via Stripe on the client's account.
- Booking terms belong to the client (`TODO-CLIENT`). Any legal text I generate is a draft marked "Review before use".
- Client sites need hosting whose terms allow commercial use.

## 5. Project-specific stop gates (on top of the global ones)
Changing anything in `src/config/legal.ts`, `docs/PRICING.md` or `docs/ASSETS.md` licences. Touching `api/send-email` or `api/auth-pin`. Editing `src/components/library/registry.ts` without a component id from `INDEX.json`.

## 6. Verification
`npm run verify` runs tsc, `check:legal` and `check:design`. It prints only failures. Errors block "done". Warnings are reviewed or marked `design-ok`. List every `TODO-VERIFY` / `TODO-CLIENT` item in the reply.
