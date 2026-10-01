"use client";

import { useState } from "react";

interface ActionButtonsProps {
  refCode: string;
  token: string;
  currentStatus: string;
}

export function ActionButtons({ refCode, token, currentStatus }: ActionButtonsProps) {
  const [status, setStatus] = useState<string>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (decision: "accept" | "decline") => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refCode, token, decision }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Noe gikk galt under oppdatering.");
      }

      setStatus(data.status);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kunne ikke fullføre handlingen.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (status !== "pending") {
    const isConfirmed = status === "confirmed";
    return (
      <div className={`p-4 rounded-xl text-center font-mono text-sm border ${
        isConfirmed
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
      }`}>
        <p className="font-bold">
          {isConfirmed ? "Avtalen er godkjent" : "Avtalen er avslått"}
        </p>
        <p className="text-xs mt-1 opacity-80">
          Kunden har mottatt e-post med oppdatert status.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-mono">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleAction("accept")}
          className="w-full py-3.5 px-4 rounded-xl bg-foreground text-background font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
        >
          {loading ? "Vennligst vent..." : "Godkjenn time"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleAction("decline")}
          className="w-full py-3.5 px-4 rounded-xl border border-border bg-card text-foreground font-mono text-xs font-bold uppercase tracking-wider hover:bg-muted/10 disabled:opacity-50 transition-all cursor-pointer"
        >
          {loading ? "Vennligst vent..." : "Avslå time"}
        </button>
      </div>
    </div>
  );
}
