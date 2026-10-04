"use client";

import React, { useEffect, useState, useMemo } from "react";

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

const NO_WEEKDAY_NAMES = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
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
  selectedDate,
  selectedSlotIso,
  maxDaysAhead = 35,
  onSelectDate,
  onSelectSlot,
}: Step2DateTimeProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMonthModal, setShowMonthModal] = useState(false);

  // Month state for standalone 35-day grid picker
  const [monthViewDate, setMonthViewDate] = useState<Date>(() => {
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

  // 7-day horizontal scroll strip
  const daysInStrip = useMemo(() => {
    const days: {
      dateStr: string;
      weekdayName: string;
      dayNum: number;
      isToday: boolean;
      isPast: boolean;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(currentWeekStart);
      cur.setDate(currentWeekStart.getDate() + i);
      const str = formatDateString(cur);
      days.push({
        dateStr: str,
        weekdayName: NO_WEEKDAY_NAMES[cur.getDay()],
        dayNum: cur.getDate(),
        isToday: str === todayStr,
        isPast: str < todayStr,
      });
    }
    return days;
  }, [currentWeekStart, todayStr]);

  // Auto-select first valid day in strip if none selected
  useEffect(() => {
    if (!selectedDate && daysInStrip.length > 0) {
      const firstValid = daysInStrip.find((d) => !d.isPast);
      if (firstValid) {
        onSelectDate(firstValid.dateStr);
      }
    }
  }, [daysInStrip, selectedDate, onSelectDate]);

  // Fetch availability for selectedDate
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
          const data = await res.json().catch(() => ({}));
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

  // Handlers for week strip navigation
  const handlePrevWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(currentWeekStart.getDate() - 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (next < today) {
      setCurrentWeekStart(today);
    } else {
      setCurrentWeekStart(next);
    }
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(next);
  };

  // Month navigation for modal
  const handlePrevMonth = () => {
    const prev = new Date(monthViewDate);
    prev.setMonth(monthViewDate.getMonth() - 1);
    setMonthViewDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(monthViewDate);
    next.setMonth(monthViewDate.getMonth() + 1);
    setMonthViewDate(next);
  };

  // 35-day grid generator (5 weeks x 7 days)
  const monthGridDays = useMemo(() => {
    const year = monthViewDate.getFullYear();
    const month = monthViewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    // Norwegian calendar: Monday is 1, Sunday is 7
    let dayOfWeek = firstDay.getDay(); // 0 is Sunday
    if (dayOfWeek === 0) dayOfWeek = 7;
    const offset = dayOfWeek - 1;

    const startDate = new Date(year, month, 1 - offset);
    const cells: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isSelected: boolean;
    }[] = [];

    for (let i = 0; i < 35; i++) {
      const cur = new Date(startDate);
      cur.setDate(startDate.getDate() + i);
      const str = formatDateString(cur);
      const isPast = str < todayStr;
      const isBeyondMax = str > maxDateStr;

      cells.push({
        dateStr: str,
        dayNum: cur.getDate(),
        isCurrentMonth: cur.getMonth() === month,
        isDisabled: isPast || isBeyondMax,
        isSelected: selectedDate === str,
      });
    }

    return cells;
  }, [monthViewDate, todayStr, maxDateStr, selectedDate]);

  const activeMonthLabel = useMemo(() => {
    const m = NO_MONTH_NAMES[currentWeekStart.getMonth()];
    const y = currentWeekStart.getFullYear();
    return `${m} ${y}`;
  }, [currentWeekStart]);

  const modalMonthLabel = useMemo(() => {
    const m = NO_MONTH_NAMES[monthViewDate.getMonth()];
    const y = monthViewDate.getFullYear();
    return `${m} ${y}`;
  }, [monthViewDate]);

  return (
    <section aria-labelledby="step2-heading" className="space-y-5">
      {/* 1. Header with Month Label & "Velg dato 📅" Trigger */}
      <div className="month-trigger-row">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center text-xs font-bold hover:bg-neutral-100 transition-colors"
            aria-label="Forrige uke"
          >
            ‹
          </button>
          <span className="font-extrabold text-sm text-[#18181b] tracking-tight">
            {activeMonthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextWeek}
            className="w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center text-xs font-bold hover:bg-neutral-100 transition-colors"
            aria-label="Neste uke"
          >
            ›
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (selectedDate) {
              const d = parseLocalDate(selectedDate);
              d.setDate(1);
              setMonthViewDate(d);
            }
            setShowMonthModal(true);
          }}
          className="btn-open-month-grid"
        >
          <span>Velg dato</span>
          <span aria-hidden="true">📅</span>
        </button>
      </div>

      {/* 2. 7-Day Horizontal Strip */}
      <div className="days-horizontal-reel" role="radiogroup" aria-label="Velg dag">
        {daysInStrip.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          return (
            <button
              key={day.dateStr}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={day.isPast}
              onClick={() => {
                onSelectDate(day.dateStr);
                onSelectSlot("");
              }}
              className={`day-pill-vert ${isSelected ? "selected" : ""} ${
                day.isPast ? "disabled" : ""
              }`}
            >
              <span className="day-pill-weekday">{day.weekdayName}</span>
              <span className="day-pill-num">{day.dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Available Time Slots Matrix */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            Ledige Tidspunkter
          </span>
          {selectedSlotIso && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Valgt: {formatSlotTime(selectedSlotIso)}
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
            <svg
              className="animate-spin h-5 w-5 text-neutral-800"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="text-xs">Henter ledige timer...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-rose-600">
            {error}
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="py-10 text-center text-neutral-400 text-xs">
            Ingen ledige timer funnet på denne datoen. Vennligst velg en annen dag i kalenderen.
          </div>
        ) : (
          <div className="time-slots-matrix">
            {availableSlots.map((slot) => {
              const formatted = formatSlotTime(slot);
              const isSelected = selectedSlotIso === slot;

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onSelectSlot(slot)}
                  className={`time-slot-btn ${isSelected ? "active" : ""}`}
                >
                  {formatted}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Standalone 35-Day Month Grid Picker Dialog */}
      <div
        id="monthModalBackdrop"
        className={`month-modal-backdrop ${showMonthModal ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Full månedskalender"
        onClick={() => setShowMonthModal(false)}
      >
        <div
          className="month-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="month-modal-head">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-sm font-bold hover:bg-neutral-100"
              aria-label="Forrige måned"
            >
              ‹
            </button>
            <span className="font-bold text-sm text-[#18181b]">
              {modalMonthLabel}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-sm font-bold hover:bg-neutral-100"
                aria-label="Neste måned"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => setShowMonthModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 hover:text-black flex items-center justify-center text-xs ml-1"
                aria-label="Lukk kalender"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Weekday initials header (M T O T F L S) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold uppercase text-neutral-400">
            <div>M</div>
            <div>T</div>
            <div>O</div>
            <div>T</div>
            <div>F</div>
            <div>L</div>
            <div>S</div>
          </div>

          {/* 35 Grid Cells */}
          <div className="month-grid-cells">
            {monthGridDays.map((cell) => (
              <button
                key={cell.dateStr}
                type="button"
                disabled={cell.isDisabled}
                onClick={() => {
                  onSelectDate(cell.dateStr);
                  onSelectSlot("");
                  // Center the 7-day strip on this week
                  const d = parseLocalDate(cell.dateStr);
                  let dayOfWeek = d.getDay();
                  if (dayOfWeek === 0) dayOfWeek = 7;
                  d.setDate(d.getDate() - dayOfWeek + 1);
                  setCurrentWeekStart(d);
                  setShowMonthModal(false);
                }}
                className={`month-day-cell ${cell.isSelected ? "selected" : ""} ${
                  cell.isDisabled ? "disabled" : ""
                } ${!cell.isCurrentMonth ? "opacity-30" : ""}`}
              >
                {cell.dayNum}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
