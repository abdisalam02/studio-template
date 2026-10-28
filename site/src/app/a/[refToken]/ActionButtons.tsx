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
  customerEmail?: string;
  emailStatus?: string | null;
  emailError?: string | null;
}

const WHATSAPP_GREEN = "#25D366";

const FAILED_EMAIL_STATUSES = ["bounced", "failed", "suppressed", "complained"];

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
  customerEmail,
  emailStatus,
  emailError,
}: ActionButtonsProps) {
  const colors = theme ?? getTenantConfig().theme.colors;
  const [status, setStatus] = useState<string>(currentStatus);
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState<string>(customerEmail || "");
  const [deliveryStatus, setDeliveryStatus] = useState<string>(emailStatus || "");
  const [deliveryError, setDeliveryError] = useState<string | null>(emailError || null);
  const [fixingEmail, setFixingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const loading = pending !== null;
  const emailFailed = FAILED_EMAIL_STATUSES.includes(deliveryStatus);

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
        throw new Error(data.message || data.error || "Something went wrong. Please try again.");
      }

      setStatus(data.status);
      if (data.email?.status) {
        setDeliveryStatus(data.email.status);
        setDeliveryError(data.email.error || null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not complete the action.";
      setError(msg);
    } finally {
      setPending(null);
    }
  };

  const handleResendEmail = async () => {
    if (sendingEmail) return;
    setSendingEmail(true);
    setEmailNotice(null);

    try {
      const res = await fetch("/api/action/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refCode, token, email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setEmailNotice(data.message || data.error || "Could not send the email.");
        return;
      }

      if (data.customer_email) setEmail(data.customer_email);
      setDeliveryStatus(data.email?.status || "sent");
      setDeliveryError(data.email?.error || null);

      if (data.success) {
        setFixingEmail(false);
        setEmailNotice("Sent. If the address is wrong again, you will see the error here.");
      } else {
        setEmailNotice(
          `Not delivered (${data.email?.status || "error"}): ${
            data.email?.error || "unknown reason"
          }`
        );
      }
    } catch {
      setEmailNotice("Network error while sending.");
    } finally {
      setSendingEmail(false);
    }
  };

  const emailTone = emailFailed
    ? colors.red
    : deliveryStatus === "delivered"
    ? colors.green
    : colors.label;

  const emailSummary = emailFailed
    ? `Confirmation not delivered${email ? ` to ${email}` : ""}`
    : deliveryStatus === "delivered"
    ? `Confirmation delivered${email ? ` to ${email}` : ""}`
    : deliveryStatus === "sent"
    ? `Confirmation sent${email ? ` to ${email}` : ""}`
    : deliveryStatus === "delayed"
    ? `Delivery delayed${email ? ` to ${email}` : ""}`
    : "";

  if (status !== "pending") {
    const isConfirmed = status === "confirmed";
    const tone = isConfirmed ? colors.green : colors.red;
    return (
      <div className="space-y-3" style={themeStyle(colors)}>
        <div
          className="rounded-2xl border p-4 text-center"
          style={{ borderColor: `${tone}33`, backgroundColor: `${tone}1A` }}
        >
          <p className="text-sm font-semibold" style={{ color: tone }}>
            {isConfirmed ? "Booking approved" : "Booking declined"}
          </p>
          <p
            className="mt-1 text-xs leading-relaxed text-[var(--c-label)]"
            style={{ color: colors.label }}
          >
            The customer has been emailed the updated status.
          </p>
        </div>

        {emailFailed && (
          <EmailDeliveryCard />
        )}
      </div>
    );
  }

  const waNumber = toWhatsAppNumber(phone || "");
  const waMessage = encodeURIComponent(
    `Hi${customerName ? ` ${customerName}` : ""}! About your booking request${
      studioName ? ` at ${studioName}` : ""
    } (ref. ${refCode}).`
  );
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${waMessage}` : "";

  /** Red/green delivery row, expandable into a fix-and-resend editor. */
  function EmailDeliveryCard() {
    return (
      <div
        className="overflow-hidden rounded-2xl border text-left"
        style={{
          borderColor: `${emailTone}40`,
          backgroundColor: `${emailTone}12`,
        }}
      >
        <button
          type="button"
          onClick={() => setFixingEmail((open) => !open)}
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
          aria-expanded={fixingEmail}
        >
          <span className="min-w-0">
            <span className="block text-xs font-semibold" style={{ color: emailTone }}>
              {emailSummary}
            </span>
            {emailFailed && deliveryError && (
              <span
                className="mt-0.5 block truncate text-[11px] leading-relaxed"
                style={{ color: colors.label }}
              >
                {deliveryError}
              </span>
            )}
          </span>
          <span
            className="shrink-0 text-[11px] font-semibold underline decoration-1 underline-offset-2"
            style={{ color: emailTone }}
          >
            {fixingEmail ? "Close" : emailFailed ? "Fix email" : "Edit"}
          </span>
        </button>

        {fixingEmail && (
          <div
            className="space-y-2 border-t px-4 py-3"
            style={{ borderColor: `${emailTone}26` }}
          >
            <label
              className="block text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: colors.label }}
              htmlFor="review-customer-email"
            >
              Customer email
            </label>
            <input
              id="review-customer-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              className="w-full rounded-xl border bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-current"
              style={{ borderColor: colors.borderStrong, color: colors.value }}
            />
            <p className="text-[11px] leading-relaxed" style={{ color: colors.label }}>
              {emailFailed
                ? "Check the address for typos, then resend. The customer will receive the email that matches the current booking status."
                : "Send the customer a fresh copy of this booking."}
            </p>
            <button
              type="button"
              disabled={sendingEmail || !email.trim()}
              onClick={handleResendEmail}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: colors.value, color: colors.valueText }}
            >
              {sendingEmail && <Spinner />}
              {sendingEmail ? "Sending…" : "Resend email"}
            </button>
            {emailNotice && (
              <p className="text-[11px] leading-relaxed" style={{ color: colors.label }}>
                {emailNotice}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

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

      {emailSummary && <EmailDeliveryCard />}

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
              <Spinner /> Approving…
            </>
          ) : (
            "Approve booking"
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
              <Spinner /> Declining…
            </>
          ) : (
            "Decline booking"
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
          Contact customer on WhatsApp
        </a>
      )}
    </div>
  );
}
