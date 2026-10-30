# STATE.md: resume point (read first, keep under 30 lines)

Updated: 2026-10-30

## Now
- Mobile-first overhaul, 3-detent sheet, and pastel studio bento cards matching Inspo 1:1.

## Next (max 3)
1. Set production `NEXT_PUBLIC_SITE_URL`, `ONBOARDING_REVIEW_EMAIL`, `EMAIL_FROM_ADDRESS`.
2. Add `tenant_domains` rows for each client frontend.
3. End-to-end production smoke check across provisioned studios.

## Decisions (don't reopen)
- `owner_email` private; `contact_email` public.
- DB-first lookup; seed config dev-only; unknown slug returns 404.
- CORS: env + `tenant_domains` + `allowed_origins`.
- Provisioning uses `provision_tenant`; branding via `set_tenant_branding`; platform needs `scope='platform'`.
- `/admin` preserves exact dual-surface tokens; `/platform` uses master-detail workbench with preview rail.

## Open / TODO
- TODO-CONFIG: production env (`NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`).
- TODO-CLIENT: confirm each tenant's public contact details.

## Recent (max 5, one line each)
- 2026-10-30 — Admin UI overhaul: compact header, lacquer theme chips, zero native dialogs, dynamic Gangina lookup (`site/src/app/admin/`)
- 2026-10-30 — Auth lookup & pre-push security audit verified (`scripts/verify-auth-lookup-security.mjs`)
- 2026-10-30 — Restored Next.js admin parity: fluid dock slider, amber dot, 80px detents & drawer triage (`site/src/app/admin/`)
- 2026-10-30 — 60fps sheet physics, Oslo demo data & Inspo-style cards (`site/src/app/admin/`, `site/src/app/platform/`)
- 2026-10-30 — Fixed cross-tenant login confusion: session tenant authoritative, neutral login wall, email-resolved OTP (`scripts/verify-admin-login-flow.mjs`)

