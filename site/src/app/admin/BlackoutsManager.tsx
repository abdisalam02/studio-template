"use client";

import { useState } from "react";
import type { Database } from "@/types/database";

type BlackoutRow = Database["public"]["Tables"]["blackouts"]["Row"];

interface BlackoutsManagerProps {
  blackouts: BlackoutRow[];
  token: string;
  onRefresh: () => void;
}

function formatOsloDateTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleString("no-NO", {
    timeZone: "Europe/Oslo",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BlackoutsManager({ blackouts, token, onRefresh }: BlackoutsManagerProps) {
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [reason, setReason] = useState("Ferie");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startLocal || !endLocal) return;

    setError(null);
    setLoading(true);

    try {
      const startUtc = Math.floor(new Date(startLocal).getTime() / 1000);
      const endUtc = Math.floor(new Date(endLocal).getTime() / 1000);

      if (isNaN(startUtc) || isNaN(endUtc) || endUtc <= startUtc) {
        throw new Error("Sluttidspunkt må være etter starttidspunkt.");
      }

      const finalReason = reason === "Annet" ? customReason : reason;

      const res = await fetch("/api/admin/blackouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-admin-token": token,
        },
        credentials: "include",
        body: JSON.stringify({
          start_utc: startUtc,
          end_utc: endUtc,
          reason: finalReason || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "Kunne ikke legge til fravær.");
      }

      setStartLocal("");
      setEndLocal("");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Feil under lagring av fravær.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Vil du slette dette fraværet?")) return;

    try {
      const res = await fetch(`/api/admin/blackouts?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-admin-token": token,
        },
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || data.error || "Kunne ikke slette fravær.");
        return;
      }

      onRefresh();
    } catch {
      alert("Nettverksfeil under sletting.");
    }
  };

  return (
    <div className="space-y-8 text-xs font-mono">
      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-border bg-card space-y-4">
        <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
          Legg til fravær / stengt tid
        </h3>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-muted uppercase text-[10px] block">Fra tidspunkt</label>
            <input
              type="datetime-local"
              required
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-foreground"
            />
          </div>

          <div className="space-y-1">
            <label className="text-muted uppercase text-[10px] block">Til tidspunkt</label>
            <input
              type="datetime-local"
              required
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-foreground"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-muted uppercase text-[10px] block">Årsak</label>
          <div className="flex gap-2">
            {["Ferie", "Sykdom", "Pause", "Annet"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  reason === r
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {reason === "Annet" && (
            <input
              type="text"
              placeholder="Beskrivelse..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full mt-2 p-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-foreground"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="py-3 px-5 rounded-lg bg-foreground text-background font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
        >
          {loading ? "Lagrer..." : "Lagre fraværsperiode"}
        </button>
      </form>

      {/* List */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
          Registrerte fraværsperioder ({blackouts.length})
        </h3>

        {blackouts.length === 0 ? (
          <div className="p-8 text-center text-muted border border-dashed border-border rounded-xl">
            Ingen fraværsperioder registrert.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {blackouts.map((k) => (
              <div
                key={k.id}
                className="p-4 rounded-xl border border-border bg-card flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="font-bold text-foreground">
                    {k.reason || "Uten årsak"}
                  </div>
                  <div className="text-muted">
                    {formatOsloDateTime(k.start_utc)} — {formatOsloDateTime(k.end_utc)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(k.id)}
                  className="py-1.5 px-3 rounded-lg border border-red-500/30 text-red-600 hover:bg-red-500/10 font-bold transition-all cursor-pointer"
                >
                  Slett
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
