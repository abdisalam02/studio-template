import type { CSSProperties, ReactNode } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { parseRefToken, verifyToken } from "@/lib/tokens";
import { getTenantConfig, type TenantColors } from "@/config/tenant.config";
import { resolveBrandLogo } from "@/lib/brandAsset";
import { ActionButtons } from "./ActionButtons";

interface PageProps {
  params: Promise<{ refToken: string }>;
}

function formatOsloDateTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleString("no-NO", {
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
        title="Ugyldig lenke"
        message="Denne vurderingslenken er ufullstendig eller feilformatert."
        actionHref="/admin"
        actionLabel="Gå til kontrollpanel"
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
        title="Bestilling ikke funnet"
        message={`Fant ingen bestilling med referanse ${ref}.`}
        actionHref="/admin"
        actionLabel="Gå til kontrollpanel"
        colors={defaultColors}
      />
    );
  }

  const isValid = verifyToken(token, booking.action_token_hash);
  if (!isValid) {
    return (
      <StateScreen
        tone="warning"
        title="Sikkerhetslenke utløpt"
        message="Sikkerhetskoden for direkte vurdering er ugyldig eller allerede brukt."
        actionHref={`/admin?ref=${encodeURIComponent(ref)}`}
        actionLabel="Logg inn for å vurdere i kontrollpanelet"
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
                    Vurder bestilling
                  </h1>
                </div>
              </div>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--c-border-strong)] bg-[var(--c-card)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--c-label)]"
                style={{ borderColor: colors.borderStrong, backgroundColor: colors.card, color: colors.label }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-accent)]" style={{ backgroundColor: colors.accent }} />
                Timeforespørsel
              </span>
            </div>
          </header>

          {/* Structured summary */}
          <section className="px-6 py-6 sm:px-8">
            <dl className="divide-y divide-[var(--c-border)]">
              <DetailRow label="Referanse" colors={colors}>
                <span className="tabular-nums">{booking.ref}</span>
              </DetailRow>

              <DetailRow label="Kunde" colors={colors}>{booking.customer_name}</DetailRow>

              <DetailRow label="Telefon" colors={colors}>
                <a
                  href={`tel:${booking.customer_phone}`}
                  className="text-[var(--c-value)] underline decoration-[var(--c-border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--c-accent)]"
                  style={{ color: colors.value }}
                >
                  {booking.customer_phone}
                </a>
              </DetailRow>

              <DetailRow label="E-post" colors={colors}>
                <a
                  href={`mailto:${booking.customer_email}`}
                  className="text-[var(--c-value)] underline decoration-[var(--c-border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--c-accent)]"
                  style={{ color: colors.value }}
                >
                  {booking.customer_email}
                </a>
              </DetailRow>

              <DetailRow label="Behandling" colors={colors}>
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  <span>{service?.name || "Behandling"}</span>
                  <span
                    className="rounded-full border border-[var(--c-border-strong)] bg-[var(--c-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--c-label)]"
                    style={{ borderColor: colors.borderStrong, backgroundColor: colors.border, color: colors.label }}
                  >
                    {service?.duration_min || 0} min
                  </span>
                </span>
              </DetailRow>

              <DetailRow label="Tidspunkt" colors={colors}>
                <span className="capitalize">{timeString}</span>
              </DetailRow>

              <DetailRow label="Pris" colors={colors}>
                <span className="text-base tabular-nums">{booking.price_nok} kr</span>
              </DetailRow>
            </dl>

            {booking.notes && (
              <div className="mt-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--c-label)]" style={{ color: colors.label }}>
                  Kundens notat
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
            />
          </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
