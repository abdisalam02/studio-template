"use client";

import React from "react";

interface YinYangWaveProps {
  fill?: string;
  className?: string;
  flip?: boolean; // Flip horizontally or vertically
  direction?: "down" | "up";
}

export function YinYangWave({
  fill = "#0D0D0D",
  className = "",
  flip = false,
  direction = "down",
}: YinYangWaveProps) {
  // Wave path matching the organic S-curve from the inspo screen
  // direction === "down": top is white, bottom fills with `fill`
  // direction === "up": bottom is white, top fills with `fill`
  const pathD =
    direction === "down"
      ? flip
        ? "M0,35 C200,95 380,-15 580,45 C780,105 880,15 1000,40 L1000,120 L0,120 Z"
        : "M0,50 C180,-10 380,110 580,40 C780,-30 880,80 1000,35 L1000,120 L0,120 Z"
      : flip
      ? "M0,85 C200,25 380,135 580,75 C780,15 880,105 1000,80 L1000,0 L0,0 Z"
      : "M0,70 C180,130 380,10 580,80 C780,150 880,40 1000,85 L1000,0 L0,0 Z";

  return (
    <div className={`w-full overflow-hidden leading-none select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 1000 120"
        preserveAspectRatio="none"
        className="w-full h-8 sm:h-12 block"
        aria-hidden="true"
      >
        <path d={pathD} fill={fill} />
      </svg>
    </div>
  );
}
