"use client";

import React, { useState } from "react";
import type { CustomField } from "@/config/tenant.config";
import { getServiceImage, type ServiceRow } from "./Step1Services";

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
  selectedServices?: ServiceRow[];
  serviceSummary?: string;
  currency?: string;
  onChangeDetails: (details: CustomerDetails) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  submitting: boolean;
  submitError?: string | null;
}

function formatSlotDateTime(isoString?: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleString("no-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Step3Details({
  customFields = [],
  cancellationPolicyText,
  details,
  selectedSlotIso,
  selectedServices = [],
  serviceSummary,
  currency = "kr",
  onChangeDetails,
  onSubmit,
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

  const primaryService = selectedServices[0];
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_min, 0);
  const totalPrice = selectedServices.reduce((acc, s) => acc + s.price_nok, 0);
  const summaryText =
    serviceSummary || selectedServices.map((s) => s.name).join(" + ") || "Valgt behandling";
  const imageSrc = primaryService ? getServiceImage(primaryService, 0) : null;

  return (
    <form
      id="bookingDetailsForm"
      onSubmit={handleFormSubmit}
      aria-labelledby="step3-heading"
      className="space-y-4"
    >
      {/* Appointment Snapshot Card */}
      <div className="booking-summary-card">
        <div className="booking-summary-top">
          {imageSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={primaryService ? primaryService.name : "Valgt behandling"}
              className="booking-summary-thumb"
              width={64}
              height={64}
              loading="lazy"
            />
          )}

          <div className="booking-summary-info">
            <div className="booking-summary-eyebrow">Din reservasjon</div>
            <div className="booking-summary-title">{summaryText}</div>
            <div className="booking-summary-meta">
              {totalDuration > 0 && (
                <span className="service-duration-pill">⏱ {totalDuration} min</span>
              )}
              {totalPrice > 0 && (
                <span className="service-price-tag">
                  {totalPrice} {currency}
                </span>
              )}
            </div>
          </div>
        </div>

        {formattedTime && (
          <div className="booking-summary-time-row">
            <span className="booking-summary-time-icon" aria-hidden="true">
              🗓
            </span>
            <span className="booking-summary-time-text capitalize">{formattedTime}</span>
          </div>
        )}
      </div>

      {submitError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {submitError}
        </div>
      )}

      {/* Recessed Form Inputs (#F6F5F1) */}
      <div className="drawer-input-group">
        <label htmlFor="customer-name" className="drawer-label">
          Fullt Navn *
        </label>
        <input
          id="customer-name"
          type="text"
          required
          autoComplete="name"
          placeholder="F.eks. Nora Hansen"
          value={details.name}
          onChange={(e) => onChangeDetails({ ...details, name: e.target.value })}
          className="drawer-recessed-input"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="drawer-input-group">
          <label htmlFor="customer-email" className="drawer-label">
            E-post *
          </label>
          <input
            id="customer-email"
            type="email"
            required
            autoComplete="email"
            placeholder="din@epost.no"
            value={details.email}
            onChange={(e) => onChangeDetails({ ...details, email: e.target.value })}
            className="drawer-recessed-input"
          />
        </div>

        <div className="drawer-input-group">
          <label htmlFor="customer-phone" className="drawer-label">
            Telefon / WhatsApp *
          </label>
          <input
            id="customer-phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+47 000 00 000"
            value={details.phone}
            onChange={(e) => onChangeDetails({ ...details, phone: e.target.value })}
            className="drawer-recessed-input"
          />
        </div>
      </div>

      {/* Custom Fields (if configured) */}
      {customFields.map((field) => (
        <div key={field.id} className="drawer-input-group">
          <label htmlFor={field.id} className="drawer-label">
            {field.label} {field.required ? "*" : ""}
          </label>
          {field.type === "select" && field.options ? (
            <select
              id={field.id}
              required={field.required}
              value={details.customFields[field.id] || ""}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              className="drawer-recessed-input"
            >
              <option value="">Velg et alternativ</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={field.id}
              type="text"
              required={field.required}
              placeholder={field.placeholder || ""}
              value={details.customFields[field.id] || ""}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              className="drawer-recessed-input"
            />
          )}
        </div>
      ))}

      {/* Design Notes / Intake */}
      <div className="drawer-input-group">
        <label htmlFor="customer-notes" className="drawer-label">
          Notater / Designønsker (Valgfritt)
        </label>
        <textarea
          id="customer-notes"
          rows={2}
          placeholder="Beskriv ønsket design, referansebilder eller spesielle hensyn..."
          value={details.notes}
          onChange={(e) => onChangeDetails({ ...details, notes: e.target.value })}
          className="drawer-recessed-input resize-none"
        />
      </div>

      {/* Cancellation Policy and Consent */}
      <div className="pt-1">
        <label
          htmlFor="cancellation-consent"
          className="flex items-start gap-2.5 cursor-pointer text-[11px] leading-relaxed text-neutral-600 select-none"
        >
          <input
            id="cancellation-consent"
            type="checkbox"
            checked={details.cancellationConsent}
            onChange={(e) => {
              onChangeDetails({ ...details, cancellationConsent: e.target.checked });
              if (e.target.checked) setConsentError(false);
            }}
            className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-0"
          />
          <span>
            Jeg bekrefter bestillingen og godtar avbestillingsbetingelsene:{" "}
            <span className="text-neutral-500">{cancellationPolicyText}</span>
          </span>
        </label>
        {consentError && (
          <p className="text-[11px] text-rose-600 font-semibold mt-1">
            Du må bekrefte vilkårene for å fullføre bestillingen.
          </p>
        )}
      </div>
    </form>
  );
}
