"use client";

import React from "react";

const POLICIES = [
  {
    title: "Payment",
    rules: [
      "50% deposit required at booking",
      "Remaining balance due at appointment",
      "Vipps, card, or cash accepted",
    ],
  },
  {
    title: "Rescheduling",
    rules: [
      "Free reschedule up to 24h before",
      "Changes within 24h incur 200 kr fee",
      "Max 2 reschedules per booking",
    ],
  },
  {
    title: "Late Arrival",
    rules: [
      "10 min grace period included",
      "After 10 min, session may be shortened",
      "No-shows forfeit full deposit",
    ],
  },
  {
    title: "Cancellation",
    rules: [
      "Full refund if cancelled 48h+ before",
      "50% refund within 24–48h",
      "No refund within 24h of appointment",
    ],
  },
];

export default function NewspaperPolicyGrid() {
  return (
    <section className="w-full max-w-lg mx-auto font-mono">
      <div className="border-t-4 border-b-4 border-[#111113] py-4">
        <h2 className="text-center text-xl font-black uppercase tracking-tight text-[#111113] mb-1">
          Booking Policies
        </h2>
        <p className="text-center text-[10px] text-[#666] uppercase tracking-[0.15em] mb-4">
          Please review before your appointment
        </p>

        <div className="grid grid-cols-2 gap-px bg-[#111113]">
          {POLICIES.map((p) => (
            <div key={p.title} className="bg-[#f6f5f2] p-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#111113] mb-2.5 pb-1.5 border-b border-[#DDD]">
                {p.title}
              </h3>
              <ul className="space-y-1.5">
                {p.rules.map((r, i) => (
                  <li key={i} className="text-[10px] text-[#444] leading-relaxed flex gap-1.5">
                    <span className="text-[#999] flex-shrink-0">—</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
