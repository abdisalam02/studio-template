# ONBOARDING.md: Agency Client Studio Onboarding Runbook

Step-by-step agency process for provisioning a new 1-page studio site and booking widget for a client.

---

## Phase 0: Production Environment Checklist
Set these in Vercel → Project → Settings → Environment Variables before deploying. Never commit real values.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public, RLS-scoped key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only admin reads/writes. Never expose as `NEXT_PUBLIC_*`. |
| `RESEND_API_KEY` | Yes | OTP, booking and onboarding email. |
| `SESSION_SECRET` | Recommended | 32+ random bytes; peppers `admin_sessions.token_hash`. Rotating it signs every admin out. If unset, legacy SHA-256 hashes are used. |
| `RESEND_WEBHOOK_SECRET` | If webhooks | Matches delivery/bounce events to bookings. |
| `CRON_SECRET` | If cron | Protects `/api/cron/reminders`. |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical origin for booking/approval links. |
| `ONBOARDING_REVIEW_EMAIL`, `EMAIL_FROM_ADDRESS` | Yes | Onboarding inbox / sender identity. |
| `ONBOARDING_TOKEN_SECRET`, `REVIEW_LINK_SECRET` | Recommended | Dedicated signed-link secrets (fallback: service-role key). |
| `ADMIN_FALLBACK_EMAIL`, `ADMIN_FALLBACK_TENANT` | No | Development convenience only. **Must be empty in production.** |

Before pushing: confirm `RESEND_API_KEY` is valid and the sender domain is verified (`booking@agure.space`), `SUPABASE_SERVICE_ROLE_KEY` is server-only, and `SESSION_SECRET` is set (or consciously left unset to keep legacy hashes).

---

## Phase 1: Client Discovery & Assets
1. **Intake Checklist:**
   - [ ] Studio trade name, legal entity name, org number, and MVA status.
   - [ ] Physical studio address + transit instructions.
   - [ ] 6 high-resolution lookbook photos (minimum 1200px width).
   - [ ] Full treatment menu: names, descriptions, durations, and prices in NOK.
   - [ ] Target opening hours and working days.
   - [ ] Brand colors / aesthetic preferences.
2. **Asset Vetting:**
   - Record all client-supplied photos and logos in `docs/ASSETS.md`.
   - Confirm written rights for client portfolio display.

---

## Phase 2: Configuration & Branding
1. No code changes. Tenant identity lives in Supabase, not `tenant.config.ts`.
2. Set `NEXT_PUBLIC_SITE_URL`, `ONBOARDING_REVIEW_EMAIL`, and `EMAIL_FROM_ADDRESS` in the deployment environment.
3. Add the client frontend host to `tenant_domains` after approval if it uses a custom domain.
4. Public contact fields (`contact_email`, `phone`, `whatsapp`, `address`, `org_number`, `hours_text`) are editable in Admin → Settings.

---

## Phase 3: Supabase Backend Provisioning
1. Create a new Supabase project in the client's or agency's organization.
2. Apply migrations:
   ```bash
   npx supabase db push
   ```
3. Approve the onboarding submission. The `provision_tenant(jsonb)` RPC creates the tenant, owner admin row, default services, and Mon–Sat hours in one transaction.
4. Verify Row Level Security (RLS) policies:
   - Anonymous users: `SELECT` on active tenants, active services, hours, and blackouts.
   - Anonymous users: Atomic booking reservation via `create_booking_atomic` RPC.
   - `tenant_admins`, `admin_sessions`, and `tenant_domains`: no public access.
   - Studio owner: full CRUD through the DB-backed admin session.

---

## Phase 4: Integrations & Payments
1. **Deposit Payments:**
   - For Vipps: Client must provide their Vipps Bedrift API keys.
   - For Cards: Client connects their Stripe account via Stripe Connect or API keys.
2. **Email Delivery:**
   - Set `RESEND_API_KEY` in Supabase vault / Vercel environment variables.
   - Verify sender domain (e.g. `booking@clientdomain.no`).

---

## Phase 5: Verification & Launch
1. Run local audit:
   ```bash
   npm run verify
   ```
2. Check 375px mobile responsiveness on real device.
3. Perform end-to-end test booking (submit reservation $\to$ verify voucher $\to$ verify email delivery).
4. Point DNS A/CNAME records to hosting target (Vercel).
