import React from "react";
import type { ServiceRow } from "./Step1Services";

interface Step4ConfirmedProps {
  bookingRef: string;
  selectedServices: ServiceRow[];
  selectedSlotIso: string;
  customerName: string;
  customerEmail: string;
  tenantName: string;
  currency?: string;
  onReset: () => void;
}

function formatOsloDateTime(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleString("no-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Step4Confirmed({
  bookingRef,
  selectedServices,
  selectedSlotIso,
  customerName,
  customerEmail,
  tenantName,
  currency = "kr",
  onReset,
}: Step4ConfirmedProps) {
  const totalPrice = selectedServices.reduce((acc, s) => acc + s.price_nok, 0);
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_min, 0);
  const timeFormatted = formatOsloDateTime(selectedSlotIso);

  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface text-center space-y-6 shadow-sm">
        {/* Status Badge */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
            Forespørsel Mottatt
          </span>

          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Takk for din bestilling!
          </h2>

          <p className="text-muted text-[11px] max-w-sm mx-auto leading-relaxed">
            Din timeforespørsel hos <strong>{tenantName}</strong> er registrert og venter på gjennomgang. Vi har sendt en bekreftelse til <strong>{customerEmail}</strong>.
          </p>
        </div>

        {/* Reference Badge */}
        <div className="p-3 rounded-xl bg-background border border-border inline-block px-6">
          <span className="text-[10px] text-muted uppercase tracking-wider block">
            Referansenummer
          </span>
          <span className="text-base font-bold text-foreground tracking-widest mt-0.5 block">
            {bookingRef}
          </span>
        </div>

        {/* Summary Card */}
        <div className="p-4 rounded-xl border border-border/80 bg-background text-left space-y-2.5">
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted">Kunde:</span>
            <span className="font-bold text-foreground">{customerName}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted">Tidspunkt:</span>
            <span className="font-bold text-foreground capitalize">{timeFormatted}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted">Behandlinger:</span>
            <span className="font-bold text-foreground text-right">
              {selectedServices.map((s) => s.name).join(", ")}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted">Varighet:</span>
            <span className="font-bold text-foreground">ca. {totalDuration} minutter</span>
          </div>

          <div className="flex justify-between pt-1">
            <span className="text-muted">Totalpris:</span>
            <span className="font-bold text-foreground text-sm">
              {totalPrice} {currency}
            </span>
          </div>
        </div>

        {/* Notice */}
        <div className="p-3.5 rounded-xl border border-border bg-muted/10 text-[11px] text-muted leading-relaxed text-left">
          <p className="font-bold text-foreground mb-1">Hva skjer nå?</p>
          <p>
            Salongen vurderer timeforespørselen din fortløpende. Så snart timen er godkjent, mottar du en endelig bekreftelse med kalendervedlegg på e-post.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-xs text-muted underline hover:text-foreground transition-colors cursor-pointer"
        >
          Gjør en ny bestilling
        </button>
      </div>
    </div>
  );
}
