# Admin Portal Capability & Feature Audit

**Document:** `ADMIN_CAPABILITY_AUDIT.md`
**Date:** 2026-10-31 (supersedes the 2026-10-02 draft)
**Target:** `studio-template/site` — admin portal, scheduling engine, platform console
**Status:** Corrected audit, re-verified against the code, the live database and the regression suites

> The 2026-10-02 draft described a 648-line `page.tsx`, six components that do not exist, Norwegian UI labels that are no longer rendered, and several flows that are only toast stubs. This revision re-checks every claim against the current tree (commit `2201f2a`) and the live Supabase project.

---

## 0. Verification Basis

- `site/src/app/admin/page.tsx` — **4,494 lines**. All admin UI lives in this single file. There is no `src/components/admin/` directory and no `/admin/login` route.
- `site/src/app/admin/admin-system.css` — 4,993 lines.
- API routes under `site/src/app/api/admin/**`, `site/src/app/api/platform/**`, `site/src/app/api/cron/**`.
- Live schema read through the Supabase REST API on 2026-10-31: `bookings`, `tenants`, `hours`, `blackouts`, `services`. **No `operating_hours` table exists.**
- Regression suites: `scripts/verify-admin-login-flow.mjs` (21 checks), `scripts/verify-owner-transfer.mjs` (8), `scripts/verify-session-manual-contract.mjs` (18), `scripts/test-blackouts-flow.mjs` (create / list / delete), plus `npm run verify`.

---

## 1. Current State Matrix

| Feature | Status | Implementation | How It Works |
|---|---|---|---|
| **Email OTP Login** | **Yes** | `POST /api/admin/auth/send-otp`, `verify-otp`, `GET /api/admin/auth/lookup`, `POST /api/admin/auth/logout` | In-page login gate (not a separate route). Six-digit code, 15-minute TTL, uniform responses so the endpoint cannot enumerate admins, IP + email rate limits. Session is a 12-hour HttpOnly `admin_session` cookie backed by `admin_sessions`. |
| **Session Probe** | **Yes** | `GET /api/admin/auth/session` | Returns `200 {authenticated:false}` when signed out (no DB lookup) and `Cache-Control: no-store`. Validated sessions are cached per instance for 15 s; logout evicts the entry. |
| **7-Day Agenda Timeline** | **Yes** | `page.tsx` (`timelineDaysInStrip`, `timelineBookings`) | Week strip with a sliding indicator using `cubic-bezier(0.34, 1.35, 0.64, 1)`. Selecting a day filters bookings by Oslo local date and renders time-ordered cards. |
| **Month Calendar Grid** | **Yes** | `page.tsx` (`getMonthGridDays`), `admin-system.css` | Week/month toggle. Month view uses auto rows so 5- and 6-week months both fill the canopy; day chips stay circular. Switching to month moves the sheet to the peek detent. |
| **Appointments Feed & Filters** | **Yes** | `page.tsx` (`segmentFilter`, `searchFilter`, `filteredBookings`) | Segments: `Active`, `Pending`, `Confirmed`, `Archive`, `All`, plus a free-text search across client name, email, phone, reference and service. |
| **Admin Booking Fetch API** | **Yes** | `GET /api/admin/bookings?tenant_id=[slug]` | Cookie-only admin session (no Bearer path). Queries `bookings` (descending `start_utc`), `blackouts`, `services` and `hours` in parallel; maps `customer_email_status` / `customer_email_error` to `email_status` / `email_error` for the portal. |
| **Booking Approval / Rejection** | **Yes** | In-page drawer, `POST /api/admin/bookings/status` | `confirmed` / `declined` / `cancelled`. Stamps `decided_at`, regenerates the `.ics`, sends the customer email, and writes an admin event. Approval is guarded when the confirmation email previously bounced. |
| **Booking Cancellation** | **Yes** | In-page drawer, `POST /api/admin/bookings/status` | Transitions an active appointment to `cancelled` and sends the customer copy. Owner cancellation alerts are sent from the customer self-service path (`/api/manage/cancel`). |
| **Appointment Reschedule** | **Yes** | In-page modal, `POST /api/admin/bookings/reschedule` | Date + start-time picker. The server validates opening hours, minimum notice, maximum days ahead and slot step, then calls `reschedule_booking_atomic`, which rejects overlaps and blackouts. Recomputes `end_utc` / `block_end_utc`, regenerates `.ics`, emails the customer. |
| **Manual Booking (Walk-in / Phone)** | **Yes** | In-page modal, `POST /api/admin/bookings/manual` | Service is resolved against **this tenant's active `services` catalog** (by id or by name), so another studio's price cannot be used. Creates a `confirmed` booking through `create_booking_atomic` and sends the confirmation email. Accepts `client_*` or `customer_*`, and `scheduled_at` or `date` + `time`. |
| **Customer Quick Contact** | **Yes** | In-page drawer | `tel:` dialer, `https://wa.me/...`, and `mailto:` links. |
| **Placement / Intake Inspector** | **Partial** | In-page drawer | Extracts `[placement]` from the booking `notes` and shows it as a Placement chip. `bookings.custom_fields` exists and the public booking widget writes it, but the drawer does not render arbitrary intake JSON. |
| **Weekly Opening Hours** | **Yes** | `POST /api/admin/hours` (alias `POST /api/admin/schedule`) | 7-day open/closed toggles with time pickers. Sends a `shifts` day-map (or an `hours` array); the API validates the shape before deleting, then replaces the tenant's `hours` rows. All-closed is a valid state. |
| **Slot Step Interval** | **Yes** | `POST /api/admin/hours`, `tenants.slot_step_min` | Admin select for 15 / 30 / 45 / 60 minutes; clamped to 1–240 server-side. |
| **Plan Ahead / Date Overrides** | **Yes** | `POST /api/admin/hours`, `tenants.profile.date_overrides` | Month multi-select with "entire month", "weekends only", "weekdays only". Per-date open/closed state and optional custom shifts. Persisted in the tenant profile and honoured by the availability engine. |
| **Blackout API** | **Yes** | `GET/POST/DELETE /api/admin/blackouts` | `start_utc`, `end_utc`, optional `reason`. The availability engine excludes overlapping slots. |
| **Blackout Admin UI** | **Yes** | In-page Block Time modal, `GET/POST/DELETE /api/admin/blackouts` | Quick 30-min break, Close Rest of Day, and custom date/time range with optional reason. Persists `start_utc`/`end_utc` to `blackouts`, displays formatted intervals, and provides deletion control. |
| **Studio Settings** | **Yes** | `POST /api/admin/settings`, `POST /api/admin/settings/test-email` | Theme presets + custom HEX, studio name, org number, address, WhatsApp, public client email, private owner email, activity log, and a "Send Test Ping" button. The API accepts 10 string fields, 4 numeric fields and `owner_email`. |
| **Owner Transfer** | **Yes** | `POST /api/admin/settings` | Changing `owner_email` deactivates the displaced owner, revokes their sessions, returns `owner_changed` / `reauthentication_required`, and the portal locks itself so the new owner signs in. Exactly one active owner per tenant. |
| **Activity Log** | **Yes** | `GET /api/admin/audit`, `admin_events` | Settings tab lists who approved, moved or emailed a booking, with a Refresh button. |
| **Email Deliverability** | **Yes** | `bookings.customer_email_status*`, `POST /api/admin/bookings/resend` | Bounce/failure state is shown in the drawer with a corrected-address resend. Owner bounce alerts and a test ping are supported. |
| **Reminders** | **Yes (cron)** | `GET /api/cron/reminders` | Hourly job sends 24-hour and 2-hour reminders for confirmed bookings; `reminder_24h_sent_at` / `reminder_2h_sent_at` make it idempotent. Protected by `CRON_SECRET`. |
| **Multi-Service Booking** | **Yes (public widget)** | `service_ids`, `service_summary` | The public booking widget can submit several services. The admin manual-booking form is single-service. |
| **Platform Console** | **Yes** | `/platform`, `/api/platform/**` | Tenant matrix, branding workbench, contacts, catalog, access and platform audit feed. Platform OTP uses the same session model with `scope: "platform"`. |
| **Tenant Switcher** | **Yes** | Header `<select>` | Shown when the signed-in operator can access more than one tenant; navigation keeps `?tenant=` in the URL. |
| **Demo Sandbox** | **Yes** | `?demo=1` / `?demo=true` / `demo-studio` | Loads mock bookings without a real session and offers a Reset Data pill. |
| **Customer Booking History** | **No** | N/A | No CRM view grouping prior visits by phone/email. |
| **Daily Revenue / Sales Dashboard** | **No** | N/A | No financial metrics, totals or POS reporting. |
| **SMS Notifications** | **No** | N/A | Email only; the drawer opens the native dialer / WhatsApp. |
| **Payments / Deposits** | **No** | N/A | `deposit_nok` is stored, but there is no payment capture or status. |
| **Multi-Staff / Chair Columns** | **No** | N/A | Single-chair, single-tenant scheduling. |

---

## 2. Interactive Actions Currently Available

### 2.1 Login Gate
- **Send verification code** → `POST /api/admin/auth/send-otp`.
- **Resend code** → same endpoint.
- **Change email** → returns to the email step.
- **Verify** → `POST /api/admin/auth/verify-otp`; sets the session cookie.
- **Try Demo Sandbox (No Login Required)** → local mock data.

### 2.2 Header
- **Tenant switcher** → `router.push("/admin?tenant=...")` (only when more than one tenant is accessible).
- **+ New Booking** → manual booking modal.
- **Lock** → revokes the session server-side first, then clears state and returns to the neutral login gate.

### 2.3 Calendar
- **Week / Month toggle**, previous / next month, **Today**, day pills, month cells.
- **Sheet handle** → cycles the bottom sheet detent (peek / mid / upper).
- **Block Time** → opens the Block Time modal.
- **Sync Calendar** → toast only; it does not refetch.

### 2.4 Appointments
- **Active / Pending / Confirmed / Archive / All** segments and search.
- **Pending review banner** → jumps to the Pending segment.
- **Approve** / **Decline** triage buttons on cards.
- **Archive** section expand / collapse.

**Known defect:** `normalizeBooking` converts `start_utc` to a UTC ISO string and the UI slices the clock time out of it, so live bookings render in UTC instead of `tenants.timezone` (verified: a 17:30 Oslo booking displays as 16:30).

### 2.5 Client Drawer
- **Call**, **WhatsApp**, **Email**.
- **Resend email** (shown when delivery failed or bounced).
- **Approve Appointment** / **Decline** for pending bookings.
- **Reschedule** / **Cancel Appointment** for active bookings.
- Drag down or tap the handle to dismiss.

### 2.6 Manual Booking Modal
- Service dropdown populated from `GET /api/v1/t/[slug]/services` (falls back to three built-in options).
- Date, time, full name, phone, optional email.
- **Create Appointment** → `POST /api/admin/bookings/manual`.

### 2.7 Reschedule Modal
- Date + start time, **Confirm Reschedule** → `POST /api/admin/bookings/reschedule`.

### 2.8 Block Time Modal
- **30 min break** → `POST /api/admin/blackouts` (30 min window from the browser's current time).
- **Close the rest of the day** → `POST /api/admin/blackouts` (until 23:59:59 in the browser's timezone).
- Date + start time + end time + reason + **Save block** → `POST /api/admin/blackouts`.
- **Active Blackouts List** → renders `start_utc`/`end_utc` formatted date/times with individual Delete control calling `DELETE /api/admin/blackouts?id=...`.

**Known defects (verified 2026-10-31 against `2201f2a`):**
- The date field defaults to *today* and is never seeded from `selectedDate`. Opening Block Time from a calendar day other than today still pre-fills today's date.
- All three write paths build timestamps in the **browser's** timezone and the list formats in the browser's timezone, while the availability engine uses `tenants.timezone` (`Europe/Oslo`). Verified with a browser set to `America/New_York`: a 13:00 block is stored as 19:00 Oslo time and then listed back as 13:00, so the row covers the wrong window for the studio.
- The list returns every `blackouts` row, including past ones.

### 2.9 Opening Hours
- Weekly open/closed toggles, start/end time pickers.
- Appointment slot duration select.
- **Plan Ahead & Custom Dates**: month navigation, bulk selection, open/closed switch, custom shifts.
- **+ Block Time** → opens the persistent Block Time modal (same modal as §2.8).
- **Save Operating Hours** → `POST /api/admin/hours` with `shifts`, `interval_min` and `date_overrides`.

### 2.10 Settings
- Theme preset swatches and a custom HEX sheet.
- Studio Profile fields (name, org number, address, WhatsApp, public client email, private owner email).
- **Refresh** activity log.
- **Save Studio Settings** → `POST /api/admin/settings`.
- **Send Test Ping** → `POST /api/admin/settings/test-email`.

---

## 3. Database Schema: Capabilities vs Constraints

### A. `bookings` — live columns
- `id` (bigint, PK)
- `ref` (text, unique, e.g. `GNG-B8RYV`)
- `tenant_id` (text, FK → `tenants`)
- `service_id` (bigint, FK → `services`)
- `start_utc`, `end_utc`, `block_end_utc` (bigint epoch seconds; `block_end_utc` includes turnaround)
- `status` (`'pending' | 'confirmed' | 'declined' | 'cancelled' | 'expired' | 'completed' | 'no_show'`)
- `customer_name`, `customer_email`, `customer_phone` (text)
- `notes` (text)
- `price_nok`, `deposit_nok` (integer)
- `consent_at` (bigint), `privacy_version` (text)
- `action_token_hash`, `manage_token_hash` (text)
- `created_at`, `expires_at`, `decided_at` (bigint epoch seconds)
- `service_ids` (jsonb array), `service_summary` (text) — multi-service support
- `custom_fields` (jsonb, default `'{}'::jsonb`) — intake answers
- `resend_email_id` (text)
- `customer_email_status`, `customer_email_error` (text)
- `customer_email_status_at` (bigint)
- `reminder_24h_sent_at`, `reminder_2h_sent_at` (bigint)

### B. `hours` — live columns
- `tenant_id` (text, FK → `tenants`)
- `weekday` (integer 0–6, **0 = Monday … 6 = Sunday**)
- `open_min` (integer, minutes from midnight, 0–1439)
- `close_min` (integer, minutes from midnight, 1–1440)

> There is no `operating_hours` table. `GET /api/admin/bookings` still contains a legacy fallback query against it when `hours` is empty; the query fails harmlessly and is dead code on the current schema.

### C. `blackouts` — live columns
- `id` (bigint, PK)
- `tenant_id` (text, FK → `tenants`)
- `start_utc`, `end_utc` (bigint epoch seconds; `CHECK end_utc > start_utc`)
- `reason` (text, nullable)

### D. `tenants` — relevant columns
- Identity/contact: `id`, `name`, `owner_email`, `ref_prefix`, `timezone`, `active`
- Public profile: `contact_email`, `phone`, `whatsapp`, `address`, `org_number`, `mva_status`, `hours_text`, `currency`, `logo_url`, `hero_image_url`, `watermark_url`, `favicon_url`, `profile`
- Branding/mail: `branding`, `from_name`, `reply_to`
- Scheduling: `buffer_min`, `slot_step_min`, `min_notice_min`, `max_days_ahead`, `pending_hold_min`, `allowed_origins`
- Timestamps: `created_at`, `updated_at`

### E. Missing Columns for Production Salon Operations

| Table | Missing Column | Type | Rationale |
|---|---|---|---|
| `bookings` | `rescheduled_at` | `BIGINT` | Track when and how many times an appointment was moved. |
| `bookings` | `rescheduled_from_utc` | `BIGINT` | Audit trail of the previous appointment time. |
| `bookings` | `internal_notes` | `TEXT` | Private staff notes (formula, behaviour, VIP) separate from customer notes. |
| `bookings` | `is_walk_in` | `BOOLEAN DEFAULT FALSE` | Segment walk-in traffic for analytics. |
| `bookings` | `payment_status` | `TEXT DEFAULT 'unpaid'` | `unpaid` / `deposit_paid` / `paid_in_store` / `refunded`. |
| `bookings` | `payment_method` | `TEXT` | `vipps` / `card_terminal` / `cash` / `stripe`. |
| `tenants` | `vat_number` | `TEXT` | Only if a separate VAT registration number is needed; `org_number` and `mva_status` already exist. |

---

## 4. Industry Standard Gap Analysis (Timma / Fresha)

| Feature Area | Timma / Fresha Standard | Current Studio Template | Priority |
|---|---|---|---|
| **Rescheduling UX** | Visual slot picker showing free times | Date + time picker; the server validates hours, notice, horizon, step, overlaps and blackouts, but the modal does not display free slots. | High |
| **Customer Re-confirmation on Reschedule** | Customer must accept the new time | Time changes immediately; the customer receives an informational update with `.ics`. | Medium |
| **Time Blocking (Pause / Holiday)** | Drag-to-block on the calendar, labelled lunch/vacation | Backend, availability engine and Block Time modal are connected: quick 30-min break, close rest of day, custom date/time range with reason, formatted list and delete. Remaining gap: no drag-to-block on the calendar surface. | Medium |
| **Walk-in / Fast Booking** | 10-second modal with client auto-suggest by phone | Manual booking modal exists with tenant catalog, date/time and contact fields; no client autocomplete. | Medium |
| **Customer Contact Quick Actions** | Integrated SMS gateway, call, WhatsApp | Call, WhatsApp and Email are implemented. No SMS gateway. | Low |
| **Financial / Revenue Summary** | "Today's revenue" completed vs pending | No revenue or payment reporting. | High |
| **Client History / CRM** | Per-client visit history, notes, spend | No grouped client view. | High |
| **Multi-Staff / Column View** | Columns per stylist/chair | Single-chair architecture. | Future |
| **Payments / Deposits** | Deposit capture, refunds, terminal integration | `deposit_nok` is stored but no capture flow. | Medium |
| **Reminders** | 24 h / 2 h SMS or email | 24 h / 2 h email cron is implemented and idempotent. | Done (email) |

---

## 5. Visual Calendar Component Data Contract

The portal normalises API rows into a local `BookingRecord` before rendering. A replacement calendar component should consume this shape (or the equivalent props), not the raw `Database["public"]["Tables"]["bookings"]["Row"]`.

```typescript
export type AdminBookingStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "expired"
  | "completed"
  | "no_show";

/** Shape the portal actually renders. */
export interface BookingRecord {
  ref: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  service_name: string;
  service_price?: number;
  duration_min?: number;
  /** ISO-8601 local timestamp, e.g. "2026-10-31T14:30:00" */
  scheduled_at: string;
  status: AdminBookingStatus;
  notes?: string;
  email_status?: string | null;
  email_error?: string | null;
}

export interface TenantProfile {
  id: string;
  name: string;
  tagline?: string;
  monogram?: string;
  logo_url?: string;
  palette?: {
    accent?: string;
    canopy?: string;
    sheet?: string;
    preset?: string;
  };
  owner_email?: string;
  contact_email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  org_number?: string;
}

export interface VisualCalendarProps {
  /** Selected Oslo date, YYYY-MM-DD. */
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  /** First day of the visible 7-day strip. */
  weekStartDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  /** All bookings for the tenant. */
  allBookings: BookingRecord[];
  /** Bookings for selectedDate, ascending by scheduled_at. */
  dayBookings: BookingRecord[];
  onBookingClick: (booking: BookingRecord) => void;
  onNewManualBooking: () => void;
}

export interface DayStripItem {
  dateStr: string;        // "YYYY-MM-DD"
  weekdayInitial: string; // "M", "T", "W", "T", "F", "S", "S"
  dayNum: number;         // 1–31
  isToday: boolean;
  hasAppointments?: boolean;
}
```

---

## Appendix: Corrections vs the 2026-10-02 Draft

1. **Non-existent files removed:** `src/components/admin/ClientDrawer.tsx`, `RescheduleModal.tsx`, `ManualBookingModal.tsx`, `app/admin/BlackoutsManager.tsx`, `app/admin/BookingsManager.tsx`, `app/admin/login/page.tsx`. The login gate is in-page.
2. **`page.tsx` size:** 648 lines → **4,494 lines**.
3. **`hours.weekday`:** "0 = Sunday" → **0 = Monday … 6 = Sunday**.
4. **`bookings.custom_fields`:** listed as missing → **exists** (jsonb, `20261028120000_booking_integrity.sql`) and is written by the public widget.
5. **`tenants.currency`:** listed as missing → **exists**. `vat_number` is the only genuinely missing invoice field; `org_number` and `mva_status` exist.
6. **Omitted `bookings` columns added:** `service_ids`, `service_summary`, `resend_email_id`, `customer_email_status`, `customer_email_status_at`, `customer_email_error`, `reminder_24h_sent_at`, `reminder_2h_sent_at`.
7. **`operating_hours`:** no such table. Only `hours` exists; the bookings route keeps a dead fallback query.
8. **UI language:** all admin copy is English (`Approve`, `Decline`, `Save Operating Hours`, `New Booking`). The Norwegian labels (`Godkjenn`, `Avlys`, `Bekreftet`, `Venter`, `Passerte`, `Synkroniser`, `Lagre …`) are gone.
9. **Quick-break handlers:** `handleCloseRestOfToday` / `handleInsertLunchPause` no longer exist. The Block Time modal's quick rows now persist real `blackouts` rows through `POST /api/admin/blackouts` (fixed in `2201f2a`).
10. **Week-strip easing:** `cubic-bezier(0.34, 1.35, 0.64, 1)`, not `(0.34, 1.56, 0.64, 1)`.
11. **Intake inspector:** parses `[placement]` out of `notes`; it does not render arbitrary `custom_fields` JSON.
12. **Dev bypass:** `POST /api/admin/dev-login` with `{ email }`, development-only (403 in production). Some admin routes also honour `?dev_bypass=true` in development.
13. **Settings scope:** not just name / owner / WhatsApp — the API accepts 10 string fields, 4 numeric fields and `owner_email`, including owner transfer.
14. **Logout:** in-page Lock button that revokes the session and returns to the neutral gate; no redirect to `/admin/login`.
15. **Missing features added to the matrix:** OTP login, platform console, tenant switcher, session cache, branding API, tenants API, activity log, email-status/resend, reminders, multi-service bookings, date overrides, demo sandbox, owner transfer.
16. **Reschedule validation:** the server validates hours, notice, horizon, step, overlaps and blackouts. The draft's "requires manual availability verification" was wrong; the real gap is the absence of a free-slot picker in the modal.
