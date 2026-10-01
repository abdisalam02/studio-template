import React from "react";
import type { Database } from "@/types/database";

export type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

interface Step1ServicesProps {
  services: ServiceRow[];
  selectedServiceIds: number[];
  allowMultiSelect: boolean;
  currency?: string;
  onToggleService: (service: ServiceRow) => void;
  onContinue: () => void;
}

export function Step1Services({
  services,
  selectedServiceIds,
  allowMultiSelect,
  currency = "kr",
  onToggleService,
  onContinue,
}: Step1ServicesProps) {
  const selectedCount = selectedServiceIds.length;
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_min, 0);
  const totalPrice = selectedServices.reduce((acc, s) => acc + s.price_nok, 0);

  return (
    <section aria-labelledby="step1-heading" className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 id="step1-heading" className="text-sm font-bold font-mono uppercase tracking-wider text-foreground">
            1. Velg Behandling
          </h2>
          <p className="text-[11px] font-mono text-muted mt-0.5">
            {allowMultiSelect
              ? "Velg én eller flere behandlinger for en samlet time"
              : "Velg ønsket behandling"}
          </p>
        </div>

        {selectedCount > 0 && (
          <span className="text-[11px] font-mono font-bold text-muted bg-surface border border-border px-2.5 py-1 rounded-full">
            {selectedCount} valgt
          </span>
        )}
      </div>

      {/* Multi-selection Custom Combo Banner */}
      {selectedCount > 1 && (
        <div className="p-3.5 rounded-xl border border-border bg-surface/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="opacity-70 text-[11px]" aria-hidden="true">&#9670;</span>
            <span className="font-bold tracking-wider uppercase text-foreground">
              Kombinasjon ({selectedCount} tjenester)
            </span>
          </div>
          <span className="text-muted text-[11px]">
            ca. {totalDuration} minutter totalt
          </span>
        </div>
      )}

      {/* Services List */}
      <div className="grid grid-cols-1 gap-2.5">
        {services.map((service) => {
          const isSelected = selectedServiceIds.includes(service.id);

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onToggleService(service)}
              className={`p-4 rounded-xl border text-left transition-all duration-150 flex items-start justify-between gap-4 cursor-pointer font-mono ${
                isSelected
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-surface text-foreground border-border hover:border-foreground/30"
              }`}
            >
              <div className="flex items-start gap-3">
                {allowMultiSelect && (
                  <div
                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border transition-colors ${
                      isSelected
                        ? "bg-background text-foreground border-background"
                        : "border-border bg-background"
                    }`}
                  >
                    {isSelected ? "✓" : ""}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="font-bold text-xs leading-snug">
                    {service.name}
                  </div>
                  <div className={`text-[11px] ${isSelected ? "opacity-75" : "text-muted"}`}>
                    {service.duration_min} minutter
                  </div>
                </div>
              </div>

              <div className="font-bold text-xs flex-shrink-0 pt-0.5">
                {service.price_nok} {currency}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Continue Action */}
      <div className="pt-2">
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={onContinue}
          className="w-full py-3.5 px-6 rounded-full bg-foreground text-background font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Neste: Velg tidspunkt</span>
          <span>&rarr;</span>
        </button>
      </div>
    </section>
  );
}
