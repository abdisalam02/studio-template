"use client";

import { useState } from "react";

interface TimeBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  todayClosingTime?: string; // e.g. "18:00"
}

export function TimeBlockModal({
  isOpen,
  onClose,
  onSuccess,
  token,
  todayClosingTime = "18:00",
}: TimeBlockModalProps) {
  const [activeTab, setActiveTab] = useState<"quick" | "custom">("quick");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom block form state
  const todayStr = new Date().toISOString().split("T")[0];
  const [customDate, setCustomDate] = useState(todayStr);
  const [customStartTime, setCustomStartTime] = useState(() => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(Math.ceil(d.getMinutes() / 15) * 15 % 60).padStart(2, "0");
    return `${h}:${m}`;
  });
  const [customDurationMin, setCustomDurationMin] = useState(30);
  const [customReason, setCustomReason] = useState("Lunsjpause");
  const [otherReasonText, setOtherReasonText] = useState("");

  if (!isOpen) return null;

  const saveBlackout = async (startUtc: number, endUtc: number, reason: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/blackouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-admin-token": token || "",
        },
        credentials: "include",
        body: JSON.stringify({
          start_utc: startUtc,
          end_utc: endUtc,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Kunne ikke sperre tid.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Feil ved oppretting av sperre.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Option A: 30 min pause nå
  const handleThirtyMinNow = () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const endSec = nowSec + 30 * 60;
    saveBlackout(nowSec, endSec, "30 min Pause");
  };

  // Option C: Steng resten av dagen
  const handleCloseRestOfToday = () => {
    const now = new Date();
    const nowSec = Math.floor(now.getTime() / 1000);

    const [closeH, closeM] = todayClosingTime.split(":").map(Number);
    const closeDate = new Date();
    closeDate.setHours(closeH || 18, closeM || 0, 0, 0);

    let endSec = Math.floor(closeDate.getTime() / 1000);
    if (endSec <= nowSec) {
      // If already past closing, block until end of day (23:59:59)
      const eod = new Date();
      eod.setHours(23, 59, 59, 999);
      endSec = Math.floor(eod.getTime() / 1000);
    }

    saveBlackout(nowSec, endSec, "Stengt resten av dagen");
  };

  // Option B: Egendefinert pause
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDate || !customStartTime) {
      setError("Vennligst oppgi dato og starttid.");
      return;
    }

    const startDateTime = new Date(`${customDate}T${customStartTime}:00`);
    const startUtc = Math.floor(startDateTime.getTime() / 1000);
    if (isNaN(startUtc)) {
      setError("Ugyldig starttidspunkt.");
      return;
    }

    const endUtc = startUtc + customDurationMin * 60;
    const finalReason = customReason === "Annet" ? otherReasonText || "Fravær" : customReason;

    saveBlackout(startUtc, endUtc, finalReason);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-[20px] sm:rounded-3xl bg-white border border-[#EAE6E1] p-6 space-y-5 shadow-2xl max-h-[92dvh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#EAE6E1] pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8a8a8a] tracking-wider block">
              Tidsstyring · Tilgjengelighet
            </span>
            <h3 className="text-lg font-bold text-[#111113]">
              Sperr tid / Legg til pause
            </h3>
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

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#FAF8F5] border border-[#EAE6E1] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("quick")}
            className={`py-2 rounded-xl transition-all cursor-pointer text-center ${
              activeTab === "quick"
                ? "bg-[#111113] text-white shadow-xs"
                : "text-[#8a8a8a] hover:text-[#111113]"
            }`}
          >
            Hurtigsperrer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`py-2 rounded-xl transition-all cursor-pointer text-center ${
              activeTab === "custom"
                ? "bg-[#111113] text-white shadow-xs"
                : "text-[#8a8a8a] hover:text-[#111113]"
            }`}
          >
            Egendefinert pause
          </button>
        </div>

        {activeTab === "quick" ? (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-[#8a8a8a]">
              Hurtigsperrer blokkerer kalenderen umiddelbart slik at ingen kan booke online i dette tidsrommet.
            </p>

            <button
              type="button"
              disabled={submitting}
              onClick={handleThirtyMinNow}
              className="w-full p-4 rounded-2xl border border-[#EAE6E1] bg-[#FAF8F5] hover:border-[#111113] text-left transition-all cursor-pointer disabled:opacity-50 group"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-[#111113] flex items-center gap-2">
                  <span>☕</span>
                  <span>30 min pause nå</span>
                </div>
                <span className="text-xs text-[#8a8a8a] group-hover:translate-x-0.5 transition-all">
                  Aktiver →
                </span>
              </div>
              <p className="text-[11px] text-[#8a8a8a] mt-1">
                Sperrer 30 minutter fra nåværende klokkeslett.
              </p>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleCloseRestOfToday}
              className="w-full p-4 rounded-2xl border border-[#EAE6E1] bg-[#FAF8F5] hover:border-[#111113] text-left transition-all cursor-pointer disabled:opacity-50 group"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-[#111113] flex items-center gap-2">
                  <span>🔒</span>
                  <span>Steng resten av dagen</span>
                </div>
                <span className="text-xs text-[#8a8a8a] group-hover:translate-x-0.5 transition-all">
                  Aktiver →
                </span>
              </div>
              <p className="text-[11px] text-[#8a8a8a] mt-1">
                Blokkerer alle gjenstående ledige timer i dag frem til kl. {todayClosingTime}.
              </p>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="space-y-4 pt-1 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-[#8a8a8a] block">
                Dato
              </label>
              <input
                type="date"
                required
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#8a8a8a] block">
                  Starttidspunkt
                </label>
                <input
                  type="time"
                  required
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#8a8a8a] block">
                  Varighet
                </label>
                <select
                  value={customDurationMin}
                  onChange={(e) => setCustomDurationMin(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none font-medium"
                >
                  <option value={15}>15 minutter</option>
                  <option value={30}>30 minutter</option>
                  <option value={45}>45 minutter</option>
                  <option value={60}>1 time (60 min)</option>
                  <option value={90}>1.5 time (90 min)</option>
                  <option value={120}>2 timer (120 min)</option>
                  <option value={240}>4 timer (halv dag)</option>
                  <option value={480}>8 timer (hel dag)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-[#8a8a8a] block">
                Årsak / Kategori
              </label>
              <select
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none font-medium"
              >
                <option value="Lunsjpause">Lunsjpause</option>
                <option value="Møte / Kurs">Møte / Kurs</option>
                <option value="Egenpleie / Pause">Egenpleie / Pause</option>
                <option value="Sykdom">Sykdom</option>
                <option value="Ferie">Ferie</option>
                <option value="Annet">Annet</option>
              </select>
            </div>

            {customReason === "Annet" && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#8a8a8a] block">
                  Spesifiser årsak
                </label>
                <input
                  type="text"
                  placeholder="F.eks. Tannlegetime"
                  value={otherReasonText}
                  onChange={(e) => setOtherReasonText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#EAE6E1] bg-[#FAF8F5] text-[#111113] outline-none font-medium"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-[#111113] text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer text-center"
            >
              {submitting ? "Lagrer sperre..." : "Lagre pause"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
