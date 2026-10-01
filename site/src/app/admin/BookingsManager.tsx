"use client";

import { useState } from "react";
import type { Database } from "@/types/database";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"] & {
  services?: { name: string; duration_min: number } | null;
};

interface BookingsManagerProps {
  bookings: BookingRow[];
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

export function BookingsManager({ bookings, token, onRefresh }: BookingsManagerProps) {
  const [filter, setFilter] = useState<"pending" | "confirmed" | "history">("pending");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const filtered = bookings.filter((b) => {
    if (filter === "pending") return b.status === "pending";
    if (filter === "confirmed") return b.status === "confirmed";
    return b.status === "cancelled" || b.status === "declined" || b.status === "completed" || b.status === "expired";
  });

  const handleStatusUpdate = async (bookingId: number, status: "confirmed" | "declined" | "cancelled") => {
    setActionLoading(bookingId);
    try {
      const res = await fetch("/api/admin/bookings/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-admin-token": token,
        },
        credentials: "include",
        body: JSON.stringify({ booking_id: bookingId, status }),
      });
      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.message || data.error || "Kunne ikke oppdatere status.");
      }
    } catch {
      alert("Nettverksfeil under oppdatering.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filter === "pending"
              ? "bg-foreground text-background"
              : "border border-border text-muted hover:text-foreground"
          }`}
        >
          Venter godkjenning ({bookings.filter((b) => b.status === "pending").length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("confirmed")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filter === "confirmed"
              ? "bg-foreground text-background"
              : "border border-border text-muted hover:text-foreground"
          }`}
        >
          Kommende ({bookings.filter((b) => b.status === "confirmed").length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("history")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filter === "history"
              ? "bg-foreground text-background"
              : "border border-border text-muted hover:text-foreground"
          }`}
        >
          Historikk
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-muted text-xs border border-dashed border-border rounded-xl">
          Ingen bestillinger i denne kategorien.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((b) => {
            const isLoading = actionLoading === b.id;
            return (
              <div
                key={b.id}
                className="p-5 rounded-xl border border-border bg-card space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <div>
                    <span className="font-bold text-sm text-foreground">{b.customer_name}</span>
                    <span className="text-muted ml-2">({b.ref})</span>
                  </div>
                  <div className="text-muted font-bold">
                    {formatOsloDateTime(b.start_utc)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted">
                  <div>
                    <span className="block text-[10px] uppercase">Kontakt:</span>
                    <a href={`tel:${b.customer_phone}`} className="text-foreground underline">
                      {b.customer_phone}
                    </a>{" "}
                    ·{" "}
                    <a href={`mailto:${b.customer_email}`} className="text-foreground underline">
                      {b.customer_email}
                    </a>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase">Behandling:</span>
                    <span className="text-foreground font-semibold">
                      {b.services?.name || `Tjeneste #${b.service_id}`}
                    </span>{" "}
                    · {b.price_nok} kr
                  </div>
                </div>

                {b.notes && (
                  <div className="p-2.5 rounded-lg bg-muted/10 text-foreground">
                    <span className="text-[10px] uppercase text-muted block">Notat fra kunde:</span>
                    {b.notes}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex gap-2">
                  {b.status === "pending" && (
                    <>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleStatusUpdate(b.id, "confirmed")}
                        className="py-2 px-4 rounded-lg bg-foreground text-background font-bold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {isLoading ? "..." : "Godkjenn"}
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleStatusUpdate(b.id, "declined")}
                        className="py-2 px-4 rounded-lg border border-border text-foreground hover:bg-muted/10 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {isLoading ? "..." : "Avslå"}
                      </button>
                    </>
                  )}

                  {b.status === "confirmed" && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleStatusUpdate(b.id, "cancelled")}
                      className="py-2 px-4 rounded-lg border border-red-500/30 text-red-600 hover:bg-red-500/10 font-bold disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isLoading ? "..." : "Avlys time"}
                    </button>
                  )}

                  {b.status !== "pending" && b.status !== "confirmed" && (
                    <span className="text-muted uppercase text-[10px] tracking-wider py-1">
                      Status: {b.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
