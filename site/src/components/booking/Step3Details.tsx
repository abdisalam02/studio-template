"use client";

import React, { useState } from "react";
import type { CustomField } from "@/config/tenants/types";
import { YinYangWave } from "@/components/ui/YinYangWave";

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  notes: string;
  customFields: Record<string, string>;
  cancellationConsent: boolean;
}

interface Step3DetailsProps {
  customFields?: CustomField[];
  cancellationPolicyText: string;
  details: CustomerDetails;
  selectedSlotIso?: string;
  serviceSummary?: string;
  onChangeDetails: (details: CustomerDetails) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  submitting: boolean;
  submitError?: string | null;
}

function formatSlotDateTime(isoString?: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleString("no-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Step3Details({
  customFields = [],
  cancellationPolicyText,
  details,
  selectedSlotIso,
  serviceSummary,
  onChangeDetails,
  onSubmit,
  onBack,
  submitting,
  submitError,
}: Step3DetailsProps) {
  const [consentError, setConsentError] = useState(false);

  const handleCustomFieldChange = (id: string, value: string) => {
    onChangeDetails({
      ...details,
      customFields: {
        ...details.customFields,
        [id]: value,
      },
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.cancellationConsent) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    onSubmit(e);
  };

  const formattedTime = formatSlotDateTime(selectedSlotIso);

  return (
    <form
      onSubmit={handleFormSubmit}
      aria-labelledby="step3-heading"
      className="w-full rounded-[32px] overflow-hidden border border-[#EAE6E1] bg-white shadow-sm font-sans"
    >
      {/* 1. TOP WHITE CANVAS: TITLE & BACK BUTTON */}
      <div className="p-5 sm:p-7 space-y-4 bg-white text-[#0D0D0D]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full border border-[#EAE6E1] flex items-center justify-center text-sm font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Tilbake til dato og tid"
          >
            ‹
          </button>
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#8a8a8a]">
            Bekreftelse
          </span>
          <div className="w-9 h-9" />
        </div>

        <div>
          <h2 id="step3-heading" className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#0D0D0D]">
            Dine opplysninger
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Fyll inn detaljer for å reservere din time
          </p>
        </div>
      </div>

      {/* 2. THE S-CURVE TRANSITION INTO DARK CONTAINER */}
      <YinYangWave fill="#0D0D0D" direction="down" />

      {/* 3. DARK OBSIDIAN CONTAINER (#0D0D0D): SEGMENTED PILLS, TIME PILL, & MINIMAL UNDERLINE INPUTS */}
      <div className="bg-[#0D0D0D] text-white p-6 sm:p-8 space-y-6 -mt-1">
        {/* Segmented Track Pill */}
        <div className="flex items-center justify-center gap-2 p-1.5 rounded-full bg-white/10 text-[11px] font-semibold tracking-wider text-neutral-400">
          <span className="text-white">Behandling</span>
          <span>·</span>
          <span className="text-white">Dine valg</span>
          <span>·</span>
          <span className="text-white">Notater</span>
        </div>

        {/* Time & Date Confirmation Pill */}
        {formattedTime && (
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#C5A880]">●</span>
              <span className="font-bold text-white capitalize">{formattedTime}</span>
            </div>
            {serviceSummary && (
              <span className="text-neutral-400 text-[11px] truncate max-w-36">
                {serviceSummary}
              </span>
            )}
          </div>
        )}

        {submitError && (
          <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/40 text-red-300 text-xs">
            {submitError}
          </div>
        )}

        {/* Minimal Underline Inputs */}
        <div className="space-y-5 text-xs">
          {/* Fullt Navn */}
          <div className="space-y-1">
            <label htmlFor="customer_name" className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">
              Fullt Navn *
            </label>
            <input
              id="customer_name"
              type="text"
              required
              placeholder="F.eks. Kari Nordmann"
              value={details.name}
              onChange={(e) => onChangeDetails({ ...details, name: e.target.value })}
              className="w-full py-2.5 bg-transparent border-b border-white/20 text-white placeholder-neutral-500 outline-none focus:border-white transition-colors text-sm"
            />
          </div>

          {/* Mobilnummer */}
          <div className="space-y-1">
            <label htmlFor="customer_phone" className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">
              Mobilnummer (+47) *
            </label>
            <input
              id="customer_phone"
              type="tel"
              required
              placeholder="+47 000 00 000"
              value={details.phone}
              onChange={(e) => onChangeDetails({ ...details, phone: e.target.value })}
              className="w-full py-2.5 bg-transparent border-b border-white/20 text-white placeholder-neutral-500 outline-none focus:border-white transition-colors text-sm"
            />
          </div>

          {/* E-postadresse */}
          <div className="space-y-1">
            <label htmlFor="customer_email" className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">
              E-postadresse *
            </label>
            <input
              id="customer_email"
              type="email"
              required
              placeholder="din@epost.no"
              value={details.email}
              onChange={(e) => onChangeDetails({ ...details, email: e.target.value })}
              className="w-full py-2.5 bg-transparent border-b border-white/20 text-white placeholder-neutral-500 outline-none focus:border-white transition-colors text-sm"
            />
          </div>

          {/* Custom Intake Fields */}
          {customFields.map((field) => (
            <div key={field.id} className="space-y-1">
              <label htmlFor={`cf_${field.id}`} className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">
                {field.label} {field.required ? "*" : ""}
              </label>

              {field.type === "select" ? (
                <select
                  id={`cf_${field.id}`}
                  required={field.required}
                  value={details.customFields[field.id] || ""}
                  onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                  className="w-full py-2.5 bg-[#0D0D0D] border-b border-white/20 text-white outline-none focus:border-white transition-colors cursor-pointer text-sm"
                >
                  <option value="" className="bg-[#0D0D0D] text-neutral-400">
                    Velg alternativ...
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt} className="bg-[#0D0D0D] text-white">
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`cf_${field.id}`}
                  type="text"
                  required={field.required}
                  placeholder={field.placeholder || ""}
                  value={details.customFields[field.id] || ""}
                  onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                  className="w-full py-2.5 bg-transparent border-b border-white/20 text-white placeholder-neutral-500 outline-none focus:border-white transition-colors text-sm"
                />
              )}
            </div>
          ))}

          {/* Notat / Referanse */}
          <div className="space-y-1">
            <label htmlFor="customer_notes" className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">
              Notat / Referanse (valgfritt)
            </label>
            <input
              id="customer_notes"
              type="text"
              placeholder="Spesielle ønsker eller referanse"
              value={details.notes}
              onChange={(e) => onChangeDetails({ ...details, notes: e.target.value })}
              className="w-full py-2.5 bg-transparent border-b border-white/20 text-white placeholder-neutral-500 outline-none focus:border-white transition-colors text-sm"
            />
          </div>
        </div>
      </div>

      {/* 4. BOTTOM WHITE CANVAS: 24H CANCELLATION TOGGLE & SUBMIT BUTTON */}
      <div className="p-6 sm:p-8 bg-white space-y-5 text-[#0D0D0D]">
        {/* Cancellation row styled like the "Notify Me" toggle bar */}
        <div
          onClick={() => {
            setConsentError(false);
            onChangeDetails({ ...details, cancellationConsent: !details.cancellationConsent });
          }}
          className={`p-4 rounded-2xl border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
            consentError
              ? "bg-red-50 border-red-300"
              : details.cancellationConsent
              ? "bg-[#FAF8F5] border-[#0D0D0D]"
              : "bg-[#FAF8F5] border-[#EAE6E1]"
          }`}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#0D0D0D]">
              <span>🔔</span>
              <span>24t avbestillingsbetingelser</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-tight">
              {cancellationPolicyText || "Avbestilling må skje senest 24 timer før oppmøte."}
            </p>
          </div>

          {/* Pill Toggle Switch */}
          <div
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
              details.cancellationConsent ? "bg-[#0D0D0D]" : "bg-neutral-300"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                details.cancellationConsent ? "right-0.5" : "left-0.5"
              }`}
            />
          </div>
        </div>

        {consentError && (
          <p className="text-red-600 text-xs font-semibold">
            Vennligst aktiver bryteren for å bekrefte avbestillingsbetingelsene.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 px-6 rounded-full bg-[#0D0D0D] text-white font-bold uppercase tracking-wider text-xs hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer text-center shadow-lg"
        >
          {submitting ? "Sender reservasjon..." : "SEND TIMEFORESPØRSEL →"}
        </button>

        <p className="text-[10px] text-neutral-400 text-center">
          Ingen forhåndsbetaling kreves. Du betaler direkte i studioet.
        </p>
      </div>
    </form>
  );
}
