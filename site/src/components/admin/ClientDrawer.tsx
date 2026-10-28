"use client";

import React, { useEffect, useState } from "react";
import type { Database } from "@/types/database";

export type AdminBooking = Database["public"]["Tables"]["bookings"]["Row"] & {
  services?: { name: string; duration_min: number } | null;
  service_summary?: string | null;
  custom_fields?: Record<string, any> | null;
};

interface ClientDrawerProps {
  booking: AdminBooking | null;
  tenantName: string;
  onClose: () => void;
  onStatusUpdate: (bookingId: number, status: "confirmed" | "declined" | "cancelled") => void;
  onReschedule?: (booking: AdminBooking) => void;
  actionLoading: number | null;
  /** Admin session token, used for the customer-email resend action. */
  token?: string | null;
  /** Called after a resend so the list and drawer reflect the new state. */
  onEmailUpdated?: (
    bookingId: number,
    email: string,
    status: string | null
  ) => void;
}

const EMAIL_STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  sent: { label: "Kvittering sendt", tone: "bg-neutral-100 text-neutral-600" },
  delivered: { label: "Kvittering levert", tone: "bg-emerald-100 text-emerald-800" },
  delayed: { label: "Kvittering forsinket", tone: "bg-amber-100 text-amber-800" },
  bounced: { label: "E-post finnes ikke", tone: "bg-red-100 text-red-800" },
  failed: { label: "Kvittering feilet", tone: "bg-red-100 text-red-800" },
  suppressed: { label: "Adresse blokkert", tone: "bg-red-100 text-red-800" },
  complained: { label: "Merket som spam", tone: "bg-red-100 text-red-800" },
};

function formatOsloDateTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleString("no-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOsloDate(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleDateString("no-NO", {
    timeZone: "Europe/Oslo",
    day: "numeric",
    month: "long",
  });
}

function formatOsloTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleTimeString("no-NO", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ClientDrawer({
  booking,
  tenantName,
  onClose,
  onStatusUpdate,
  onReschedule,
  actionLoading,
  token,
  onEmailUpdated,
}: ClientDrawerProps) {
  const [emailValue, setEmailValue] = useState(booking?.customer_email || "");
  const [editingEmail, setEditingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  useEffect(() => {
    setEmailValue(booking?.customer_email || "");
    setEditingEmail(false);
  }, [booking?.id, booking?.customer_email]);

  useEffect(() => {
    setEmailNotice(null);
  }, [booking?.id]);

  if (!booking) return null;

  // Clean phone number for WhatsApp link (e.g., +47 900 00 000 -> 4790000000)
  let cleanPhone = booking.customer_phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 8) {
    cleanPhone = "47" + cleanPhone;
  }

  const timeStr = formatOsloTime(booking.start_utc);
  const dateStr = formatOsloDate(booking.start_utc);
  const firstName = booking.customer_name.split(" ")[0] || booking.customer_name;
  const whatsappText = `Hei ${firstName}! Dette gjelder din time hos ${tenantName || "Gangina Studio"} ${dateStr} kl ${timeStr}.`;
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`;

  const isLoading = actionLoading === booking.id;

  const emailStatus = booking.customer_email_status || "";
  const emailStatusMeta = EMAIL_STATUS_LABEL[emailStatus];
  const emailFailed = ["bounced", "failed", "suppressed", "complained"].includes(
    emailStatus
  );

  const handleResendEmail = async () => {
    if (!token) {
      setEmailNotice("Mangler innlogging – logg inn på nytt.");
      return;
    }
    setSendingEmail(true);
    setEmailNotice(null);
    try {
      const res = await fetch("/api/admin/bookings/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ id: booking.id, email: emailValue.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailNotice(data.message || data.error || "Kunne ikke sende e-posten.");
        return;
      }
      onEmailUpdated?.(
        booking.id,
        data.customer_email || emailValue.trim(),
        data.email?.status ?? null
      );
      if (data.success) {
        setEditingEmail(false);
        setEmailNotice("Sendt på nytt. Du får varsel om adressen ikke finnes.");
      } else {
        setEmailNotice(
          `Ikke levert (${data.email?.status || "feil"}): ${
            data.email?.error || "ukjent årsak"
          }`
        );
      }
    } catch {
      setEmailNotice("Nettverksfeil under sending.");
    } finally {
      setSendingEmail(false);
    }
  };

  // Attempt to parse custom_fields if stored as JSON string or object
  let customFieldsObj: Record<string, any> = {};
  if (booking.custom_fields && typeof booking.custom_fields === "object") {
    customFieldsObj = booking.custom_fields;
  } else if (typeof booking.custom_fields === "string") {
    try {
      customFieldsObj = JSON.parse(booking.custom_fields);
    } catch {
      // not JSON
    }
  }

  const customFieldEntries = Object.entries(customFieldsObj);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-[20px] sm:rounded-3xl bg-white border border-[#EAE6E1] p-6 sm:p-7 space-y-5 shadow-2xl max-h-[92dvh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1 bg-[#EAE6E1] rounded-full mx-auto sm:hidden -mt-1 mb-2" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#EAE6E1] pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8a8a8a] tracking-wider block">
              Kundekort · Ref {booking.ref}
            </span>
            <h3 className="text-xl font-bold text-[#111113]">
              {booking.customer_name}
            </h3>
            <p className="text-xs text-[#8a8a8a] mt-0.5">
              {formatOsloDateTime(booking.start_utc)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8a8a8a] hover:text-[#111113] text-lg cursor-pointer p-1"
            aria-label="Lukk"
          >
            ✕
          </button>
        </div>

        {/* Quick Communication Actions: Primary WhatsApp, Secondary Email */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-[#8a8a8a] tracking-wider block">
            Klientkontakt
          </span>
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>💬</span>
              <span>Send WhatsApp melding</span>
            </a>
            {booking.customer_email ? (
              <a
                href={`mailto:${booking.customer_email}`}
                className="py-3 px-4 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-center text-xs font-semibold text-[#111113] hover:border-[#111113] transition-colors cursor-pointer"
              >
                E-post
              </a>
            ) : null}
          </div>
        </div>

        {/* Customer email delivery + repair */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#8a8a8a] tracking-wider block">
              Kundekvittering
            </span>
            {emailStatusMeta && (
              <span
                className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${emailStatusMeta.tone}`}
              >
                {emailStatusMeta.label}
              </span>
            )}
          </div>

          {editingEmail || emailFailed ? (
            <div className="space-y-2">
              <input
                type="email"
                inputMode="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="navn@epost.no"
                className="w-full rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] px-3 py-2.5 text-xs text-[#111113] outline-none focus:border-[#111113]"
              />
              <p className="text-[11px] leading-relaxed text-[#8a8a8a]">
                {emailFailed
                  ? "Adressen fikk ikke kvitteringen. Rett den opp og send på nytt."
                  : "Send kvitteringen til en annen adresse."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={sendingEmail || !emailValue.trim()}
                  onClick={handleResendEmail}
                  className="flex-1 py-2.5 rounded-xl bg-[#111113] text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {sendingEmail ? "Sender..." : "Send på nytt"}
                </button>
                {!emailFailed && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmail(false);
                      setEmailValue(booking.customer_email || "");
                      setEmailNotice(null);
                    }}
                    className="py-2.5 px-4 rounded-xl border border-[#EAE6E1] text-xs font-semibold text-[#111113] hover:border-[#111113] transition-colors cursor-pointer"
                  >
                    Avbryt
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] px-3 py-2.5">
              <span className="text-xs text-[#111113] truncate">
                {booking.customer_email}
              </span>
              <button
                type="button"
                onClick={() => setEditingEmail(true)}
                className="text-[11px] font-semibold text-[#111113] underline shrink-0 cursor-pointer"
              >
                Endre / send på nytt
              </button>
            </div>
          )}

          {emailNotice && (
            <p className="text-[11px] leading-relaxed text-[#8a8a8a]">
              {emailNotice}
            </p>
          )}
        </div>

        {/* Appointment Services & Price Details */}
        <div className="space-y-2 text-xs border border-[#EAE6E1] rounded-2xl p-4 bg-[#FAF8F5]">
          <div className="flex justify-between items-center">
            <span className="text-[#8a8a8a]">Behandling</span>
            <span className="font-semibold text-[#111113] text-right">
              {booking.service_summary ||
                booking.services?.name ||
                `Tjeneste #${booking.service_id}`}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#8a8a8a]">Totalbeløp</span>
            <span className="font-bold text-[#111113] text-sm">
              {booking.price_nok > 0 ? `${booking.price_nok} kr` : "Gratis"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#8a8a8a]">Buffer</span>
            <span className="text-[#8a8a8a]">10 min buffer inkludert</span>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-[#EAE6E1]">
            <span className="text-[#8a8a8a]">Status</span>
            <span
              className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                booking.status === "confirmed"
                  ? "bg-emerald-100 text-emerald-800"
                  : booking.status === "pending"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {booking.status}
            </span>
          </div>
        </div>

        {/* Intake Field Inspector */}
        <div className="space-y-2 text-xs">
          <span className="text-[10px] uppercase font-bold text-[#8a8a8a] tracking-wider block">
            Intake & Spesifikasjoner
          </span>

          {customFieldEntries.length > 0 ? (
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-white border border-[#EAE6E1]">
              {customFieldEntries.map(([key, val]) => (
                <div key={key} className="flex justify-between items-center py-0.5">
                  <span className="text-[#8a8a8a] capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span className="font-semibold text-[#111113] text-right">
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE6E1] text-[#8a8a8a] italic">
              Ingen egendefinerte intakfelter registrert.
            </div>
          )}

          {/* Customer notes */}
          {booking.notes && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] uppercase font-bold text-[#8a8a8a]">
                Kundenotat
              </span>
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE6E1] text-[#111113] text-xs whitespace-pre-wrap">
                {booking.notes}
              </div>
            </div>
          )}
        </div>

        {/* Status Control Actions */}
        <div className="space-y-2 pt-2 border-t border-[#EAE6E1]">
          {booking.status === "pending" && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onStatusUpdate(booking.id, "confirmed")}
              className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Oppdaterer..." : "Godkjenn time"}
            </button>
          )}

          {booking.status === "confirmed" && onReschedule && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReschedule(booking);
              }}
              className="w-full py-2.5 rounded-xl border border-[#111113] text-[#111113] font-semibold text-xs hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            >
              Flytt time (Endre tidspunkt)
            </button>
          )}

          {booking.status !== "cancelled" && booking.status !== "declined" && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onStatusUpdate(booking.id, "cancelled")}
              className="w-full py-2.5 rounded-xl border border-red-300 text-red-700 font-semibold text-xs hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Oppdaterer..." : "Avlys time"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
