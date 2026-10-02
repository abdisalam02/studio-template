# STATE.md: resume point (read first, keep under 30 lines)

Updated: 2026-10-02

## Now
- Task: Admin Portal dual-surface sheet polish, client drawer actions/contacts, custom slot duration, zero click-bleed
- Status: Verified on Apache & Next.js (:3000), committed locally in noire (no push), ready for review

## Next (max 3)
1. User testing and approval to git push
2. Optional client color palette additions
3. Webhook and payment verification

## Decisions made (don't reopen)
- Architecture: `site/` (Next.js 15), `widget/` (embeddable script/component), `supabase/` (backend/RLS).
- Identity: Multi-tenant client configuration lives in `site/src/config/client.ts` and Supabase `tenants` table.
- Mobile first: 375px hard limit, fluid containers, `100dvh`.

## Open items
- TODO-CLIENT: Replace placeholder business info in `client.ts` before deployment
- TODO-CONFIG: Provide Supabase and Resend environment variables in `.env.local`

## Done (one line each; details live in `git log`)
- Initialized Supabase configuration via `supabase init`
- Established agent guardrails, token-efficiency rules, and `.env.example`
- Synchronized schema migration and TypeScript types with production Supabase schema
- Implemented Milestone 1: Booking API, Resend emailer, ICS generator & owner action flow
- Implemented Milestone 2: Timezone-aware availability engine & slot calculation endpoint
- Implemented Milestone 3: Customer cancellation self-service & passwordless owner admin dashboard
- Implemented Milestone 4: Multi-tenant luxury editorial booking engine and Gangina preset
- Connected live Gangina data, dev login bypass, calendar modal & Pocket Studio Manager
- Visual Storefront & GlossGenius Pocket Manager completed with zero type errors and clean verify check
- Yin-Yang Wave Schedule inspo port, 6-digit OTP auth, and appointments/hours/settings panels completed
- Yin-Yang Wave UI ported to Booking Flow (Step 2, Step 3) and Admin Dagsagenda timeline
- Connected Gangina /noire frontend to Next.js API with CORS and asset migration
- Eliminated slot flickering, added email header/review link, and connected admin feed API with RLS bypass
- Patched admin booking status auth bypass and verified full booking lifecycle with automated test suite
- Fixed email admin review URL, admin opening hours persistence, availability sync & local date parsing
- Fixed European weekday offset, direct slot string rendering and empty hours persistence
- Hydrated all-closed days in Admin, respected closed state in availability, and wired live Resend domain
- Removed default opening hours fallback; empty hours or unlisted weekday returns empty slots
- Safe sender formatting & console error logging wired in email.ts; Resend domain validation diagnosed
- Switched sender to verified root domain booking@agure.space; live dispatch verified (ID 01a0f75a-7257-720e-b961-ab2e0d702f12)
- Unified noire frontend into site/public (index.html, book.html, css, js, img) with relative API endpoints
- Hardened admin API routes by gating dev_bypass strictly behind NODE_ENV === 'development'
- Redesigned Admin feed: active-first appointments, collapsible archive accordion, responsive bottom nav, and calendar quick-jump
- Streamlined Admin cards: compact space-saving rows with date, time, name, email & modal details trigger in both views
- Verified .gitignore rules, secured environment secrets, and validated clean Next.js production build
- Confirmed CORS on public availability and bookings endpoints; cleaned tenant assets from site/public
- Initialized git repository, verified ignore rules (.env.local excluded), and created initial commit on main
- Pushed clean multi-tenant engine template to origin (https://github.com/abdisalam02/studio-template)
- Made email sender, reply-to, and email headers fully dynamic per tenant with agnostic fallbacks
- Normalized email action URLs, added fallback review routes (/review, /vurder, /manage), and pushed to main
- Fixed admin schedule reload sync, availability slot ghosting filter, approval email dispatch, and admin bookings list
- Resolved Admin 401 with signed session tokens & added strict server-side schedule validation on booking POST
- Fixed admin 401 token & cookie extraction, added /api/admin/schedule, and enabled real-time schedule persistence
- Fixed Supabase .catch in admin hours route and parallelized booking emails with next/server after()
- Batched admin schedule DB updates, removed blocking alerts, and added optimistic feedback UI
- Refactored Admin Agenda calendar to architectural tab bridge with fillets and pure white editorial cards
- Implemented GPU-accelerated fluid animated bubbly indicator connecting active date to obsidian agenda container
- Implemented industry-standard 4-tab admin portal shell, dynamic blackout modal, lead time enforcement, and verified design pass
