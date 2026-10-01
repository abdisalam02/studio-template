# ONBOARDING.md: Agency Client Studio Onboarding Runbook

Step-by-step agency process for provisioning a new 1-page studio site and booking widget for a client.

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
1. Duplicate or branch `studio-template`.
2. Edit `site/src/config/client.ts`:
   - Replace placeholder data with real studio information.
   - Set up primary accent color and font variables.
   - Configure cancellation policy window (e.g. 24h).

---

## Phase 3: Supabase Backend Provisioning
1. Create a new Supabase project in the client's or agency's organization.
2. Apply migrations:
   ```bash
   npx supabase db push
   ```
3. Populate initial tenant record and treatment items in `tenants`, `services`, and `hours` tables.
4. Verify Row Level Security (RLS) policies:
   - Anonymous users: `SELECT` on active tenants, active services, hours, and blackouts.
   - Anonymous users: Atomic booking reservation via `create_booking_atomic` RPC.
   - Studio owner: Full CRUD via authenticated dashboard or magic link.

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
