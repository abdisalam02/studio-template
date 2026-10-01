import React from "react";

interface StepperProps {
  currentStep: number; // 1, 2, 3, 4
}

const STEPS = [
  { step: 1, label: "SERVICE" },
  { step: 2, label: "DATE & TIME" },
  { step: 3, label: "DETAILS" },
  { step: 4, label: "CONFIRMED" },
];

export function Stepper({ currentStep }: StepperProps) {
  return (
    <div className="w-full py-4">
      <div className="relative flex items-center justify-between max-w-xl mx-auto px-4">
        {/* Connecting line */}
        <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-[1px] bg-border z-0" />

        {STEPS.map((s) => {
          const isCompleted = currentStep > s.step;
          const isActive = currentStep === s.step;

          return (
            <div
              key={s.step}
              className="relative z-10 flex flex-col items-center gap-1.5"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-foreground text-background ring-4 ring-background"
                    : isCompleted
                    ? "bg-foreground text-background ring-4 ring-background"
                    : "bg-surface text-muted border border-border ring-4 ring-background"
                }`}
              >
                {isCompleted ? "✓" : s.step}
              </div>

              <span
                className={`text-[9px] font-mono uppercase tracking-widest ${
                  isActive
                    ? "font-bold text-foreground"
                    : isCompleted
                    ? "font-medium text-foreground/80"
                    : "text-muted"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
