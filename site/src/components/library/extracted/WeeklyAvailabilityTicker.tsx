"use client";

import React from "react";

const DAYS = [
  { day: "MON", label: "28 OKT", status: "open", slots: "3 Places" },
  { day: "TUE", label: "29 OKT", status: "open", slots: "2 Places" },
  { day: "WED", label: "30 OKT", status: "last", slots: "Last Place" },
  { day: "THU", label: "31 OKT", status: "closed", slots: "Closed" },
  { day: "FRI", label: "1 NOV", status: "open", slots: "4 Places" },
  { day: "SAT", label: "2 NOV", status: "last", slots: "Last Place" },
  { day: "SUN", label: "3 NOV", status: "closed", slots: "Closed" },
];

const statusStyles: Record<string, string> = {
  open: "bg-[#111113] text-[#f6f5f2]",
  last: "bg-[#C86D51] text-white",
  closed: "bg-[#E8E3D6] text-[#999]",
};

export default function WeeklyAvailabilityTicker() {
  return (
    <section className="w-full py-6 font-mono">
      <div className="overflow-hidden border-y border-[#111113]">
        <div className="flex animate-marquee whitespace-nowrap py-2.5 gap-3">
          {[...DAYS, ...DAYS].map((d, i) => (
            <div key={i} className="inline-flex items-center gap-2 flex-shrink-0 px-4">
              <span className="text-xs font-bold tracking-wider uppercase text-[#111113]">
                {d.day}
              </span>
              <span className="text-[10px] text-[#666]">{d.label}</span>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 tracking-wider ${statusStyles[d.status]}`}
              >
                {d.slots}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 18s linear infinite;
        }
      `}</style>
    </section>
  );
}
