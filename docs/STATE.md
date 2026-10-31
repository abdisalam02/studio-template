# STATE.md: resume point (read first, keep under 30 lines)

Updated: 2026-10-31

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
- 2026-10-31 — Blackouts persistence & capability audit rewrite: quick breaks, custom time blocking, live deletion (`site/src/app/admin/page.tsx`, `site/ADMIN_CAPABILITY_AUDIT.md`)
- 2026-10-31 — Comprehensive admin audit: 10/10 automated tests passed, Plan Ahead overrides verified, Atelier Pass drawer verified (`scripts/verify-admin-comprehensive-audit.mjs`)
- 2026-10-30 — Platform Option 3 pass: Sanzo Wada Studio Folio voucher cards, hairline SVG navigation, tactile asset plaques (`site/src/app/platform/`)
- 2026-10-30 — Admin ticket audit: Scandinavian voucher pass, placement intake parsing, authentic icons, compact email alert (`site/src/app/admin/`)
- 2026-10-30 — Admin Atelier Ticket pass: Option 1 status-aware voucher card, zero-slit sticky headers, balanced modal buttons (`site/src/app/admin/`)

