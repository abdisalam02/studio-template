"use client";

import React from "react";
import type { ServiceRow } from "./Step1Services";

interface Step4ConfirmedProps {
  bookingRef: string;
  selectedServices: ServiceRow[];
  selectedSlotIso: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  tenantName: string;
  studioPhone?: string;
  currency?: string;
  onReset: () => void;
  onClose?: () => void;
}

function formatOsloDateTime(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleString("no-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Step4Confirmed({
  bookingRef,
  selectedServices,
  selectedSlotIso,
  customerName,
  customerEmail,
  customerPhone,
  tenantName,
  studioPhone = "+4740000000",
  currency = "kr",
  onReset,
  onClose,
}: Step4ConfirmedProps) {
  const totalPrice = selectedServices.reduce((acc, s) => acc + s.price_nok, 0);
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_min, 0);
  const timeFormatted = formatOsloDateTime(selectedSlotIso);
  const serviceSummary = selectedServices.map((s) => s.name).join(", ");

  // 1-Click WhatsApp link
  const cleanPhone = studioPhone.replace(/[^0-9]/g, "");
  const waText = encodeURIComponent(
    `Hei ${tenantName}! Jeg har sendt inn en timebestilling:\n` +
      `• Referanse: ${bookingRef}\n` +
      `• Behandling: ${serviceSummary}\n` +
      `• Tid: ${timeFormatted}\n` +
      `• Navn: ${customerName}`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone || "4740000000"}?text=${waText}`;

  return (
    <div className="space-y-5 text-center">
      {/* Success Badge & Header */}
      <div className="space-y-2 pt-2">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center text-xl font-bold">
          ✓
        </div>
        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wider text-[10px]">
          Forespørsel Registrert
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-[#18181b]">
          Takk for din bestilling!
        </h2>
        <p className="text-neutral-500 text-xs max-w-sm mx-auto leading-relaxed">
          Vi har registrert din reservasjon og sendt bekreftelse til{" "}
          <strong className="text-neutral-800">{customerEmail}</strong>.
        </p>
      </div>

      {/* Booking Reference Pill */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 border border-neutral-200">
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
          Referanse
        </span>
        <span className="text-sm font-black text-[#18181b] tracking-wider">
          {bookingRef}
        </span>
      </div>

      {/* Atelier Receipt Summary Card */}
      <div className="atelier-receipt-card text-left">
        <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
          Atelier Kvittering
        </div>

        <div className="receipt-row">
          <span className="receipt-label">Behandling</span>
          <span className="receipt-value">{serviceSummary}</span>
        </div>

        <div className="receipt-row">
          <span className="receipt-label">Tidspunkt</span>
          <span className="receipt-value capitalize">{timeFormatted}</span>
        </div>

        <div className="receipt-row">
          <span className="receipt-label">Varighet</span>
          <span className="receipt-value">ca. {totalDuration} minutter</span>
        </div>

        <div className="receipt-row">
          <span className="receipt-label">Kunde</span>
          <span className="receipt-value">
            {customerName} {customerPhone ? `(${customerPhone})` : ""}
          </span>
        </div>

        <div className="receipt-row">
          <span className="receipt-label">Totalpris</span>
          <span className="receipt-value text-base text-[#18181b]">
            {totalPrice} {currency}
          </span>
        </div>
      </div>

      {/* 1-Click WhatsApp Dispatch & Finish CTA */}
      <div className="space-y-2 pt-1">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-5 rounded-full bg-[#25D366] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
        >
          <span>Send melding på WhatsApp</span>
          <span aria-hidden="true">→</span>
        </a>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-5 rounded-full bg-[#18181b] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Lukk vindu
          </button>
        )}

        <div>
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-neutral-400 hover:text-neutral-800 underline transition-colors cursor-pointer"
          >
            Gjør en ny bestilling
          </button>
        </div>
      </div>
    </div>
  );
}
