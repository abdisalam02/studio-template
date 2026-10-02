# Admin Portal Capability & Feature Audit

**Document:** `ADMIN_CAPABILITY_AUDIT.md`  
**Date:** 2026-10-02  
**Target:** `studio-template/site` (Admin Portal & Scheduling Engine)  
**Status:** Audit & Architecture Analysis  

---

## 1. Current State Matrix

| Feature Name | Implemented? | Active Component / Endpoint | How It Works |
|---|---|---|---|
| **Visual 7-Day Agenda Timeline** | **Yes** | `src/app/admin/page.tsx` (`timelineDaysInStrip`, `timelineBookings`) | Displays an architectural 7-day strip with a GPU-composited sliding bubbly indicator (`cubic-bezier(0.34, 1.56, 0.64, 1)`). Selecting a day filters bookings for that Oslo local date and displays time-sequenced appointment cards with client name, treatment, and status badge. |
| **All-Bookings Feed & Filter** | **Yes** | `src/app/admin/page.tsx` (`filteredBookings`) | Segmented control filtering all bookings by `Alle`, `Venter (count)`, `Bekreftet`, and `Passerte`. Fetches all bookings ordered descending by `start_utc`. |
| **Admin Booking Fetch API** | **Yes** | `GET /api/admin/bookings?tenant_id=[slug]` | Server-side handler verifying admin session cookie or Bearer token (supports dev bypass in development). Queries Supabase `bookings`, `blackouts`, `services`, and `hours` in parallel. |
| **Booking Approval / Rejection** | **Yes** | `src/components/admin/ClientDrawer.tsx`, `src/app/admin/page.tsx`, `POST /api/admin/bookings/status` | Allows owner to confirm or decline pending appointments. Updates database status, stamps `decided_at`, generates an updated `.ics` calendar invite, and dispatches customer confirmation or rejection emails via Resend. |
| **Booking Cancellation** | **Yes** | `src/components/admin/ClientDrawer.tsx`, `POST /api/admin/bookings/status` | Transitions any active appointment to `cancelled`. |
| **Appointment Reschedule (Flytt time)** | **Yes** | `src/components/admin/RescheduleModal.tsx`, `POST /api/admin/bookings/reschedule` | Opens date & time selector for existing booking. Updates `start_utc`, recalculates `end_utc` & `block_end_utc` based on service duration and buffer, regenerates `.ics`, and dispatches an updated appointment email to the customer. |
| **Manual Booking Creation (Walk-in / Phone)** | **Yes** | `src/components/admin/ManualBookingModal.tsx`, `POST /api/admin/bookings/manual` | Form to book walk-ins or phone clients directly with customer name, phone, email, service, date, time, and notes. Directly creates a `confirmed` booking and sends customer confirmation email. |
| **Customer Quick-Contact** | **Yes** | `src/components/admin/ClientDrawer.tsx` | Instant trigger links: Direct Phone (`tel:`), Pre-filled WhatsApp message (`https://wa.me/...`), and Mail (`mailto:`). |
| **Customer Intake Inspector** | **Yes** | `src/components/admin/ClientDrawer.tsx` | Renders custom JSON intake answers (e.g. nail shape, gem placement, allergies) and raw customer booking notes. |
| **Weekly Recurring Opening Hours** | **Yes** | `src/app/admin/page.tsx`, `POST /api/admin/schedule`, `GET /api/admin/hours` | 7-day schedule editor with open/closed toggles and time pickers. Uses optimistic UI updates and saves via atomic batch upsert to `hours` / `operating_hours`. |
| **Slot Step Interval Configuration** | **Yes** | `src/app/admin/page.tsx`, `POST /api/admin/schedule` | Admin dropdown to toggle slot granularity (15, 30, 45, 60 min). |
| **Custom Time Blocking (Ferie / Fravær / Pauser)** | **Yes** | `src/app/admin/BlackoutsManager.tsx`, `POST /api/admin/blackouts`, `DELETE /api/admin/blackouts` | Enables scheduling custom blackout intervals (e.g. "Ferie", "Lunsjpause", "Sykdom"). Slot availability engine automatically excludes slots overlapping active blackouts. |
| **Quick Break Buttons** | **Yes** | `src/app/admin/page.tsx` (`handleCloseRestOfToday`, `handleInsertLunchPause`) | One-click triggers to insert 30 min lunch break today or block remainder of the current working day as a blackout. |
| **Studio Settings & Notification Configuration** | **Yes** | `src/app/admin/page.tsx`, `POST /api/admin/settings`, `POST /api/admin/settings/test-email` | Updates studio name, owner notification email, and WhatsApp contact. Includes instant test notification email trigger. |
| **Dev Authentication Bypass** | **Yes** | `src/app/api/admin/dev-login/route.ts` | Allows rapid testing in `development` mode without SMS/OTP via `?dev_bypass=true`. Gated strictly behind `NODE_ENV === 'development'`. |
| **Customer Booking History per Client** | **No** | N/A | No dedicated CRM view grouping prior visits by phone/email. |
| **Daily Revenue / Sales Dashboard** | **No** | N/A | No daily/weekly financial metrics, totals, or POS reporting. |

---

## 2. Interactive Actions Currently Available

Every interactive button, modal, and drawer currently wired to database mutations:

1. **Agenda & Feed Cards:**
   - **Clicking a Booking Card**: Opens `ClientDrawer` modal with complete details, intake inspection, and action buttons.
   - **Godkjenn (`confirmed`)**: Triggers `POST /api/admin/bookings/status` with `status: "confirmed"`. Sends confirmation email + `.ics`.
   - **Avslå (`declined`)**: Triggers `POST /api/admin/bookings/status` with `status: "declined"`. Sends rejection email.
   - **Avlys (`cancelled`)**: Triggers `POST /api/admin/bookings/status` with `status: "cancelled"`.
   - **Flytt time**: Opens `RescheduleModal` to pick a new date and time; mutates via `POST /api/admin/bookings/reschedule`.
   - **Ring**: Native phone dialer link (`tel:${phone}`).
   - **WhatsApp**: Direct link opening WhatsApp web/app with pre-filled greeting.
   - **E-post**: Native mailto link (`mailto:${email}`).

2. **Top Bar & Header Controls:**
   - **+ BOOK TIME / + Registrer manuell time**: Opens `ManualBookingModal`. Triggers `POST /api/admin/bookings/manual`.
   - **Synkroniser**: Re-triggers full tenant data refresh (`loadData`).
   - **Lås (Logout)**: Clears admin session token and redirects to `/admin/login`.

3. **Schedule & Fravær Controls:**
   - **Steng i dag**: Adds blackout for remaining opening hours of today.
   - **Sett inn 30 min lunsjpause nå**: Adds blackout from 12:30–13:00 today.
   - **+ Planlegg ferie eller fravær**: Opens modal to create a custom start/end blackout with reason tag.
   - **Slett fravær**: Triggers `DELETE /api/admin/blackouts?id=[id]`.
   - **Lagre åpningstider**: Batch upserts 7-day schedule to database via `POST /api/admin/schedule`.

4. **Studio Settings:**
   - **Lagre innstillinger**: Updates `tenants` table with studio name, owner email, and WhatsApp number.
   - **Send test-varsel**: Sends immediate verification email to owner address.

---

## 3. Database Schema Capabilities vs Constraints

### A. Fields Present on `bookings` Table
- `id` (bigint, PK)
- `ref` (text, unique booking reference code, e.g. `GNG-9B2C1`)
- `tenant_id` (text, FK -> tenants)
- `service_id` (bigint, FK -> services)
- `start_utc` (bigint epoch seconds)
- `end_utc` (bigint epoch seconds)
- `block_end_utc` (bigint epoch seconds, includes turnaround/buffer time)
- `status` (`'pending' | 'confirmed' | 'declined' | 'cancelled' | 'expired' | 'completed' | 'no_show'`)
- `customer_name` (text)
- `customer_email` (text)
- `customer_phone` (text)
- `notes` (text, customer comments or manual booking tags)
- `price_nok` (integer)
- `deposit_nok` (integer, default 0)
- `consent_at` (bigint epoch seconds)
- `privacy_version` (text)
- `action_token_hash` (text, hash for owner single-click email actions)
- `manage_token_hash` (text, hash for customer self-service cancellation)
- `created_at` (bigint epoch seconds)
- `expires_at` (bigint epoch seconds, expiration for unapproved pending requests)
- `decided_at` (bigint epoch seconds, timestamp when owner approved/declined)

### B. Fields Present on `hours` / `operating_hours` Table
- `tenant_id` (text, FK -> tenants)
- `weekday` (integer 0–6, 0 = Sunday)
- `open_min` (integer, minutes from midnight 0–1439)
- `close_min` (integer, minutes from midnight 1–1440)

### C. Fields Present on `blackouts` Table
- `id` (bigint, PK)
- `tenant_id` (text, FK -> tenants)
- `start_utc` (bigint epoch seconds)
- `end_utc` (bigint epoch seconds)
- `reason` (text, e.g. "Ferie", "Lunsj", "Sykdom")

### D. Missing Columns for Production Salon Operations
| Target Table | Missing Column | Type | Rationale |
|---|---|---|---|
| `bookings` | `rescheduled_at` | `BIGINT` | Track when and how many times an appointment was moved. |
| `bookings` | `rescheduled_from_utc` | `BIGINT` | Audit trail of previous appointment time before reschedule. |
| `bookings` | `internal_notes` | `TEXT` | Private staff notes about client formula, behavior, or VIP status (separate from public customer notes). |
| `bookings` | `is_walk_in` | `BOOLEAN DEFAULT FALSE` | Segment walk-in traffic vs online bookings for analytics. |
| `bookings` | `payment_status` | `TEXT DEFAULT 'unpaid'` | Track payment status (`'unpaid' | 'deposit_paid' | 'paid_in_store' | 'refunded'`). |
| `bookings` | `payment_method` | `TEXT` | Payment method (`'vipps' | 'card_terminal' | 'cash' | 'stripe'`). |
| `bookings` | `custom_fields` | `JSONB DEFAULT '{}'::jsonb` | Native JSONB column for intake questions (currently inferred from mock or memory). |
| `tenants` | `currency` | `TEXT DEFAULT 'NOK'` | Explicit currency code for multi-currency deployments. |
| `tenants` | `vat_number` | `TEXT` | Norwegian Org. Nr. for receipts and legal footers. |

---

## 4. Industry Standard Gap Analysis (Compared to Timma / Fresha)

| Feature Area | Timma / Fresha Standard | Current Studio Template | Priority |
|---|---|---|---|
| **Rescheduling UX** | Visual drag-and-drop or slot picker showing staff availability | Modal with date/time text inputs. Requires manual availability verification by admin. | High |
| **Customer Re-confirmation on Reschedule** | Customer receives email/SMS with "Accept New Time" button | Updates time immediately and sends informational update email without requiring customer re-acknowledgment. | Medium |
| **Time Blocking (Pause/Ferie)** | Drag-to-block on calendar surface; label as lunch/vacation | Modal form and quick buttons writing to `blackouts` table. Functional in availability engine, but lacks visual placement directly inside the timeline. | Medium |
| **Walk-in / Fast Booking** | 10-second quick booking modal with auto-suggest client by phone | Functional `ManualBookingModal` exists with service dropdown and custom time. Lacks customer autocomplete from past bookings. | Medium |
| **Customer Contact Quick Actions** | Integrated SMS gateway, direct call, WhatsApp integration | Call (`tel:`), WhatsApp (`wa.me`), and Email (`mailto:`) all implemented. SMS gateway integration currently relies on native device dialer/SMS. | Low |
| **Financial / Revenue Summary** | "Dagens omsetning" widget showing completed NOK vs pending NOK | No revenue summary component implemented on admin dashboard. | High |
| **Multi-Staff / Column View** | Columns for multiple stylists/chairs | Single-chair / single-tenant architecture. Multi-staff column split not yet built. | Future |

---

## 5. Visual Calendar Component Data Contract

To replace or enhance the active agenda/calendar component (`site/src/app/admin/page.tsx`), the component interface and data dependencies are defined as follows:

```typescript
import type { Database } from "@/types/database";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "expired"
  | "completed"
  | "no_show";

export type AdminBooking = Database["public"]["Tables"]["bookings"]["Row"] & {
  services?: {
    name: string;
    duration_min: number;
  } | null;
  service_summary?: string | null;
  custom_fields?: Record<string, any> | null;
};

export interface VisualCalendarProps {
  /** Selected Oslo date string in YYYY-MM-DD format */
  selectedDate: string;
  /** Callback when user clicks or slides to a new date */
  onSelectDate: (dateStr: string) => void;
  /** Current start date of the visible 7-day strip (00:00:00 local) */
  weekStartDate: Date;
  /** Navigate -7 days */
  onPrevWeek: () => void;
  /** Navigate +7 days */
  onNextWeek: () => void;
  /** All bookings loaded for the tenant */
  allBookings: AdminBooking[];
  /** Bookings matching selectedDate, sorted ascending by start_utc */
  dayBookings: AdminBooking[];
  /** Callback when admin clicks an appointment card to inspect/manage */
  onBookingClick: (booking: AdminBooking) => void;
  /** Trigger to open manual appointment creation modal */
  onNewManualBooking: () => void;
}

export interface DayStripItem {
  dateStr: string;          // "YYYY-MM-DD"
  weekdayInitial: string;   // "M", "T", "O", "T", "F", "L", "S"
  dayNum: number;           // 1-31
  isToday: boolean;
  hasAppointments?: boolean;
}
```
