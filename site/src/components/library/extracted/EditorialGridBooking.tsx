"use client";

import React, { useState } from "react";

const TIME_SLOTS = [
  { time: "09:00", available: true },
  { time: "10:30", available: true },
  { time: "12:00", available: false },
  { time: "13:30", available: true },
  { time: "15:00", available: true },
  { time: "16:30", available: false },
];

const DATES = [
  { day: "Mon", date: "28", month: "Oct" },
  { day: "Tue", date: "29", month: "Oct" },
  { day: "Wed", date: "30", month: "Oct" },
  { day: "Thu", date: "31", month: "Oct" },
  { day: "Fri", date: "1", month: "Nov" },
];

export default function EditorialGridBooking() {
  const [selectedDate, setSelectedDate] = useState(1);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);

  return (
    <section className="w-full max-w-md mx-auto font-serif">
      <div className="border border-[#C9A87C]/30">
        <div className="p-6 border-b border-[#C9A87C]/30">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B7766] mb-1">
            Book an Appointment
          </p>
          <h2 className="text-2xl font-light text-[#3D2E24] tracking-tight">
            Select Your Session
          </h2>
        </div>

        <div className="grid grid-cols-5 border-b border-[#C9A87C]/30">
          {DATES.map((d, i) => (
            <button
              key={i}
              onClick={() => setSelectedDate(i)}
              className={`py-4 text-center transition-colors border-r last:border-r-0 border-[#C9A87C]/20 ${
                selectedDate === i
                  ? "bg-[#3D2E24] text-[#f6f5f2]"
                  : "text-[#8B7766] hover:bg-[#F5EDE3]"
              }`}
            >
              <span className="block text-[10px] font-mono uppercase tracking-wider">
                {d.day}
              </span>
              <span className="block text-lg font-light mt-0.5">{d.date}</span>
              <span className="block text-[9px] font-mono uppercase tracking-wider opacity-60">
                {d.month}
              </span>
            </button>
          ))}
        </div>

        <div className="p-5 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#8B7766] mb-3">
            Available Times — {DATES[selectedDate]?.day} {DATES[selectedDate]?.date}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((slot, i) => (
              <button
                key={i}
                disabled={!slot.available}
                onClick={() => setSelectedTime(i)}
                className={`py-2.5 text-center text-sm font-mono border transition-colors ${
                  !slot.available
                    ? "border-[#E8E3D6] text-[#CCC] cursor-not-allowed line-through"
                    : selectedTime === i
                    ? "bg-[#3D2E24] text-[#f6f5f2] border-[#3D2E24]"
                    : "border-[#C9A87C]/40 text-[#3D2E24] hover:border-[#3D2E24]"
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-[#C9A87C]/30">
          <button className="w-full py-3 bg-[#3D2E24] text-[#f6f5f2] text-xs font-mono uppercase tracking-[0.15em] hover:bg-[#2A1F18] transition-colors">
            Confirm Booking
          </button>
        </div>
      </div>
    </section>
  );
}
