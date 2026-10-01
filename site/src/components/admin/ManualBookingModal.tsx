"use client";

import { useState } from "react";
import type { Database } from "@/types/database";
import type { AdminBooking } from "./ClientDrawer";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

interface ManualBookingModalProps {
  tenantId: string;
  services: ServiceRow[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (booking: AdminBooking) => void;
  sessionToken: string | null;
}

export function ManualBookingModal({
  tenantId,
  services,
  isOpen,
  onClose,
  onSuccess,
  sessionToken,
}: ManualBookingModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceId, setServiceId] = useState<number>(services[0]?.id || 0);

  const todayStr = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState("12:00");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !date || !time) {
      setError("Vennligst fyll ut navn, telefon, dato og tid.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const dateTimeString = `${date}T${time}:00`;
      const localDate = new Date(dateTimeString);
      const startUtc = Math.floor(localDate.getTime() / 1000);

      const res = await fetch("/api/admin/bookings/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          customer_name: name,
          customer_phone: phone,
          customer_email: email,
          service_id: Number(serviceId) || null,
          start_utc: startUtc,
          notes: notes || "Manuelt registrert avtale",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Kunne ikke opprette avtale.");
      }

      onSuccess(data.booking);
      onClose();
      // Reset form
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Feil ved registrering.";
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
        className="w-full max-w-md rounded-3xl bg-white border border-[#EAE6E1] p-6 sm:p-7 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#EAE6E1] pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8a8a8a] tracking-wider block">
              Manuell registrering
            </span>
            <h3 className="text-lg font-bold text-[#111113]">
              + Book time (Drop-in / Telefon)
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
              Kundenavn
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fullt navn"
              className="w-full p-2.5 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113] text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                Telefonnummer
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+47 000 00 000"
                className="w-full p-2.5 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113] text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                E-post (valgfritt)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kunde@post.no"
                className="w-full p-2.5 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113] text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
              Behandling
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113] text-xs"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_min} min · {s.price_nok} kr)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                Dato
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113] text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
                Klokkeslett
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113] text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-[#8a8a8a] block font-semibold">
              Notater (f.eks. plassering, spesielle ønsker)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Drop-in fra Bygdøy Allé..."
              className="w-full p-2.5 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none focus:border-[#111113] text-xs"
            />
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-[#111113] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {submitting ? "Oppretter..." : "Opprett bekreftet time"}
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
