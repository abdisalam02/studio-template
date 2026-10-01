"use client";

import { useState } from "react";
import type { AdminBooking } from "./ClientDrawer";

interface RescheduleModalProps {
  booking: AdminBooking | null;
  onClose: () => void;
  onSuccess: (updatedBooking: AdminBooking) => void;
  sessionToken: string | null;
}

export function RescheduleModal({
  booking,
  onClose,
  onSuccess,
  sessionToken,
}: RescheduleModalProps) {
  if (!booking) return null;

  // Initial date & time from booking start_utc
  const d = new Date(booking.start_utc * 1000);
  const initialDate = d.toISOString().split("T")[0];
  const initialTime = d.toLocaleTimeString("no-NO", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
  });

  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;

    setSubmitting(true);
    setError(null);

    try {
      const dateTimeString = `${date}T${time}:00`;
      const localDate = new Date(dateTimeString);
      const startUtc = Math.floor(localDate.getTime() / 1000);

      const res = await fetch("/api/admin/bookings/reschedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          booking_id: booking.id,
          start_utc: startUtc,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Kunne ikke flytte avtalen.");
      }

      onSuccess(data.booking || { ...booking, start_utc: startUtc });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Feil ved oppdatering.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 font-sans"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-white border border-[#EAE6E1] p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#EAE6E1] pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8a8a8a] tracking-wider block">
              Flytt time · Ref {booking.ref}
            </span>
            <h3 className="text-base font-bold text-[#111113]">
              {booking.customer_name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8a8a8a] hover:text-[#111113] text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
              Ny dato
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113] text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
              Nytt klokkeslett
            </label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113] text-xs"
            />
          </div>

          <p className="text-[11px] text-[#8a8a8a]">
            Kunden mottar automatisk en oppdatert bekreftelse på e-post med ny kalenderfil (.ics).
          </p>
        </div>

        <div className="pt-2 flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-[#111113] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {submitting ? "Lagrer..." : "Bekreft ny tid"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#EAE6E1] text-[#8a8a8a] hover:text-[#111113] text-xs font-semibold uppercase cursor-pointer"
          >
            Avbryt
          </button>
        </div>
      </form>
    </div>
  );
}
