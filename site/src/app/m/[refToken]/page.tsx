import { supabaseAdmin } from "@/lib/supabase";
import { parseRefToken, verifyManageToken } from "@/lib/tokens";
import { CancelButton } from "./CancelButton";
import { getTenantConfig } from "@/config/tenant.config";
import type { BookingStatus } from "@/types/database";

interface PageProps {
  params: Promise<{ refToken: string }>;
}

const CANCELLATION_WINDOW_HOURS = 24;

function formatOsloDateTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleString("en-GB", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function whatsappHref(rawPhone: string, message: string): string {
  let digits = (rawPhone || "").replace(/[^\d]/g, "");
  if (digits.length === 8) digits = `47${digits}`;
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : "";
}

function getStatusBadge(status: BookingStatus) {
  switch (status) {
    case "confirmed":
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          Confirmed
        </span>
      );
    case "pending":
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
          Awaiting approval
        </span>
      );
    case "cancelled":
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-neutral-500/10 text-neutral-500 border border-neutral-500/20">
          Cancelled
        </span>
      );
    case "declined":
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20">
          Declined
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-muted/20 text-muted border border-border">
          {status}
        </span>
      );
  }
}

function StateScreen({
  tone,
  title,
  message,
}: {
  tone: "red" | "amber";
  title: string;
  message: string;
}) {
  return (
    <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center space-y-4 font-mono text-xs">
        <h1 className={`text-base font-bold ${tone === "red" ? "text-red-500" : "text-amber-500"}`}>
          {title}
        </h1>
        <p className="text-muted">{message}</p>
        <a href="/" className="inline-block bg-foreground text-background px-4 py-2 rounded-lg font-semibold">
          Go to the website
        </a>
      </div>
    </main>
  );
}

export default async function CustomerManagePage({ params }: PageProps) {
  const { refToken } = await params;
  const parsed = parseRefToken(refToken);

  if (!parsed || !supabaseAdmin) {
    return (
      <StateScreen
        tone="red"
        title="Invalid management link"
        message="This link is incomplete or malformed."
      />
    );
  }

  const { ref, token } = parsed;

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*, tenants(*), services(*)")
    .eq("ref", ref)
    .single();

  if (error || !booking) {
    return (
      <StateScreen
        tone="red"
        title="Booking not found"
        message={`No booking was found with reference ${ref}.`}
      />
    );
  }

  if (!verifyManageToken(ref, token, booking.manage_token_hash)) {
    return (
      <StateScreen
        tone="amber"
        title="Link expired"
        message="The security code for this booking is no longer valid."
      />
    );
  }

  const tenant = booking.tenants as unknown as {
    name: string;
    phone?: string;
    owner_email?: string;
  } | null;

  const config = getTenantConfig(booking.tenant_id);
  const contactPhone = tenant?.phone || config.contact.phone || "";
  const contactEmail = tenant?.owner_email || config.contact.ownerEmail || "";

  const service = booking.services as unknown as {
    name: string;
    duration_min: number;
  } | null;

  const now = Math.floor(Date.now() / 1000);
  const hoursUntil = (booking.start_utc - now) / 3600;
  const isCancellableStatus = booking.status === "pending" || booking.status === "confirmed";
  const canSelfCancel = isCancellableStatus && hoursUntil >= CANCELLATION_WINDOW_HOURS;
  const insideWindow = isCancellableStatus && hoursUntil < CANCELLATION_WINDOW_HOURS;

  const studioName = tenant?.name || "Studio";
  const contactWa = whatsappHref(
    contactPhone,
    `Hi ${studioName}! About my appointment ${booking.ref} on ${formatOsloDateTime(
      booking.start_utc
    )} — I need to change or cancel it.`
  );

  const timeString = formatOsloDateTime(booking.start_utc);

  return (
    <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm font-mono">
        <header className="border-b border-border pb-4 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            {studioName} · Your booking
          </p>
          <div className="flex items-center justify-between pt-1">
            <h1 className="text-xl font-bold tracking-tight">Appointment</h1>
            {getStatusBadge(booking.status)}
          </div>
        </header>

        <section className="space-y-3 text-xs">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Reference:</span>
            <span className="font-bold">{booking.ref}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Studio:</span>
            <span className="font-bold">{studioName}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Treatment:</span>
            <span className="font-bold">
              {service?.name || "Treatment"} ({service?.duration_min || 0} min)
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Time (Oslo):</span>
            <span className="font-bold capitalize">{timeString}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Price:</span>
            <span className="font-bold">{booking.price_nok} kr</span>
          </div>

          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted">Booked for:</span>
            <span className="font-bold">{booking.customer_name}</span>
          </div>
        </section>

        {canSelfCancel && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-muted/10 border border-border text-[11px] text-muted space-y-1">
              <p className="font-bold text-foreground">Cancellation policy</p>
              <p>
                Free cancellation until {CANCELLATION_WINDOW_HOURS} hours before your
                appointment. Inside {CANCELLATION_WINDOW_HOURS} hours, please contact the studio.
              </p>
            </div>

            <CancelButton refCode={booking.ref} token={token} initialStatus={booking.status} />
          </div>
        )}

        {insideWindow && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-bold">Inside the {CANCELLATION_WINDOW_HOURS}-hour window</p>
              <p>
                Online cancellation is closed. Contact the studio directly and we will help you
                change or cancel the appointment.
              </p>
            </div>
            {contactWa && (
              <a
                href={contactWa}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 rounded-xl bg-emerald-600 text-white text-center text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors"
              >
                Contact the studio on WhatsApp
              </a>
            )}
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                  `Appointment ${booking.ref}`
                )}`}
                className="block w-full py-3 px-4 rounded-xl border border-border text-center text-xs font-bold uppercase tracking-wider hover:bg-muted/10 transition-colors"
              >
                Email the studio
              </a>
            )}
          </div>
        )}

        {!isCancellableStatus && (
          <div className="p-3.5 rounded-xl bg-muted/10 border border-border text-[11px] text-center text-muted">
            {booking.status === "cancelled"
              ? "This appointment has been cancelled."
              : booking.status === "declined"
                ? "This booking request was declined."
                : `Status: ${booking.status}`}
          </div>
        )}
      </div>
    </main>
  );
}
