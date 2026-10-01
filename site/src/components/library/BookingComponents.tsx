"use client";

import React, { useState } from "react";
import { 
  FiCalendar, 
  FiClock, 
  FiCheck, 
  FiCreditCard, 
  FiArrowRight, 
  FiSend,
  FiUser,
  FiPhone,
  FiInstagram,
  FiZap,
  FiHeart
} from "react-icons/fi";

// 01. 1-Tap Calendar Date Pill Strip
export function BookingDateStrip() {
  const [selectedDate, setSelectedDate] = useState("SAT 27");
  const dates = [
    { day: "FRI", date: "26", status: "2 slots" },
    { day: "SAT", date: "27", status: "1 slot" },
    { day: "SUN", date: "28", status: "Closed" },
    { day: "MON", date: "29", status: "4 slots" },
    { day: "TUE", date: "30", status: "3 slots" },
  ];

  return (
    <div className="w-full bg-white border border-neutral-300 p-5 font-mono text-xs text-neutral-900">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-black">SELECT DATE</span>
        <span className="text-[10px] text-neutral-500 font-bold">MARCH 2026</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {dates.map((d) => {
          const isSelected = selectedDate === `${d.day} ${d.date}`;
          const isClosed = d.status === "Closed";
          return (
            <button
              key={d.date}
              disabled={isClosed}
              onClick={() => setSelectedDate(`${d.day} ${d.date}`)}
              className={`p-2 border text-center transition-all ${
                isClosed
                  ? "opacity-30 border-neutral-200 cursor-not-allowed"
                  : isSelected
                  ? "border-black bg-black text-white font-bold shadow-sm"
                  : "border-neutral-300 hover:border-black text-neutral-800 bg-neutral-50"
              }`}
            >
              <div className="text-[10px]">{d.day}</div>
              <div className="text-base font-bold my-0.5">{d.date}</div>
              <div className="text-[8px] uppercase tracking-tighter">{d.status}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 02. Minimalist Time Slot Matrix
export function BookingTimeMatrix() {
  const [slot, setSlot] = useState("12:30");
  const times = [
    { time: "10:00", avail: true },
    { time: "12:30", avail: true },
    { time: "14:15", avail: false },
    { time: "16:00", avail: true },
    { time: "17:45", avail: true },
    { time: "19:15", avail: false },
  ];

  return (
    <div className="w-full bg-[#f8f8f8] border border-neutral-300 p-5 font-mono text-xs text-neutral-900">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-black">AVAILABLE SLOTS</span>
        <span className="text-[10px] text-neutral-500">90 MINUTE APPOINTMENT</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {times.map((t) => (
          <button
            key={t.time}
            disabled={!t.avail}
            onClick={() => setSlot(t.time)}
            className={`py-2 text-center border text-xs transition-colors ${
              !t.avail
                ? "border-neutral-200 opacity-30 line-through cursor-not-allowed bg-neutral-100"
                : slot === t.time
                ? "bg-black text-white font-bold border-black"
                : "border-neutral-300 text-neutral-800 bg-white hover:border-black"
            }`}
          >
            {t.time}
          </button>
        ))}
      </div>
    </div>
  );
}

// 03. Digital Boarding Pass / Ticket Slip
export function BookingBoardingPass() {
  return (
    <div className="w-full bg-white border-2 border-black p-5 font-mono text-xs shadow-md text-black">
      <div className="flex justify-between items-start pb-4 border-b-2 border-dashed border-neutral-300">
        <div>
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest block font-bold">DIGITAL STUDIO PASS</span>
          <span className="font-heading font-black text-lg text-black tracking-tight">STUDIO KLØ OSLO</span>
        </div>
        <div className="px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
          CONFIRMED
        </div>
      </div>
      <div className="py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] border-b-2 border-dashed border-neutral-300">
        <div>
          <span className="text-[9px] text-neutral-500 block font-bold">GUEST</span>
          <span className="font-bold text-black">SOFIA LIND</span>
        </div>
        <div>
          <span className="text-[9px] text-neutral-500 block font-bold">TREATMENT</span>
          <span className="font-bold text-black">BIAB GEL + FRENCH</span>
        </div>
        <div>
          <span className="text-[9px] text-neutral-500 block font-bold">DATE &amp; TIME</span>
          <span className="font-bold text-black">SAT 27 · 12:30</span>
        </div>
        <div>
          <span className="text-[9px] text-neutral-500 block font-bold">DEPOSIT PAID</span>
          <span className="font-bold text-black">250 KR (VIPPS)</span>
        </div>
      </div>
      <div className="pt-3 flex justify-between items-center text-[10px] text-neutral-500">
        <span>BOOKING ID: #KL-992-OSL</span>
        <span className="text-black font-bold hover:underline cursor-pointer">SAVE TO APPLE WALLET →</span>
      </div>
    </div>
  );
}

// 04. Direct Vipps / Card Quick Deposit Box
export function BookingVippsDeposit() {
  const [method, setMethod] = useState("vipps");

  return (
    <div className="w-full bg-[#fafafa] border border-neutral-300 p-5 font-mono text-xs text-neutral-900">
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="font-bold text-black block">SECURE CHAIR RESERVATION</span>
          <span className="text-[10px] text-neutral-500">Deposit is deducted from final appointment total</span>
        </div>
        <span className="font-heading font-black text-xl text-black">250 KR</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setMethod("vipps")}
          className={`p-2.5 border text-center font-bold ${
            method === "vipps" ? "border-black bg-black text-white" : "border-neutral-300 bg-white text-neutral-600"
          }`}
        >
          VIPPS (10 SECONDS)
        </button>
        <button
          onClick={() => setMethod("card")}
          className={`p-2.5 border text-center font-bold ${
            method === "card" ? "border-black bg-black text-white" : "border-neutral-300 bg-white text-neutral-600"
          }`}
        >
          CREDIT CARD / APPLE PAY
        </button>
      </div>
      <button className="w-full py-3 bg-[#ff5b24] text-white font-black uppercase tracking-wider hover:bg-[#e04f1e] transition-colors shadow-sm">
        PAY 250 KR DEPOSIT VIA VIPPS →
      </button>
    </div>
  );
}

// 05. Treatment Selector Chips
export function BookingSelectorChips() {
  const [selected, setSelected] = useState<string[]>(["Structured BIAB (750 kr)"]);

  const chips = [
    "Structured BIAB (750 kr)",
    "Chrome Powder (+100 kr)",
    "Hand-drawn French (+120 kr)",
    "Old Gel Removal (+150 kr)",
    "Nail Repair (+80 kr)"
  ];

  const toggle = (c: string) => {
    if (selected.includes(c)) {
      setSelected(selected.filter((item) => item !== c));
    } else {
      setSelected([...selected, c]);
    }
  };

  return (
    <div className="w-full bg-white border border-neutral-300 p-5 font-mono text-xs text-neutral-900">
      <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-2 font-bold">
        STEP 1 · CHOOSE YOUR FORMULA
      </span>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isAct = selected.includes(chip);
          return (
            <button
              key={chip}
              onClick={() => toggle(chip)}
              className={`px-3 py-1.5 border transition-all ${
                isAct
                  ? "border-black bg-black text-white font-bold"
                  : "border-neutral-300 bg-neutral-50 text-neutral-700 hover:border-black"
              }`}
            >
              {chip} {isAct ? "✓" : "+"}
            </button>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-between items-center text-[11px]">
        <span className="text-neutral-500 font-bold">Selected {selected.length} items</span>
        <button className="text-black font-bold hover:underline">PROCEED TO DATE →</button>
      </div>
    </div>
  );
}

// 06. Clean 3-Field Booking Slip
export function BookingThreeField() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="w-full bg-white border border-neutral-300 p-5 sm:p-6 font-mono text-xs text-neutral-900">
      <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-3 font-bold">
        QUICK RESERVATION SLIP
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-neutral-500 block mb-1 font-bold">YOUR FULL NAME</label>
          <input
            type="text"
            placeholder="e.g. Sofia Lind"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 border border-neutral-300 bg-neutral-50 text-black outline-none focus:border-black"
          />
        </div>
        <div>
          <label className="text-[10px] text-neutral-500 block mb-1 font-bold">NORWEGIAN MOBILE (+47)</label>
          <input
            type="tel"
            placeholder="901 23 456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-2.5 border border-neutral-300 bg-neutral-50 text-black outline-none focus:border-black"
          />
        </div>
        <button className="w-full py-3 bg-black text-white font-bold uppercase tracking-wider mt-2 hover:bg-neutral-800">
          CONFIRM SLOT &amp; PAY DEPOSIT
        </button>
      </div>
    </div>
  );
}

// 07. Floating Mobile Bottom Action Pill
export function BookingMobileBottomPill() {
  return (
    <div className="w-full p-3 bg-neutral-100 border border-neutral-300 flex justify-center">
      <div className="w-full max-w-md bg-white border border-neutral-300 p-2.5 flex items-center justify-between shadow-lg font-mono text-xs text-neutral-900 rounded-xl">
        <div>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            SLOT OPEN: TOMORROW 14:00
          </span>
          <span className="text-black font-bold block text-[11px]">Structured BIAB · 750 kr</span>
        </div>
        <button className="px-4 py-2 bg-black text-white font-bold uppercase text-[11px] rounded-lg hover:bg-neutral-800">
          BOOK NOW
        </button>
      </div>
    </div>
  );
}

// 08. Monospaced Booking Terminal
export function BookingMonoTerminal() {
  const [cmd, setCmd] = useState("reserve --service=biab --date=2026-03-27");

  return (
    <div className="w-full bg-neutral-950 text-neutral-100 border border-neutral-800 p-4 font-mono text-xs">
      <div className="flex items-center gap-2 pb-2 border-b border-neutral-800 text-[10px] text-neutral-400">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="w-2 h-2 rounded-full bg-yellow-500" />
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="ml-2">studio-terminal://oslo.booking</span>
      </div>
      <div className="pt-3 space-y-2 text-[11px]">
        <div className="text-neutral-400">&gt; checking studio availability... [OK]</div>
        <div className="text-emerald-400">&gt; slot confirmed: Friday 27 March 12:30 CET</div>
        <div className="flex items-center gap-2 pt-1 text-white">
          <span className="text-neutral-400">&gt;</span>
          <input
            type="text"
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            className="w-full bg-transparent text-white outline-none border-b border-neutral-700 pb-0.5"
          />
        </div>
      </div>
      <div className="mt-4 pt-2 border-t border-neutral-800 flex justify-between text-[10px] text-neutral-400">
        <span>PRESS [ENTER] TO EXECUTE VIPPS FLOW</span>
        <span className="text-white font-bold">READY</span>
      </div>
    </div>
  );
}

// 09. Consultation Intake Questionnaire Card
export function BookingIntakeCard() {
  const [shape, setShape] = useState("Almond");

  return (
    <div className="w-full bg-white border border-neutral-300 p-5 font-mono text-xs text-neutral-900">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-black">QUESTIONNAIRE: SHAPE &amp; STYLE</span>
        <span className="text-[10px] text-neutral-500 font-bold">STEP 1 OF 3</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {["Almond", "Square", "Coffin", "Natural Oval"].map((s) => (
          <button
            key={s}
            onClick={() => setShape(s)}
            className={`p-2 border text-center transition-all ${
              shape === s ? "border-black bg-black text-white font-bold" : "border-neutral-300 bg-neutral-50 text-neutral-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-neutral-600 leading-relaxed mb-4">
        Preference: <strong className="text-black">{shape}</strong>. We adjust proportion to elongate natural fingers.
      </p>
      <button className="w-full py-2.5 border-2 border-black font-black uppercase hover:bg-black hover:text-white transition-colors">
        NEXT STEP: SELECT ART WORK →
      </button>
    </div>
  );
}

// 10. Instagram Direct Booking Launcher Card
export function BookingInstaLauncher() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-5 font-mono text-xs text-neutral-900">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center text-black">
          <FiInstagram className="text-base" />
        </div>
        <div>
          <span className="font-bold text-black block">INSTAGRAM BIO LAUNCHER</span>
          <span className="text-[10px] text-neutral-500">Direct tap-to-book link for your @bio</span>
        </div>
      </div>
      <div className="p-3 bg-neutral-100 border border-neutral-300 flex justify-between items-center mb-3">
        <span className="text-black font-bold">agure.space/demo/nails</span>
        <button className="px-2.5 py-1 bg-black text-white text-[10px] font-bold uppercase">
          COPY LINK
        </button>
      </div>
      <div className="text-[10px] text-neutral-500">
        Clients who click your bio reach this exact 1-page booking site in 0.4 seconds.
      </div>
    </div>
  );
}

// =========================================================================
// 10 BRAND-NEW CREATIVE BOOKING MODULES (DIVERSE AESTHETICS & LIBRARIES)
// =========================================================================

// 11. Warm Terracotta Wheel Workshop Booking (Pottery & Artisan)
export function BookingTerracottaWheel() {
  const [seats, setSeats] = useState(2);

  return (
    <div className="w-full bg-[#fcf9f5] border border-[#e3d5c6] p-5 rounded-xl text-[#291f19] font-mono text-xs">
      <div className="flex justify-between items-center pb-3 border-b border-[#e3d5c6] mb-3">
        <div>
          <span className="font-serif italic text-base text-[#291f19] block">Wheel Throwing Workshop</span>
          <span className="text-[10px] text-[#7d6859]">Saturday Session · 11:00 – 14:00</span>
        </div>
        <span className="text-lg font-bold text-[#c25e3e]">850 kr / seat</span>
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[#5c493c]">Choose number of wheels:</span>
        <div className="flex items-center gap-2">
          {[1, 2, 4].map((n) => (
            <button
              key={n}
              onClick={() => setSeats(n)}
              className={`w-8 h-8 rounded-full border text-xs font-bold transition-all ${
                seats === n ? "bg-[#c25e3e] text-white border-[#c25e3e]" : "bg-white border-[#d4c3b2] text-[#5c493c]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <button className="w-full py-3 rounded-full bg-[#c25e3e] text-white font-bold text-xs uppercase hover:bg-[#a64e32] shadow-sm">
        Reserve {seats} Wheel{seats > 1 ? "s" : ""} ({seats * 850} kr) →
      </button>
    </div>
  );
}

// 12. Wedding Cake Tasting Consultation Box (Bakery & Patisserie)
export function BookingCakeTastingDate() {
  return (
    <div className="w-full bg-[#fdf5f7] border border-[#f5d9e3] p-5 rounded-md text-[#541624] font-serif">
      <div className="text-center mb-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#a1445b] block mb-1">
          WEDDING TASTING BOX APPOINTMENT
        </span>
        <h3 className="text-xl font-bold text-[#541624]">Reserve Your Private Tasting</h3>
      </div>
      <div className="space-y-2 mb-4 font-sans text-xs">
        <div className="p-2.5 bg-white rounded border border-[#f5d9e3] flex justify-between items-center">
          <span>Tasting Box (4 Flavor Profiles)</span>
          <span className="font-bold text-[#8b263e]">400 kr</span>
        </div>
      </div>
      <button className="w-full py-2.5 bg-[#8b263e] text-white text-xs font-serif rounded hover:bg-[#731f33] shadow-sm">
        Book Weekend Tasting Consultation
      </button>
    </div>
  );
}

// 13. Japanese Zen Ritual Scheduler (Spa & Natural Nails)
export function BookingZenMatchaCalendar() {
  return (
    <div className="w-full bg-[#f4f7f2] border border-[#d6e0d2] p-5 rounded text-[#213123] font-mono text-xs">
      <div className="flex justify-between items-center mb-3">
        <span className="font-serif text-sm font-semibold">Matcha &amp; Mineral Soak Session</span>
        <span className="text-[10px] px-2 py-0.5 bg-[#dbe8d7] text-[#2c402f] rounded">60 MIN</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {["11:00", "13:30", "16:00"].map((time, i) => (
          <button key={time} className={`py-2 text-center border rounded ${i === 0 ? "bg-[#2d4230] text-white border-[#2d4230]" : "bg-white border-[#d6e0d2]"}`}>
            {time}
          </button>
        ))}
      </div>
      <button className="w-full py-2.5 bg-[#2d4230] text-[#f4f7f2] font-mono text-xs rounded hover:bg-[#203022]">
        RESERVE CHAIR · VIPPS 650 KR
      </button>
    </div>
  );
}

// 14. Cyberpunk 3D Teeth Impression Booking (Grillz & Piercing)
export function BookingCyberGrillzImpression() {
  return (
    <div className="w-full bg-[#0a0a0d] border border-[#bef264]/40 p-5 text-white font-mono text-xs shadow-[0_0_20px_rgba(190,242,100,0.15)]">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-800 text-[#bef264] mb-3">
        <span>BOOKING_PROTOCOL // 3D_SCAN</span>
        <span>LAB_ID: #099</span>
      </div>
      <div className="space-y-2 mb-4 text-[11px]">
        <div className="p-2 bg-zinc-900 border border-zinc-800 flex justify-between">
          <span className="text-zinc-400">Intraoral 3D Laser Scan:</span>
          <span className="text-[#bef264] font-bold">500 KR DEPOSIT</span>
        </div>
        <div className="text-[10px] text-zinc-500">
          * Deposit is fully credited toward final gold or chrome cap fabrication.
        </div>
      </div>
      <button className="w-full py-2.5 bg-[#bef264] text-black font-black uppercase tracking-wider hover:bg-[#d9f99d]">
        SCHEDULE 3D MOLD SCAN →
      </button>
    </div>
  );
}

// 15. Neo-Brutalist Sticker Pop Booking (Y2K Indie Nail & Beauty)
export function BookingNeoPopStickerBooking() {
  return (
    <div className="w-full bg-[#fbcfe8] border-3 border-black p-5 text-black font-mono shadow-[4px_4px_0px_#000]">
      <div className="flex justify-between items-center mb-3">
        <span className="px-2 py-0.5 bg-[#fde047] border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_#000]">
          ✦ INSTANT VIPPS
        </span>
        <span className="font-bold text-xs">NO DMs NEEDED</span>
      </div>
      <div className="space-y-2 mb-3">
        <input
          type="text"
          placeholder="Your Insta @handle or Name"
          className="w-full p-2 border-2 border-black bg-white text-black font-bold outline-none"
        />
        <input
          type="tel"
          placeholder="Mobilnummer (+47)"
          className="w-full p-2 border-2 border-black bg-white text-black font-bold outline-none"
        />
      </div>
      <button className="w-full py-3 bg-[#a855f7] text-white border-3 border-black font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
        LOCK MY CHAIR NOW ✨
      </button>
    </div>
  );
}

// 16. Magic UI Floating Glow Action Pill (Modern Web Booking)
export function BookingMagicFloatingAction() {
  return (
    <div className="w-full p-4 bg-gradient-to-r from-neutral-950 via-zinc-900 to-neutral-950 border border-white/10 flex justify-center">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-cyan-500/40 p-3 rounded-2xl flex items-center justify-between shadow-[0_0_25px_rgba(6,182,212,0.2)] text-white font-mono text-xs">
        <div className="flex items-center gap-2 pl-2">
          <FiZap className="text-cyan-400" />
          <div>
            <span className="text-[10px] text-cyan-300 block">INSTANT CONFIRMATION</span>
            <span className="font-bold text-xs">Friday March 27 · 14:00</span>
          </div>
        </div>
        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs uppercase shadow-md hover:opacity-90">
          Book in 10s
        </button>
      </div>
    </div>
  );
}

// 17. Luxury Fine Jewelry Private Salon Viewing (Ateliers & Gems)
export function BookingLuxuryJewelryPrivate() {
  return (
    <div className="w-full bg-[#0a0a0d] border border-[#4d3d25] p-6 text-[#d4af37] font-serif">
      <div className="text-center mb-4">
        <span className="text-[9px] font-mono tracking-[0.3em] uppercase text-[#947d4e] block mb-1">
          ATELIER VALOIR · KVADRATUREN
        </span>
        <h3 className="text-lg text-[#f5e8cd] font-light">Request Private Salon Appointment</h3>
      </div>
      <div className="space-y-2 mb-4 font-sans text-xs">
        <input
          type="text"
          placeholder="Client Full Name"
          className="w-full p-2.5 bg-black border border-[#4d3d25] text-[#f5e8cd] outline-none"
        />
        <input
          type="email"
          placeholder="client@domain.com"
          className="w-full p-2.5 bg-black border border-[#4d3d25] text-[#f5e8cd] outline-none"
        />
      </div>
      <button className="w-full py-2.5 bg-[#d4af37] text-black font-serif text-xs uppercase tracking-widest font-semibold hover:bg-[#e4c45e]">
        Submit Salon Request
      </button>
    </div>
  );
}

// 18. Wedding Date & Destination Inquiry Card (Bridal Photographers)
export function BookingWeddingContractInquiry() {
  return (
    <div className="w-full bg-[#faf7f2] border border-[#e3d8c8] p-5 rounded-sm text-[#2b2118] font-serif text-xs">
      <span className="text-[10px] font-mono uppercase tracking-widest text-[#7a6452] block mb-2 font-bold">
        CHECK 2026 DATE AVAILABILITY
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 font-sans">
        <input
          type="date"
          className="p-2 border border-[#d6c7b2] bg-white text-black text-xs outline-none"
        />
        <input
          type="text"
          placeholder="Ceremony Venue / City"
          className="p-2 border border-[#d6c7b2] bg-white text-black text-xs outline-none"
        />
      </div>
      <button className="w-full py-2.5 bg-[#33271e] text-[#faf7f2] font-serif text-xs rounded hover:bg-[#1a120b]">
        Check Availability &amp; Receive Pricing Guide →
      </button>
    </div>
  );
}

// 19. Barber Live Queue Chair Reservation (Urban Barbershop)
export function BookingBarberLiveQueue() {
  return (
    <div className="w-full bg-[#18181b] border-2 border-zinc-700 p-5 text-white font-mono text-xs">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-800 mb-3">
        <span className="text-[#ea580c] font-black uppercase">LIVE CHAIR QUEUE</span>
        <span className="text-zinc-400">CHAIR 1: ERIK</span>
      </div>
      <div className="flex justify-between items-center p-3 bg-zinc-900 border border-zinc-700 mb-3">
        <div>
          <span className="text-lg font-black text-white block">Skin Fade + Beard</span>
          <span className="text-zinc-400 text-[11px]">Est. Wait: 12 Minutes</span>
        </div>
        <span className="text-xl font-black text-[#ea580c]">550 KR</span>
      </div>
      <button className="w-full py-3 bg-[#ea580c] text-white font-black uppercase hover:bg-[#c2410c] transition-colors">
        JOIN QUEUE VIA VIPPS →
      </button>
    </div>
  );
}

// 20. Artisan Friday Delivery Subscription Box (Bakery & Florals)
export function BookingArtisanFridayDelivery() {
  return (
    <div className="w-full bg-[#f6f2e8] border-2 border-dashed border-[#b3a490] p-5 text-[#30281e] font-mono text-xs">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-1.5 font-bold uppercase">
          <FiHeart className="text-[#a44230]" />
          <span>FRIDAY DOORSTEP SUBSCRIPTION</span>
        </div>
        <span className="text-[#806f5b]">450 kr / wk</span>
      </div>
      <p className="text-[11px] text-[#594d3c] mb-3 leading-relaxed">
        1 warm country sourdough loaf + 1 seasonal hand-tied wildflower bouquet delivered to your doorstep every Friday before 16:00.
      </p>
      <button className="w-full py-2.5 bg-[#4a3e30] text-white font-bold uppercase hover:bg-[#332b21] transition-colors">
        SUBSCRIBE VIA VIPPS (CANCEL ANYTIME)
      </button>
    </div>
  );
}

// 21. Y2K Acid Chrome Tooth Gem Slip (Tooth Gems, Cyber Nails, Body Art)
export function BookingY2KAcidSlip() {
  const [selectedGem, setSelectedGem] = useState("Swarovski Crystal (450 kr)");

  return (
    <div className="w-full bg-[#121214] border border-[#3a3a42] p-5 text-[#f0f0f5] font-mono text-xs">
      <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-3">
        <span className="text-[#e2fe52] font-black uppercase text-[10px] tracking-wider flex items-center gap-1">
          <FiZap /> FLASH DROP // VIP BOOKING PASS
        </span>
        <span className="text-[10px] text-neutral-400">20 MIN SESSION</span>
      </div>
      <div className="space-y-2 mb-4">
        {["Swarovski Crystal (450 kr)", "18K Solid Gold Star (750 kr)", "Opal Heart Cap (850 kr)"].map((gem) => (
          <button
            key={gem}
            onClick={() => setSelectedGem(gem)}
            className={`w-full p-2.5 text-left border flex items-center justify-between transition-all ${
              selectedGem === gem
                ? "bg-[#232328] border-[#e2fe52] text-white font-bold"
                : "bg-black/40 border-neutral-800 text-neutral-400 hover:text-white"
            }`}
          >
            <span>{gem}</span>
            {selectedGem === gem && <span className="text-[#e2fe52] text-xs">● SELECTED</span>}
          </button>
        ))}
      </div>
      <button className="w-full py-3 bg-[#e2fe52] text-black font-black uppercase hover:bg-[#c9e838] transition-colors shadow-[0_0_15px_rgba(226,254,82,0.3)]">
        LOCK VIP APPOINTMENT (VIPPS) →
      </button>
    </div>
  );
}

// 22. Japanese Sashiko Reservation Pass (Artisan Workshop, Pottery, Tea House)
export function BookingJapaneseSashikoPass() {
  return (
    <div className="w-full bg-[#0d1527] border-2 border-dashed border-[#2a3b5e] p-5 text-[#f8f6f0] font-mono text-xs">
      <div className="flex justify-between items-start pb-3 border-b border-[#2a3b5e] mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-full bg-[#ef4444] text-white flex items-center justify-center text-[9px] font-bold">
              印
            </span>
            <span className="font-bold uppercase text-[10px] tracking-widest text-neutral-400">
              TEA CEREMONY &amp; WHEEL WORKSHOP
            </span>
          </div>
          <span className="font-serif text-base text-white block">Saturday 14:00 – 16:30</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-[#ef4444]">750 KR</span>
          <span className="text-[10px] text-neutral-400 block">MATERIALS INCLUDED</span>
        </div>
      </div>
      <p className="text-[11px] text-neutral-300 mb-4 leading-relaxed">
        Maximum 4 participants per session to ensure hands-on guidance on traditional kick-wheel throwing and sukumo dyeing.
      </p>
      <button className="w-full py-2.5 bg-[#f8f6f0] text-[#0d1527] font-bold uppercase hover:bg-white transition-colors">
        RESERVE WORKSHOP SEAT (VIPPS)
      </button>
    </div>
  );
}

// 23. Swiss Utilitarian Linear Booking Bar (Architectural, Minimalist, Engineering)
export function BookingSwissLinearBar() {
  return (
    <div className="w-full bg-[#f7f7f7] border border-[#d1d1d6] p-5 font-mono text-xs text-black">
      <div className="flex justify-between items-center pb-2 border-b border-black mb-3">
        <span className="font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 bg-[#ff3b30] inline-block" />
          DISCIPLINARY SESSION APPOINTMENT
        </span>
        <span className="text-[10px] text-neutral-500">REF: #OSL-902</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <div className="p-2.5 bg-white border border-neutral-300">
          <span className="text-[9px] text-neutral-400 block uppercase">SESSION TYPE</span>
          <span className="font-bold block text-black">Consultation (60m)</span>
        </div>
        <div className="p-2.5 bg-white border border-neutral-300">
          <span className="text-[9px] text-neutral-400 block uppercase">FEE SCHEDULE</span>
          <span className="font-bold block text-black">1,500 kr Flat</span>
        </div>
        <div className="p-2.5 bg-white border border-neutral-300">
          <span className="text-[9px] text-neutral-400 block uppercase">LOCATION</span>
          <span className="font-bold block text-black">Aker Brygge / Video</span>
        </div>
      </div>
      <button className="w-full py-2.5 bg-black text-white font-bold uppercase hover:bg-neutral-800 transition-colors">
        AUTHORIZE CONSULTATION SLOT →
      </button>
    </div>
  );
}

