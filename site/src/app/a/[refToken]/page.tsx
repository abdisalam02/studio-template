import type { CSSProperties, ReactNode } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { parseRefToken, verifyReviewToken } from "@/lib/tokens";
import { getTenantConfig, type TenantColors } from "@/config/tenant.config";
import { resolveBrandLogo } from "@/lib/brandAsset";
import { ActionButtons } from "./ActionButtons";

// Delivery state and booking status change outside this request (webhook,
// approve/decline, reschedule). Never serve a cached review page.
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ refToken: string }>;
}

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

/** Exposes the resolved tenant palette as CSS custom properties. */
function themeStyle(colors: TenantColors): CSSProperties {
  return {
    "--c-canvas": colors.canvas,
    "--c-card": colors.card,
    "--c-band": colors.band,
    "--c-recessed": colors.recessed,
    "--c-border": colors.border,
    "--c-border-strong": colors.borderStrong,
    "--c-label": colors.label,
    "--c-soft": colors.soft,
    "--c-value": colors.value,
    "--c-value-text": colors.valueText,
    "--c-accent": colors.accent,
    "--c-green": colors.green,
    "--c-red": colors.red,
    "--c-warning": colors.warning,
  } as CSSProperties;
}

/**
 * Resolves the effective logo and whether it can actually be displayed.
 * Remote/data URLs are trusted; local (/img/...) logos are validated against
 * the public/img directory so a missing asset falls back to the monogram.
 * Mirrors the disk check used by the email renderer.
 */
function resolveLogoAsset(
  source: string | null | undefined,
  fallback: string
): { src: string; hasLogo: boolean } {
  const candidate = (source || fallback || "").trim();
  if (!candidate) return { src: "", hasLogo: false };

  // Hosted / inline logos are trusted as-is.
  if (/^(https?:|data:)/i.test(candidate)) {
    return { src: candidate, hasLogo: true };
  }

  // Resolve local assets against public/img with URL-encoding and Unicode
  // tolerance, returning the actual stored path when a match exists.
  const resolved = resolveBrandLogo(candidate);
  if (resolved) {
    return { src: resolved.src, hasLogo: true };
  }

  return { src: candidate, hasLogo: false };
}

function DetailRow({
  label,
  colors,
  children,
}: {
  label: string;
  colors: TenantColors;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5">
      <dt
        className="pt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--c-label)]"
        style={{ color: colors.label }}
      >
        {label}
      </dt>
      <dd
        className="max-w-[64%] text-right text-sm font-semibold text-[var(--c-value)]"
        style={{ color: colors.value }}
      >
        {children}
      </dd>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02c-1.5 0-2.97-.4-4.25-1.17l-.3-.18-3.12.82.83-3.04-.2-.31a8.24 8.24 0 0 1-1.26-4.03c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23s-3.69 8.01-8.17 8.01zm4.52-6.16c-.25-.12-1.47-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.79.97-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43l-.48-.01c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29z" />
    </svg>
  );
}

function StateScreen({
  tone,
  title,
  message,
  actionHref,
  actionLabel,
  colors,
}: {
  tone: "error" | "warning";
  title: string;
  message: string;
  actionHref: string;
  actionLabel: string;
  colors: TenantColors;
}) {
  const toneColor = tone === "error" ? colors.red : colors.warning;
  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-[var(--c-canvas)] p-4 text-[var(--c-value)] antialiased sm:p-6"
      style={{ ...themeStyle(colors), backgroundColor: colors.canvas, color: colors.value }}
    >
      <div
        className="w-full max-w-[440px] rounded-[28px] border border-[var(--c-border)] bg-[var(--c-card)] p-8 text-center shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]"
        style={{ borderColor: colors.border, backgroundColor: colors.card }}
      >
        <div
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border"
          style={{
            borderColor: `${toneColor}33`,
            backgroundColor: `${toneColor}1A`,
            color: toneColor,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold tracking-tight" style={{ color: toneColor }}>
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--c-label)]" style={{ color: colors.label }}>
          {message}
        </p>
        <a
          href={actionHref}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--c-value)] px-5 py-2.5 text-sm font-semibold text-[var(--c-value-text)] transition active:scale-[0.99] hover:opacity-90"
          style={{ backgroundColor: colors.value, color: colors.valueText }}
        >
          {actionLabel}
        </a>
      </div>
    </main>
  );
}

export default async function OwnerReviewPage({ params }: PageProps) {
  const { refToken } = await params;
  const parsed = parseRefToken(refToken);
  const defaultColors = getTenantConfig().theme.colors;

  if (!parsed || !supabaseAdmin) {
    return (
      <StateScreen
        tone="error"
        title="Invalid link"
        message="This review link is incomplete or malformed."
        actionHref="/admin"
        actionLabel="Go to the control panel"
        colors={defaultColors}
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
        tone="error"
        title="Booking not found"
        message={`No booking was found with reference ${ref}.`}
        actionHref="/admin"
        actionLabel="Go to the control panel"
        colors={defaultColors}
      />
    );
  }

  const isValid = verifyReviewToken(ref, token, booking.action_token_hash);
  if (!isValid) {
    return (
      <StateScreen
        tone="warning"
        title="Security link expired"
        message="The code for direct review is invalid or has already been used."
        actionHref={`/admin?ref=${encodeURIComponent(ref)}`}
        actionLabel="Sign in to review in the control panel"
        colors={defaultColors}
      />
    );
  }

  const tenant = booking.tenants as unknown as {
    id?: string;
    name: string;
    timezone: string;
    logo_url?: string | null;
  } | null;

  const service = booking.services as unknown as {
    name: string;
    duration_min: number;
  } | null;

  const config = getTenantConfig(tenant?.id);
  const colors = config.theme.colors;
  const studioName = tenant?.name || config.name;

  const timeString = formatOsloDateTime(booking.start_utc);
  const logoSrc = tenant?.logo_url || config.theme.logoUrl;
  const { src: resolvedLogoSrc, hasLogo } = resolveLogoAsset(logoSrc, config.theme.logoUrl);
  const monogram = (config.theme.monogram || studioName.slice(0, 2) || "•").toUpperCase();

  const failedStatuses = ["bounced", "failed", "suppressed", "complained"];
  const emailStatus = booking.customer_email_status || "";
  const emailFailed = failedStatuses.includes(emailStatus);
  const emailError = booking.customer_email_error || "";

  const waDigits = (booking.customer_phone || "").replace(/[^\d]/g, "");
  const waNumber = waDigits.length === 8 ? `47${waDigits}` : waDigits;
  const waHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
        `Hi ${booking.customer_name}! About your booking at ${studioName} (ref. ${booking.ref}).`
      )}`
    : "";

  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-[var(--c-canvas)] p-4 text-[var(--c-value)] antialiased sm:p-6"
      style={{ ...themeStyle(colors), backgroundColor: colors.canvas, color: colors.value }}
    >
      <div className="w-full max-w-[480px]">
        <div
          className="relative overflow-hidden rounded-[28px] border border-[var(--c-border)] bg-[var(--c-card)] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]"
          style={{ borderColor: colors.border, backgroundColor: colors.card }}
        >
          {/* Logo watermark */}
          {hasLogo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                aria-hidden="true"
                alt=""
                src={resolvedLogoSrc}
                className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] max-w-none -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.05]"
              />
            </>
          ) : (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[10rem] font-black uppercase leading-none tracking-tighter opacity-[0.045]"
              style={{ color: colors.value }}
            >
              {monogram}
            </span>
          )}
          <div className="relative">
          {/* Branding header */}
          <header
            className="border-b border-[var(--c-border)] bg-[var(--c-band)] px-6 py-6 sm:px-8"
            style={{ borderColor: colors.border, backgroundColor: colors.band }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {hasLogo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedLogoSrc}
                      alt={studioName}
                      width={44}
                      height={44}
                      className="h-11 w-11 shrink-0 object-contain"
                    />
                  </>
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tracking-[0.04em]"
                    style={{
                      borderColor: colors.borderStrong,
                      backgroundColor: colors.recessed,
                      color: colors.accent,
                    }}
                  >
                    {monogram}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--c-label)]" style={{ color: colors.label }}>
                    {studioName}
                  </p>
                  <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-[var(--c-value)] sm:text-2xl" style={{ color: colors.value }}>
                    Review booking
                  </h1>
                </div>
              </div>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--c-border-strong)] bg-[var(--c-card)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--c-label)]"
                style={{ borderColor: colors.borderStrong, backgroundColor: colors.card, color: colors.label }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-accent)]" style={{ backgroundColor: colors.accent }} />
                Booking request
              </span>
            </div>
          </header>

          {/* The page must not look like a normal order when the customer
              never received their confirmation. */}
          {emailFailed && (
            <section
              className="border-b px-6 py-5 sm:px-8"
              style={{ borderColor: colors.border, backgroundColor: `${colors.red}0D` }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${colors.red}1A`, color: colors.red }}
                >
                  <WarningIcon />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: colors.red }}>
                    Confirmation email not delivered
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: colors.label }}>
                    The address <strong style={{ color: colors.value }}>{booking.customer_email}</strong> does
                    not exist. The customer entered it incorrectly, so they never received the
                    confirmation and do not know this booking exists.
                    {emailError ? ` (${emailError})` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-fix-email
                      className="cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold"
                      style={{ backgroundColor: colors.red, color: "#FFFFFF" }}
                    >
                      Fix the email address
                    </button>
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
                        style={{
                          borderColor: `${colors.green}44`,
                          backgroundColor: `${colors.green}12`,
                          color: colors.green,
                        }}
                      >
                        <WhatsAppIcon />
                        Contact on WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Structured summary */}
          <section className="px-6 py-6 sm:px-8">
            <dl className="divide-y divide-[var(--c-border)]">
              <DetailRow label="Reference" colors={colors}>
                <span className="tabular-nums">{booking.ref}</span>
              </DetailRow>

              <DetailRow label="Customer" colors={colors}>{booking.customer_name}</DetailRow>

              <DetailRow label="Phone" colors={colors}>
                <a
                  href={`tel:${booking.customer_phone}`}
                  className="text-[var(--c-value)] underline decoration-[var(--c-border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--c-accent)]"
                  style={{ color: colors.value }}
                >
                  {booking.customer_phone}
                </a>
              </DetailRow>

              <DetailRow label="Email" colors={colors}>
                {emailFailed ? (
                  <button
                    type="button"
                    data-fix-email
                    title="The confirmation could not be delivered — click to fix the address"
                    className="inline-flex cursor-pointer items-center justify-end gap-1.5 text-right underline decoration-1 underline-offset-4"
                    style={{ color: colors.red }}
                  >
                    <WarningIcon />
                    <span className="break-all">{booking.customer_email}</span>
                  </button>
                ) : (
                  <a
                    href={`mailto:${booking.customer_email}`}
                    className="text-[var(--c-value)] underline decoration-[var(--c-border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--c-accent)]"
                    style={{ color: colors.value }}
                  >
                    {booking.customer_email}
                  </a>
                )}
              </DetailRow>

              <DetailRow label="Treatment" colors={colors}>
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  <span>{service?.name || "Treatment"}</span>
                  <span
                    className="rounded-full border border-[var(--c-border-strong)] bg-[var(--c-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--c-label)]"
                    style={{ borderColor: colors.borderStrong, backgroundColor: colors.border, color: colors.label }}
                  >
                    {service?.duration_min || 0} min
                  </span>
                </span>
              </DetailRow>

              <DetailRow label="Time" colors={colors}>
                <span className="capitalize">{timeString}</span>
              </DetailRow>

              <DetailRow label="Price" colors={colors}>
                <span className="text-base tabular-nums">{booking.price_nok} kr</span>
              </DetailRow>
            </dl>

            {booking.notes && (
              <div className="mt-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--c-label)]" style={{ color: colors.label }}>
                  Customer note
                </p>
                <p
                  className="whitespace-pre-wrap rounded-2xl border border-[var(--c-border)] bg-[var(--c-recessed)] p-4 text-sm leading-relaxed text-[var(--c-label)]"
                  style={{ borderColor: colors.border, backgroundColor: colors.recessed, color: colors.label }}
                >
                  {booking.notes}
                </p>
              </div>
            )}
          </section>

          {/* Actions */}
          <footer
            className="border-t border-[var(--c-border)] bg-[var(--c-band)] px-6 py-6 sm:px-8"
            style={{ borderColor: colors.border, backgroundColor: colors.band }}
          >
            <ActionButtons
              refCode={booking.ref}
              token={token}
              currentStatus={booking.status}
              phone={booking.customer_phone}
              customerName={booking.customer_name}
              studioName={studioName}
              theme={colors}
              customerEmail={booking.customer_email}
              emailStatus={booking.customer_email_status}
              emailError={booking.customer_email_error}
              startUtc={booking.start_utc}
              durationMinutes={service?.duration_min || 30}
            />
          </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
