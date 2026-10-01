"use client";

import React from "react";
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
}

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
}: ClientDrawerProps) {
  if (!booking) return null;

  // Clean phone number for WhatsApp link (e.g., +47 900 00 000 -> 4790000000)
  let cleanPhone = booking.customer_phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 8) {
    cleanPhone = "47" + cleanPhone;
  }

  const timeStr = formatOsloTime(booking.start_utc);
  const dateStr = formatOsloDate(booking.start_utc);
  const firstName = booking.customer_name.split(" ")[0] || booking.customer_name;
  const whatsappText = `Hei ${firstName}! Viser til din time hos ${tenantName} den ${dateStr} kl.${timeStr}.`;
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`;

  const isLoading = actionLoading === booking.id;

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
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white border border-[#EAE6E1] p-6 sm:p-7 space-y-5 shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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

        {/* Quick Communication Actions Grid */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-[#8a8a8a] tracking-wider">
            Hurtigkontakt
          </span>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={`tel:${booking.customer_phone}`}
              className="py-2.5 rounded-xl border border-[#EAE6E1] text-center text-xs font-semibold text-[#111113] hover:bg-[#FAF8F5] transition-colors"
            >
              Ring
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-center text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              WhatsApp
            </a>
            <a
              href={`mailto:${booking.customer_email}`}
              className="py-2.5 rounded-xl border border-[#EAE6E1] text-center text-xs font-semibold text-[#111113] hover:bg-[#FAF8F5] transition-colors"
            >
              E-post
            </a>
          </div>
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
