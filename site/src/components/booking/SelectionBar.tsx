import React from "react";

interface SelectionBarProps {
  selectedNames: string[];
  totalPriceNok: number;
  currency?: string;
}

export function SelectionBar({
  selectedNames,
  totalPriceNok,
  currency = "kr",
}: SelectionBarProps) {
  if (selectedNames.length === 0) return null;

  return (
    <aside aria-label="Valgte behandlinger" className="w-full bg-surface border border-border rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-3 text-xs font-mono">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="text-[12px] opacity-70 flex-shrink-0" aria-hidden="true">&#9670;</span>
        <div className="truncate font-medium text-foreground">
          {selectedNames.join(" + ")}
        </div>
      </div>

      <div className="flex-shrink-0 font-bold text-foreground text-sm">
        {totalPriceNok} {currency}
      </div>
    </aside>
  );
}
