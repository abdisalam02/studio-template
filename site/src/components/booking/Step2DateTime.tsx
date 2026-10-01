"use client";

import React, { useEffect, useState, useMemo } from "react";
import { YinYangWave } from "@/components/ui/YinYangWave";

interface Step2DateTimeProps {
  tenantSlug: string;
  primaryServiceId: number;
  totalDurationMin: number;
  totalPriceNok?: number;
  serviceSummary?: string;
  currency?: string;
  selectedDate: string; // YYYY-MM-DD
  selectedSlotIso: string; // ISO string
  maxDaysAhead?: number;
  onSelectDate: (dateStr: string) => void;
  onSelectSlot: (slotIso: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

const NO_WEEKDAY_INITIALS = ["S", "M", "T", "O", "T", "F", "L"];
const NO_MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];

function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatSlotTime(slot: string): string {
  if (!slot) return "";
  if (/^\d{1,2}:\d{2}$/.test(slot)) return slot;
  if (slot.includes("T")) {
    const timePart = slot.split("T")[1]?.slice(0, 5);
    if (timePart) return timePart;
  }
  const d = new Date(slot);
  if (isNaN(d.getTime())) return slot;
  return d.toLocaleTimeString("no-NO", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Step2DateTime({
  tenantSlug,
  primaryServiceId,
  totalDurationMin,
  totalPriceNok,
  serviceSummary,
  currency = "kr",
  selectedDate,
  selectedSlotIso,
  maxDaysAhead = 30,
  onSelectDate,
  onSelectSlot,
  onBack,
  onContinue,
}: Step2DateTimeProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Month state for popover calendar
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const todayStr = useMemo(() => formatDateString(new Date()), []);
  const maxDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + maxDaysAhead);
    return formatDateString(d);
  }, [maxDaysAhead]);

  // 7-Day horizontal strip
  const daysInStrip = useMemo(() => {
    const days: { dateStr: string; weekdayInitial: string; dayNum: number; isToday: boolean; isPast: boolean }[] = [];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(currentWeekStart);
      cur.setDate(currentWeekStart.getDate() + i);
      const str = formatDateString(cur);
      days.push({
        dateStr: str,
        weekdayInitial: NO_WEEKDAY_INITIALS[cur.getDay()],
        dayNum: cur.getDate(),
        isToday: str === todayStr,
        isPast: str < todayStr,
      });
    }
    return days;
  }, [currentWeekStart, todayStr]);

  // Auto-select first available valid day
  useEffect(() => {
    if (!selectedDate && daysInStrip.length > 0) {
      const firstValid = daysInStrip.find((d) => !d.isPast);
      if (firstValid) {
        onSelectDate(firstValid.dateStr);
      }
    }
  }, [daysInStrip, selectedDate, onSelectDate]);

  // Fetch availability
  useEffect(() => {
    if (!selectedDate || !primaryServiceId) return;

    let isCancelled = false;
    setLoading(true);
    setError(null);

    const from = selectedDate;
    const toDate = parseLocalDate(selectedDate);
    toDate.setDate(toDate.getDate() + 1);
    const to = formatDateString(toDate);

    fetch(
      `/api/v1/t/${tenantSlug}/availability?service_id=${primaryServiceId}&from=${from}&to=${to}`
    )
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || data.error || "Kunne ikke hente ledige timer.");
        }
        return res.json();
      })
      .then((data) => {
        if (isCancelled) return;
        const slots: string[] = data.slots || [];
        setAvailableSlots(slots);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error("Availability fetch error:", err);
        setError("Kunne ikke laste tilgjengelige tidspunkter.");
        setAvailableSlots([]);
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [tenantSlug, primaryServiceId, selectedDate]);

  // Navigation handlers
  const handlePrevWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() - 7);
    setCurrentWeekStart(next);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  // Month Carousel names
  const curMonthIdx = currentWeekStart.getMonth();
  const prevMonthName = NO_MONTH_NAMES[(curMonthIdx + 11) % 12];
  const currentMonthName = NO_MONTH_NAMES[curMonthIdx];
  const nextMonthName = NO_MONTH_NAMES[(curMonthIdx + 1) % 12];
  const currentYear = currentWeekStart.getFullYear();

  // Selected slot formatting
  const isSlotSelected = !!selectedSlotIso;
  const selectedSlotFormattedTime = isSlotSelected ? formatSlotTime(selectedSlotIso) : "";

  return (
    <div className="w-full rounded-[32px] overflow-hidden border border-[#EAE6E1] bg-white shadow-sm font-sans">
      {/* 1. TOP WHITE CANVAS: CHEVRON, MONTH CAROUSEL & 7-DAY STRIP */}
      <div className="p-5 sm:p-7 space-y-6 bg-white text-[#0D0D0D]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full border border-[#EAE6E1] flex items-center justify-center text-sm font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Tilbake til behandlinger"
          >
            ‹
          </button>

          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#8a8a8a]">
            Tidsvelger
          </span>

          <button
            type="button"
            onClick={() => setShowCalendarModal(true)}
            className="w-9 h-9 rounded-full bg-[#0D0D0D] text-white flex items-center justify-center text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
            title="Åpne full kalender"
          >
            📅
          </button>
        </div>

        {/* Horizontal Month Carousel */}
        <div className="flex items-center justify-between px-1 select-none">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="text-xs font-medium text-neutral-300 hover:text-neutral-600 transition-colors cursor-pointer"
          >
            {prevMonthName}
          </button>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[#0D0D0D]">
            {currentMonthName} <span className="text-neutral-400 font-normal text-base">{currentYear}</span>
          </h3>

          <button
            type="button"
            onClick={handleNextWeek}
            className="text-xs font-medium text-neutral-300 hover:text-neutral-600 transition-colors cursor-pointer"
          >
            {nextMonthName}
          </button>
        </div>

        {/* Horizontal 7-Day Strip with Active Day Capsule */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 pt-1 overflow-x-auto pb-1 no-scrollbar">
          {daysInStrip.map((d) => {
            const isSelected = selectedDate === d.dateStr;
            return (
              <button
                key={d.dateStr}
                type="button"
                disabled={d.isPast}
                onClick={() => {
                  onSelectDate(d.dateStr);
                  onSelectSlot(""); // Reset slot when date changes
                }}
                className={`transition-all flex flex-col items-center justify-center cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-[#0D0D0D] text-white rounded-full w-11 py-3.5 shadow-lg scale-105"
                    : d.isPast
                    ? "opacity-25 cursor-not-allowed w-10 py-2.5 text-[#8a8a8a]"
                    : "hover:bg-neutral-100 rounded-full w-10 py-2.5 text-[#0D0D0D]"
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                  {d.weekdayInitial}
                </span>
                <span className="text-sm font-extrabold mt-1">
                  {d.dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. THE ASYMMETRICAL WAVE S-CURVE TRANSITION */}
      <YinYangWave fill="#0D0D0D" direction="down" />

      {/* 3. BOTTOM BLACK CANVAS: TIMELINE & INVERTED ACTIVE CARD */}
      <div className="bg-[#0D0D0D] text-white p-6 sm:p-8 space-y-6 -mt-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              Ledige tidspunkter
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              {selectedDate
                ? parseLocalDate(selectedDate).toLocaleDateString("no-NO", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "Velg dato ovenfor"}
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#C5A880]">
            {availableSlots.length} ledige
          </span>
        </div>

        {/* Loading / Error states */}
        {loading && (
          <div className="py-8 text-center text-xs text-neutral-400 animate-pulse">
            Beregner ledige tidspunkter...
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/40 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Vertical Timeline Track */}
        {!loading && !error && availableSlots.length === 0 && (
          <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center text-xs text-neutral-400">
            Ingen ledige timer denne dagen. Prøv en annen dato i kalenderen.
          </div>
        )}

        {!loading && availableSlots.length > 0 && (
          <div className="space-y-4">
            {/* Slot pills along timeline */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {availableSlots.map((slot) => {
                const isSelected =
                  selectedSlotIso === slot ||
                  selectedSlotIso === `${selectedDate}T${slot}:00` ||
                  selectedSlotIso === `${selectedDate}T${slot}:00.000Z` ||
                  selectedSlotIso.includes(`T${slot}`);

                const slotValue = slot.includes("T")
                  ? slot
                  : `${selectedDate}T${slot}:00`;

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => onSelectSlot(slotValue)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#C5A880] text-[#0D0D0D] shadow-md scale-105"
                        : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>

            {/* Inverted Active Card State */}
            {isSlotSelected && (
              <div className="mt-6 bg-white text-[#0D0D0D] rounded-2xl p-5 shadow-2xl space-y-4 border-l-4 border-[#C5A880] animate-in fade-in duration-200">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#8a8a8a] block">
                      Valgt tidspunkt
                    </span>
                    <h5 className="text-base font-extrabold text-[#0D0D0D] mt-0.5">
                      {serviceSummary || "Behandling"}
                    </h5>
                    <p className="text-xs text-neutral-600 mt-1 flex items-center gap-1.5">
                      <span className="font-bold text-[#0D0D0D]">Kl. {selectedSlotFormattedTime}</span>
                      <span>·</span>
                      <span>{totalDurationMin} min</span>
                    </p>
                  </div>

                  {totalPriceNok != null && (
                    <div className="text-right">
                      <span className="text-base font-black text-[#0D0D0D]">
                        {totalPriceNok > 0 ? `${totalPriceNok} ${currency}` : "Gratis"}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onContinue}
                  className="w-full py-3.5 px-5 rounded-full bg-[#0D0D0D] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer text-center"
                >
                  Gå videre til detaljer →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 30-Day Calendar Popover Modal */}
      {showCalendarModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 font-sans"
          onClick={() => setShowCalendarModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white border border-[#EAE6E1] p-6 space-y-4 shadow-2xl text-[#0D0D0D]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EAE6E1] pb-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#0D0D0D]">
                Velg dato (30 dager)
              </h4>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="text-neutral-400 hover:text-black text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Next 30 days quick list */}
              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1 text-xs">
                {Array.from({ length: maxDaysAhead }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  const str = formatDateString(d);
                  const isSelected = selectedDate === str;
                  const dayName = NO_WEEKDAY_INITIALS[d.getDay()];

                  return (
                    <button
                      key={str}
                      type="button"
                      onClick={() => {
                        onSelectDate(str);
                        onSelectSlot("");
                        const weekStart = new Date(d);
                        weekStart.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
                        setCurrentWeekStart(weekStart);
                        setShowCalendarModal(false);
                      }}
                      className={`p-2 rounded-xl text-center transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#0D0D0D] text-white font-bold"
                          : "bg-neutral-100 hover:bg-neutral-200 text-[#0D0D0D]"
                      }`}
                    >
                      <div className="text-[9px] uppercase opacity-70">{dayName}</div>
                      <div className="font-extrabold">{d.getDate()}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
