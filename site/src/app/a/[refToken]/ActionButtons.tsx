"use client";

import { useState, type CSSProperties } from "react";
import { getTenantConfig, type TenantColors } from "@/config/tenant.config";

interface ActionButtonsProps {
  refCode: string;
  token: string;
  currentStatus: string;
  phone?: string;
  customerName?: string;
  studioName?: string;
  theme?: TenantColors;
}

const WHATSAPP_GREEN = "#25D366";

/** Exposes the resolved tenant palette as CSS custom properties. */
function themeStyle(colors: TenantColors): CSSProperties {
  return {
    "--c-card": colors.card,
    "--c-band": colors.band,
    "--c-border": colors.border,
    "--c-border-strong": colors.borderStrong,
    "--c-label": colors.label,
    "--c-value": colors.value,
    "--c-value-text": colors.valueText,
    "--c-accent": colors.accent,
    "--c-green": colors.green,
    "--c-red": colors.red,
  } as CSSProperties;
}

function toWhatsAppNumber(raw: string): string {
  let digits = (raw || "").replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Norwegian domestic numbers (8 digits) need the +47 country code for wa.me.
  if (digits.length === 8) digits = `47${digits}`;
  return digits;
}

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02c-1.5 0-2.97-.4-4.25-1.17l-.3-.18-3.12.82.83-3.04-.2-.31a8.24 8.24 0 0 1-1.26-4.03c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23s-3.69 8.01-8.17 8.01zm4.52-6.16c-.25-.12-1.47-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.79.97-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43l-.48-.01c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29z" />
    </svg>
  );
}

export function ActionButtons({
  refCode,
  token,
  currentStatus,
  phone,
  customerName,
  studioName,
  theme,
}: ActionButtonsProps) {
  const colors = theme ?? getTenantConfig().theme.colors;
  const [status, setStatus] = useState<string>(currentStatus);
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = pending !== null;

  const handleAction = async (decision: "accept" | "decline") => {
    if (loading) return;
    setPending(decision);
    setError(null);

    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refCode, token, decision }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Noe gikk galt under oppdatering.");
      }

      setStatus(data.status);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kunne ikke fullføre handlingen.";
      setError(msg);
    } finally {
      setPending(null);
    }
  };

  if (status !== "pending") {
    const isConfirmed = status === "confirmed";
    const tone = isConfirmed ? colors.green : colors.red;
    return (
      <div
        className="rounded-2xl border p-4 text-center"
        style={{ borderColor: `${tone}33`, backgroundColor: `${tone}1A` }}
      >
        <p className="text-sm font-semibold" style={{ color: tone }}>
          {isConfirmed ? "Avtalen er godkjent" : "Avtalen er avslått"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--c-label)]" style={{ color: colors.label }}>
          Kunden har mottatt e-post med oppdatert status.
        </p>
      </div>
    );
  }

  const waNumber = toWhatsAppNumber(phone || "");
  const waMessage = encodeURIComponent(
    `Hei${customerName ? ` ${customerName}` : ""}! Angående din timeforespørsel${
      studioName ? ` hos ${studioName}` : ""
    } (ref. ${refCode}).`
  );
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${waMessage}` : "";

  return (
    <div className="space-y-3" style={themeStyle(colors)}>
      {error && (
        <div
          className="rounded-2xl border px-4 py-3 text-xs leading-relaxed"
          style={{
            borderColor: `${colors.red}33`,
            backgroundColor: `${colors.red}1A`,
            color: colors.red,
          }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleAction("accept")}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--c-value)] px-5 py-3.5 text-sm font-semibold text-[var(--c-value-text)] transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: colors.value, color: colors.valueText }}
        >
          {pending === "accept" ? (
            <>
              <Spinner /> Godkjenner…
            </>
          ) : (
            "Godkjenn time"
          )}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleAction("decline")}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--c-border-strong)] bg-transparent px-5 py-3.5 text-sm font-semibold text-[var(--c-value)] transition-all duration-200 hover:border-[var(--c-border-strong)] hover:bg-[var(--c-border)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ borderColor: colors.borderStrong, color: colors.value }}
        >
          {pending === "decline" ? (
            <>
              <Spinner /> Avslår…
            </>
          ) : (
            "Avslå time"
          )}
        </button>
      </div>

      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.99]"
          style={{
            borderColor: `${WHATSAPP_GREEN}33`,
            backgroundColor: `${WHATSAPP_GREEN}14`,
            color: colors.green,
          }}
        >
          <WhatsAppIcon />
          Kontakt kunde på WhatsApp
        </a>
      )}
    </div>
  );
}
