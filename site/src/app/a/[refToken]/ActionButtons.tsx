"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
  startUtc?: number;
  durationMinutes?: number;
}

const WHATSAPP_GREEN = "#25D366";
const FAILED_EMAIL_STATUSES = ["bounced", "failed", "suppressed", "complained"];

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
  if (digits.length === 8) digits = `47${digits}`;
  return digits;
}

/** True when the palette surface is dark, so native inputs use dark chrome. */
function isDarkColor(hex: string): boolean {
  const clean = (hex || "").replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean;
  if (full.length !== 6 || /[^0-9a-f]/i.test(full)) return true;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

/** Input styling that stays readable on both light and dark tenant palettes. */
function fieldStyle(colors: TenantColors, dark: boolean): CSSProperties {
  return {
    backgroundColor: colors.recessed,
    borderColor: colors.borderStrong,
    color: colors.value,
    caretColor: colors.accent,
    colorScheme: dark ? "dark" : "light",
  };
}

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function WarningIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
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

function Modal({
  title,
  subtitle,
  colors,
  onClose,
  children,
  closeOnBackdrop = true,
}: {
  title: string;
  subtitle?: string;
  colors: TenantColors;
  onClose: () => void;
  children: ReactNode;
  closeOnBackdrop?: boolean;
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const nodes = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={subtitle ? descId : undefined}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 font-sans backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={() => closeOnBackdrop && onClose()}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[440px] rounded-t-[22px] border bg-white p-6 shadow-2xl sm:rounded-[22px]"
        style={{
          borderColor: colors.border,
          backgroundColor: colors.card,
          animation: "reviewSheetIn 240ms cubic-bezier(0.22,0.8,0.24,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id={titleId} className="text-lg font-semibold tracking-tight" style={{ color: colors.value }}>
              {title}
            </h3>
            {subtitle && (
              <p id={descId} className="mt-1 text-xs leading-relaxed" style={{ color: colors.label }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="cursor-pointer p-1 text-sm"
            style={{ color: colors.label }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
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
  startUtc,
  durationMinutes = 30,
}: ActionButtonsProps) {
  const colors = theme ?? getTenantConfig().theme.colors;
  const dark = isDarkColor(colors.card);
  const [status, setStatus] = useState<string>(currentStatus);
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState<string>(customerEmail || "");
  const [deliveryStatus, setDeliveryStatus] = useState<string>(emailStatus || "");
  const [deliveryError, setDeliveryError] = useState<string | null>(emailError || null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const [modal, setModal] = useState<
    null | "approve" | "approve-warning" | "decline" | "reschedule" | "email"
  >(null);

  const initialStart = startUtc ? new Date(startUtc * 1000) : new Date();
  const [newDate, setNewDate] = useState(
    `${initialStart.getFullYear()}-${String(initialStart.getMonth() + 1).padStart(2, "0")}-${String(initialStart.getDate()).padStart(2, "0")}`
  );
  const [newTime, setNewTime] = useState(
    `${String(initialStart.getHours()).padStart(2, "0")}:${String(initialStart.getMinutes()).padStart(2, "0")}`
  );
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleNotice, setRescheduleNotice] = useState<string | null>(null);

  const loading = pending !== null;
  const emailFailed = FAILED_EMAIL_STATUSES.includes(deliveryStatus);

  // The red email row / banner live in the server-rendered summary, so they
  // open the same repair dialog through a shared attribute.
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll("[data-fix-email]"));
    const openEmailDialog = (event: Event) => {
      event.preventDefault();
      setModal("email");
    };
    elements.forEach((element) => element.addEventListener("click", openEmailDialog));
    return () => elements.forEach((element) => element.removeEventListener("click", openEmailDialog));
  }, []);

  const waNumber = toWhatsAppNumber(phone || "");
  const waMessage = encodeURIComponent(
    `Hi${customerName ? ` ${customerName}` : ""}! About your booking request${
      studioName ? ` at ${studioName}` : ""
    } (ref. ${refCode}).`
  );
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${waMessage}` : "";

  const runDecision = async (decision: "accept" | "decline") => {
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
      setModal(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not complete the action.";
      setError(message);
    } finally {
      setPending(null);
    }
  };

  const resendEmail = async () => {
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
        setEmailNotice("Sent. If the address is wrong again, the error appears here.");
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

  const submitReschedule = async () => {
    if (rescheduling) return;
    setRescheduling(true);
    setRescheduleNotice(null);

    try {
      const res = await fetch("/api/action/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refCode, token, date: newDate, time: newTime }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRescheduleNotice(data.message || data.error || "Could not move the booking.");
        return;
      }

      if (data.email?.status) {
        setDeliveryStatus(data.email.status);
        setDeliveryError(data.email.error || null);
      }

      setModal(null);
      setStatus((current) => current);
      setRescheduleNotice(null);
      window.location.reload();
    } catch {
      setRescheduleNotice("Network error while rescheduling.");
    } finally {
      setRescheduling(false);
    }
  };

  const emailStatusLabel = emailFailed
    ? "Confirmation not delivered"
    : deliveryStatus === "delivered"
      ? "Confirmation delivered"
      : deliveryStatus === "sent"
        ? "Confirmation sent"
        : deliveryStatus === "delayed"
          ? "Delivery delayed"
          : "";

  const emailTone = emailFailed
    ? colors.red
    : deliveryStatus === "delivered"
      ? colors.green
      : colors.label;

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
          <p className="mt-1 text-xs leading-relaxed" style={{ color: colors.label }}>
            The customer has been emailed the updated status.
          </p>
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
            Contact on WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3" style={themeStyle(colors)}>
      {error && (
        <div
          role="alert"
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

      {/* Delivery state: red and clickable when the customer never got the mail */}
      {emailStatusLabel && (
        <button
          type="button"
          onClick={() => setModal("email")}
          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors"
          style={{
            borderColor: `${emailTone}40`,
            backgroundColor: `${emailTone}12`,
            color: emailTone,
          }}
        >
          <span className="flex min-w-0 items-center gap-2">
            {emailFailed && <WarningIcon />}
            <span className="min-w-0">
              <span className="block text-xs font-semibold">{emailStatusLabel}</span>
              <span
                className="mt-0.5 block truncate text-[11px] font-normal"
                style={{ color: colors.label }}
              >
                {email || "No address"}
                {emailFailed ? " · tap to fix" : ""}
              </span>
            </span>
          </span>
          <span className="shrink-0 text-[11px] font-semibold underline underline-offset-2">
            {emailFailed ? "Fix email" : "Edit"}
          </span>
        </button>
      )}

      {/* Approve gets its own row; muted while the customer has no email */}
      <button
        type="button"
        disabled={loading}
        onClick={() => setModal(emailFailed ? "approve-warning" : "approve")}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          backgroundColor: emailFailed ? `${colors.borderStrong}66` : colors.value,
          color: emailFailed ? colors.label : colors.valueText,
          border: emailFailed ? `1px solid ${colors.borderStrong}` : "1px solid transparent",
        }}
      >
        {pending === "accept" ? (
          <>
            <Spinner /> Approving…
          </>
        ) : (
          "Approve booking"
        )}
      </button>

      {/* Decline and reschedule share a row under it */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => setModal("decline")}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-3.5 text-sm font-semibold transition-all duration-200 hover:bg-[var(--c-border)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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

        <button
          type="button"
          disabled={loading}
          onClick={() => setModal("reschedule")}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-3.5 text-sm font-semibold transition-all duration-200 hover:bg-[var(--c-border)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ borderColor: colors.borderStrong, color: colors.value }}
        >
          Reschedule
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
          Contact on WhatsApp
        </a>
      )}

      {/* Approve confirmation — with an extra warning when the customer
          never received their email. */}
      {modal === "approve" && (
        <Modal
          title="Approve this booking?"
          subtitle={`${customerName || "The customer"} will receive a confirmation email.`}
          colors={colors}
          onClose={() => !loading && setModal(null)}
        >
          {error && (
            <p className="mb-3 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: `${colors.red}33`, color: colors.red }}>
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={loading}
              onClick={() => runDecision("accept")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: colors.value, color: colors.valueText }}
            >
              {pending === "accept" ? <><Spinner /> Approving…</> : "Yes, approve"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setModal(null)}
              className="flex-1 rounded-full border px-5 py-3 text-sm font-semibold"
              style={{ borderColor: colors.borderStrong, color: colors.value }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {modal === "approve-warning" && (
        <Modal
          title="Approve without a confirmation email?"
          colors={colors}
          onClose={() => !loading && setModal(null)}
        >
          <div
            className="flex items-start gap-3 rounded-2xl border p-3"
            style={{ borderColor: `${colors.red}33`, backgroundColor: `${colors.red}0F` }}
          >
            <span className="mt-0.5" style={{ color: colors.red }}>
              <WarningIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 text-xs leading-relaxed" style={{ color: colors.label }}>
              <p className="font-semibold" style={{ color: colors.red }}>
                {email || "This address"} did not receive the confirmation.
              </p>
              <p className="mt-1">
                The customer does not know this booking exists. You can still approve it, but
                they will not receive a confirmation or calendar file.
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold" style={{ color: colors.value }}>
            Are you sure you want to approve the booking for {customerName || "this customer"}?
          </p>

          {error && (
            <p className="mt-3 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: `${colors.red}33`, color: colors.red }}>
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setModal("email")}
              className="inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold"
              style={{ borderColor: `${colors.red}55`, color: colors.red, backgroundColor: `${colors.red}0F` }}
            >
              Fix the email address first
            </button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={loading}
                onClick={() => runDecision("accept")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: colors.value, color: colors.valueText }}
              >
                {pending === "accept" ? <><Spinner /> Approving…</> : "Approve anyway"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setModal(null)}
                className="flex-1 rounded-full border px-5 py-3 text-sm font-semibold"
                style={{ borderColor: colors.borderStrong, color: colors.value }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Decline confirmation */}
      {modal === "decline" && (
        <Modal
          title="Decline this booking?"
          subtitle="The customer is emailed that the request could not be confirmed. You can still offer another time instead."
          colors={colors}
          onClose={() => !loading && setModal(null)}
        >
          {error && (
            <p className="mb-3 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: `${colors.red}33`, color: colors.red }}>
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={loading}
              onClick={() => runDecision("decline")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ borderColor: `${colors.red}55`, color: colors.red, backgroundColor: `${colors.red}0F` }}
            >
              {pending === "decline" ? <><Spinner /> Declining…</> : "Yes, decline"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setModal(null)}
              className="flex-1 rounded-full border px-5 py-3 text-sm font-semibold"
              style={{ borderColor: colors.borderStrong, color: colors.value }}
            >
              Cancel
            </button>
          </div>
          <button
            type="button"
            onClick={() => setModal("reschedule")}
            className="mt-3 w-full cursor-pointer text-center text-xs font-semibold underline underline-offset-4"
            style={{ color: colors.label }}
          >
            Reschedule instead
          </button>
        </Modal>
      )}

      {/* Reschedule */}
      {modal === "reschedule" && (
        <Modal
          title="Reschedule booking"
          subtitle={`New time for ${customerName || "the customer"}. They receive an updated confirmation with a calendar file.`}
          colors={colors}
          onClose={() => !rescheduling && setModal(null)}
        >
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: colors.label }}>
                New date
              </span>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={fieldStyle(colors, dark)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: colors.label }}>
                New time
              </span>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={fieldStyle(colors, dark)}
              />
            </label>

            {rescheduleNotice && (
              <p role="alert" className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: `${colors.red}33`, color: colors.red }}>
                {rescheduleNotice}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={rescheduling || !newDate || !newTime}
                onClick={submitReschedule}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: colors.value, color: colors.valueText }}
              >
                {rescheduling ? <><Spinner /> Moving…</> : "Confirm new time"}
              </button>
              <button
                type="button"
                disabled={rescheduling}
                onClick={() => setModal(null)}
                className="flex-1 rounded-full border px-5 py-3 text-sm font-semibold"
                style={{ borderColor: colors.borderStrong, color: colors.value }}
              >
                Cancel
              </button>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: colors.label }}>
              Duration {durationMinutes} min. Overlapping bookings are rejected automatically.
            </p>
          </div>
        </Modal>
      )}

      {/* Failed email explanation + repair */}
      {modal === "email" && (
        <Modal
          title={emailFailed ? "This email was not delivered" : "Customer email"}
          subtitle={emailFailed ? undefined : "Send the customer a fresh copy of this booking."}
          colors={colors}
          onClose={() => setModal(null)}
        >
          {emailFailed && (
            <div
              className="mb-4 flex items-start gap-3 rounded-2xl border p-3"
              style={{ borderColor: `${colors.red}33`, backgroundColor: `${colors.red}0F` }}
            >
              <span className="mt-0.5" style={{ color: colors.red }}>
                <WarningIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 text-xs leading-relaxed" style={{ color: colors.label }}>
                <p className="font-semibold" style={{ color: colors.red }}>
                  The address {email || "(none)"} does not exist.
                </p>
                <p className="mt-1">
                  The customer entered the email incorrectly, so they never received their
                  confirmation and do not know the booking exists.
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>Correct the address below and resend the email.</li>
                  <li>Or reach the customer on WhatsApp / phone to confirm directly.</li>
                </ol>
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: colors.label }}>
              Customer email
            </span>
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none placeholder:text-[var(--c-label)]"
              style={fieldStyle(colors, dark)}
            />
          </label>

          {emailNotice && (
            <p role="status" className="mt-2 text-[11px] leading-relaxed" style={{ color: colors.label }}>
              {emailNotice}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={sendingEmail || !email.trim()}
              onClick={resendEmail}
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: colors.value, color: colors.valueText }}
            >
              {sendingEmail ? <><Spinner /> Sending…</> : "Resend email"}
            </button>

            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold"
                style={{
                  borderColor: `${WHATSAPP_GREEN}33`,
                  backgroundColor: `${WHATSAPP_GREEN}14`,
                  color: colors.green,
                }}
              >
                <WhatsAppIcon />
                Contact on WhatsApp
              </a>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
