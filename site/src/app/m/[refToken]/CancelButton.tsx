"use client";

import { useState } from "react";

interface CancelButtonProps {
  refCode: string;
  token: string;
  initialStatus: string;
}

export function CancelButton({ refCode, token, initialStatus }: CancelButtonProps) {
  const [status, setStatus] = useState<string>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/manage/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refCode, token }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Could not cancel the appointment.");
      }

      setStatus("cancelled");
      setShowConfirm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not cancel the appointment.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (status === "cancelled") {
    return (
      <div
        role="status"
        className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-center font-mono text-xs text-red-600 dark:text-red-400"
      >
        Your appointment has been cancelled. The studio has been notified.
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-mono"
        >
          {error}
        </div>
      )}

      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="w-full py-3 px-4 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          Cancel appointment
        </button>
      ) : (
        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3 font-mono text-xs">
          <p className="font-bold text-foreground">
            Are you sure you want to cancel this appointment?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleCancel}
              className="flex-1 py-2.5 px-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? "Cancelling..." : "Yes, cancel"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2.5 px-3 rounded-lg border border-border bg-card text-foreground hover:bg-muted/10 transition-all cursor-pointer"
            >
              Keep appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
