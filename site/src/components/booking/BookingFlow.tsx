"use client";

import { useState } from "react";
import { CLIENT_CONFIG, ServiceItem } from "@/config/client";
import { FiCheck, FiCalendar, FiClock } from "react-icons/fi";

const NO_DAY_NAMES = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
const NO_MONTH_NAMES = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function generateDays() {
  const days = [];
  const base = new Date();
  base.setDate(base.getDate() + 1);
  for (let i = 0; i < 5; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push({
      dayName: NO_DAY_NAMES[d.getDay()],
      dateStr: `${d.getDate()}. ${NO_MONTH_NAMES[d.getMonth()]}`,
      slots: ["10:00", "12:30", "14:30", "16:00"],
    });
  }
  return days;
}

export default function BookingFlow() {
  const [selectedService, setSelectedService] = useState<ServiceItem>(CLIENT_CONFIG.services[0]);
  const [days] = useState(generateDays);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState("10:00");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) return;
    setIsConfirmed(true);
  };

  if (isConfirmed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 font-mono text-xs">
        <div className="flex items-center gap-2 text-emerald-600 font-bold">
          <FiCheck className="text-base" />
          <span>RESERVASJON MOTTATT</span>
        </div>
        <div className="space-y-1">
          <div className="font-bold text-sm text-foreground">{selectedService.name}</div>
          <div className="text-muted">
            {days[selectedDayIdx].dayName} {days[selectedDayIdx].dateStr} kl. {selectedSlot}
          </div>
          <div className="text-muted">{selectedService.price} kr · {selectedService.duration}</div>
        </div>
        <div className="pt-2 border-t border-border text-[11px] text-muted">
          Gjest: {customerName} ({customerPhone})
        </div>
        <button
          type="button"
          onClick={() => setIsConfirmed(false)}
          className="text-[11px] underline text-muted hover:text-foreground cursor-pointer"
        >
          Endre reservasjon
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Treatment Selection */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase text-muted tracking-wider block">
          1. Velg Behandling
        </label>
        <div className="grid grid-cols-1 gap-2">
          {CLIENT_CONFIG.services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setSelectedService(service)}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between text-xs font-mono cursor-pointer ${
                selectedService.id === service.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:border-foreground/40"
              }`}
            >
              <div>
                <div className="font-bold">{service.name}</div>
                <div className="opacity-70 text-[11px]">{service.duration}</div>
              </div>
              <div className="font-bold">{service.price} kr</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Date Selection */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase text-muted tracking-wider block">
          2. Velg Dag
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d, idx) => (
            <button
              key={d.dateStr}
              type="button"
              onClick={() => setSelectedDayIdx(idx)}
              className={`p-2.5 rounded-xl border text-center flex-shrink-0 min-w-[70px] text-xs font-mono cursor-pointer transition-all ${
                selectedDayIdx === idx
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:border-foreground/40"
              }`}
            >
              <div className="text-[10px] opacity-70 uppercase">{d.dayName}</div>
              <div className="font-bold">{d.dateStr}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Slot Selection */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase text-muted tracking-wider block">
          3. Velg Tidspunkt
        </label>
        <div className="grid grid-cols-4 gap-2">
          {days[selectedDayIdx].slots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`py-2 rounded-lg border text-center text-xs font-mono cursor-pointer transition-all ${
                selectedSlot === slot
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:border-foreground/40"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Guest Details */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase text-muted tracking-wider block">
          4. Kontaktinformasjon
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          <input
            type="text"
            required
            placeholder="Ditt navn"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="p-3 rounded-xl border border-border bg-card text-foreground outline-none focus:border-foreground"
          />
          <input
            type="tel"
            required
            placeholder="Mobilnummer"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="p-3 rounded-xl border border-border bg-card text-foreground outline-none focus:border-foreground"
          />
        </div>
      </div>

      {/* Submit Trigger */}
      <button
        type="submit"
        className="w-full py-3.5 rounded-full bg-foreground text-background text-xs font-mono font-bold tracking-wider hover:opacity-90 transition-all cursor-pointer"
      >
        Reserver time · {selectedService.price} kr
      </button>

      <p className="text-[10px] font-mono text-center text-muted">
        Ingen forhåndsbetaling påkrevd. Avbestilling inntil {CLIENT_CONFIG.cancellationHours}t før oppmøte.
      </p>
    </form>
  );
}
