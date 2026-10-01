"use client";

import React, { useState } from "react";
import { 
  FiChevronDown, 
  FiPlus, 
  FiMinus, 
  FiCornerDownRight, 
  FiCheck,
  FiHelpCircle,
  FiTerminal,
  FiZap
} from "react-icons/fi";

// 01. Minimal Hairline Rule Accordion
export function AccordionHairlineRule() {
  const [open, setOpen] = useState<number | null>(0);

  const items = [
    { q: "How long does a full set take?", a: "Around 90 minutes. We dedicate full time to precision cuticle cleaning and structured apex balancing so your set lasts 4+ weeks." },
    { q: "Do you require a deposit?", a: "Yes, a 250 kr deposit via Vipps locks your studio chair. It is deducted from your final bill on appointment day." },
  ];

  return (
    <div className="w-full bg-white border border-neutral-300 p-5 divide-y divide-neutral-200 font-mono text-xs text-neutral-900">
      {items.map((item, idx) => (
        <div key={item.q} className="py-3 first:pt-0 last:pb-0">
          <button
            onClick={() => setOpen(open === idx ? null : idx)}
            className="w-full flex justify-between items-center text-left py-1"
          >
            <span className={`font-bold ${open === idx ? "text-black" : "text-neutral-500"}`}>
              {item.q}
            </span>
            <span className="text-neutral-400 text-sm font-bold">{open === idx ? "−" : "+"}</span>
          </button>
          {open === idx && (
            <p className="text-neutral-600 text-[11px] leading-relaxed pt-2">
              {item.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// 02. Boxed Brutalist Cell Accordion
export function AccordionBrutalistCell() {
  const [open, setOpen] = useState<number | null>(0);

  const items = [
    { title: "WHAT HAPPENS IF I AM LATE?", content: "Grace period is 15 minutes. Beyond that, the appointment may need to be shortened to basic BIAB to respect the next booked client." },
    { title: "HOW DO CANCELLATIONS WORK?", content: "Cancel up to 24 hours in advance with zero penalty. Deposits are refunded instantly via Vipps." },
  ];

  return (
    <div className="w-full bg-[#fffeee] border-2 border-black p-3 space-y-2 font-mono text-xs text-black">
      {items.map((item, i) => (
        <div key={item.title} className="border-2 border-black">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className={`w-full p-3 flex justify-between items-center text-left font-bold ${
              open === i ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            <span>{item.title}</span>
            <span>{open === i ? "[CLOSE]" : "[OPEN]"}</span>
          </button>
          {open === i && (
            <div className="p-3 bg-white text-black text-[11px] border-t-2 border-black leading-relaxed">
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// 03. Numbered Dossier Accordion
export function AccordionNumberedDossier() {
  const [open, setOpen] = useState<number | null>(0);

  const faqs = [
    { num: "01", label: "INTAKE & HEALTH CHECK", detail: "We examine natural nail plates before treatment. If active fungal infections exist, we advise healing first." },
    { num: "02", label: "VIPPS INSTANT CONFIRMATION", detail: "Once you submit your slot, Vipps prompts a 250 kr hold. You receive an SMS booking pass within 10 seconds." },
  ];

  return (
    <div className="w-full bg-[#f9f9f9] border border-neutral-300 p-5 font-mono text-xs text-neutral-900">
      <div className="space-y-3">
        {faqs.map((f, idx) => (
          <div key={f.num} className="border-b border-neutral-200 pb-3">
            <div
              onClick={() => setOpen(open === idx ? null : idx)}
              className="flex items-center gap-3 cursor-pointer py-1"
            >
              <span className="font-bold text-black text-sm">{f.num}</span>
              <span className="font-bold text-black flex-1 uppercase tracking-tight">{f.label}</span>
              <span className="text-[10px] text-neutral-500 border border-neutral-300 px-1.5 py-0.5 bg-white">
                {open === idx ? "COLLAPSE" : "EXPAND"}
              </span>
            </div>
            {open === idx && (
              <p className="text-neutral-600 text-[11px] pl-7 pt-2 leading-relaxed">
                {f.detail}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 04. Side-by-Side 2-Column Ledger
export function AccordionSideBySide() {
  const [selected, setSelected] = useState(0);

  const entries = [
    { title: "Nail Aftercare", text: "Apply cuticle oil twice daily. Avoid using nails as tools to open cans or boxes to prevent lateral hairline fractures." },
    { title: "Refill Cycle", text: "Optimal rebalance is every 3 to 4 weeks. Waiting longer places excessive mechanical torque on your natural nail apex." },
    { title: "Allergy Safety", text: "We exclusively use HEMA-free Japanese and European gel systems to protect sensitive nail beds." },
  ];

  return (
    <div className="w-full bg-white border border-neutral-300 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs text-neutral-900">
      <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-neutral-200 pb-4 sm:pb-0 sm:pr-4">
        <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-2 font-bold">TOPICS</span>
        {entries.map((e, idx) => (
          <button
            key={e.title}
            onClick={() => setSelected(idx)}
            className={`w-full text-left p-2 transition-colors ${
              selected === idx 
                ? "bg-black text-white font-bold" 
                : "text-neutral-600 hover:text-black border border-neutral-200"
            }`}
          >
            {e.title}
          </button>
        ))}
      </div>
      <div className="flex flex-col justify-center p-2">
        <span className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 font-bold">
          DETAIL VIEW
        </span>
        <h4 className="font-bold text-black mb-2">{entries[selected].title}</h4>
        <p className="text-neutral-600 text-[11px] leading-relaxed">
          {entries[selected].text}
        </p>
      </div>
    </div>
  );
}

// 05. Plus / Minus Minimalist Switcher
export function AccordionPlusMinus() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-[#f8f8f8] border border-neutral-300 p-5 font-mono text-xs text-neutral-900">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer select-none"
      >
        <span className="font-bold uppercase tracking-tight text-black">
          ARE RETENTIONS GUARANTEED?
        </span>
        <span className="text-base font-bold text-black w-6 h-6 flex items-center justify-center border border-neutral-400 bg-white">
          {open ? <FiMinus className="text-xs" /> : <FiPlus className="text-xs" />}
        </span>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-neutral-300 text-neutral-600 text-[11px] leading-relaxed">
          Yes. Any unexpected lifting within the first 7 days is repaired at the studio completely free of charge.
        </div>
      )}
    </div>
  );
}

// 06. Floating Card Separator Accordion
export function AccordionFloatingCards() {
  const [open, setOpen] = useState<number | null>(null);

  const cards = [
    { title: "Can I bring inspiration photos?", desc: "Absolutely. Send photos ahead in the booking questionnaire or show them during your appointment." },
    { title: "Do you remove existing acrylics?", desc: "We only remove our own BIAB or soft gel from other salons. Heavy acrylic removals require a 200 kr add-on slot." },
  ];

  return (
    <div className="w-full bg-neutral-100 border border-neutral-300 p-4 space-y-2 font-mono text-xs text-neutral-900">
      {cards.map((c, i) => (
        <div key={c.title} className="bg-white border border-neutral-300 p-3 shadow-sm">
          <div 
            onClick={() => setOpen(open === i ? null : i)}
            className="flex justify-between items-center cursor-pointer font-bold text-black"
          >
            <span>{c.title}</span>
            <FiChevronDown className={`transition-transform duration-300 ${open === i ? "rotate-180" : ""}`} />
          </div>
          {open === i && (
            <p className="text-neutral-600 text-[11px] pt-2 mt-2 border-t border-neutral-200 leading-relaxed">
              {c.desc}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// 07. Service Item with Price & Expandable Inclusions
export function AccordionServicePrice() {
  const [open, setOpen] = useState(true);

  return (
    <div className="w-full bg-white border border-neutral-300 p-4 font-mono text-xs text-neutral-900">
      <div 
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between cursor-pointer py-1"
      >
        <div>
          <span className="font-bold text-black block">STRUCTURED BIAB GEL</span>
          <span className="text-[10px] text-neutral-500">90 MINUTES · RUSSIAN MANICURE</span>
        </div>
        <div className="text-right">
          <span className="font-bold text-black text-sm">750 KR</span>
          <span className="block text-[9px] text-neutral-500 font-bold">{open ? "HIDE SPECS ▲" : "VIEW SPECS ▼"}</span>
        </div>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-neutral-200 space-y-1 text-[11px] text-neutral-600">
          <div className="flex items-center gap-1.5"><FiCheck className="text-emerald-600 text-xs font-bold" /> Precision e-file dry cuticle cleansing</div>
          <div className="flex items-center gap-1.5"><FiCheck className="text-emerald-600 text-xs font-bold" /> High apex reinforcement for zero breakage</div>
          <div className="flex items-center gap-1.5"><FiCheck className="text-emerald-600 text-xs font-bold" /> High gloss no-wipe topcoat &amp; cuticle oil finish</div>
        </div>
      )}
    </div>
  );
}

// 08. Horizontal Filter Dropdown / Tab Pill Bar
export function AccordionTabPills() {
  const [activeTab, setActiveTab] = useState("policies");

  return (
    <div className="w-full bg-[#f9f9f9] border border-neutral-300 p-5 font-mono text-xs text-neutral-900">
      <div className="flex gap-2 border-b border-neutral-200 pb-3 mb-3">
        {["policies", "prep", "deposits"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 uppercase text-[10px] font-bold ${
              activeTab === tab 
                ? "bg-black text-white" 
                : "border border-neutral-300 bg-white text-neutral-600 hover:text-black"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-neutral-600 leading-relaxed">
        {activeTab === "policies" && "Strict 24-hour rescheduling policy. Arrive without nail polish or book an additional removal slot."}
        {activeTab === "prep" && "Do not apply heavy hand lotions on the morning of your visit, as natural oils can reduce gel adhesion."}
        {activeTab === "deposits" && "250 kr deposit handled automatically via Vipps. Zero monthly subscription or platform fees."}
      </div>
    </div>
  );
}

// 09. Monospace Code-Block Inspector Dropdown
export function AccordionCodeInspector() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs text-white">
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between cursor-pointer bg-zinc-900 p-2 border border-zinc-800"
      >
        <div className="flex items-center gap-2 font-bold text-emerald-400">
          <FiTerminal className="text-sm" />
          <span>&gt; query: package_specs.json</span>
        </div>
        <span className="text-[10px] text-zinc-400">{expanded ? "HIDE" : "EXECUTE"}</span>
      </div>
      {expanded && (
        <pre className="mt-2 p-3 bg-black border border-zinc-800 text-[10px] text-emerald-300 leading-relaxed overflow-x-auto">
{`{
  "tier": "The Booking Drop",
  "price": "2,000 kr (one-time)",
  "timeline": "48 hours - 1 week",
  "inclusions": [
    "1-page mobile site",
    "Direct Vipps payment sync",
    "Interactive 6-photo lookbook",
    "No monthly recurring fees"
  ]
}`}
        </pre>
      )}
    </div>
  );
}

// 10. Luxury Atelier Micro-FAQ (Chevron Snap)
export function AccordionChevronSnap() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-[#0d0d10] border border-[#3b3221] p-5 text-[#d4af37]">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer select-none"
      >
        <span className="font-serif italic text-base text-[#f5e8cd]">
          Do you take custom bespoke commissions?
        </span>
        <FiChevronDown className={`text-[#d4af37] transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <p className="font-mono text-xs text-[#a39474] mt-3 pt-3 border-t border-[#3b3221] leading-relaxed">
          Yes. For bespoke projects outside our standard menu, reach out directly at hello@agure.space with your reference imagery and deadline.
        </p>
      )}
    </div>
  );
}

// 11. Multi-Tier Sub-Item Drilldown
export function AccordionNestedDrilldown() {
  const [open, setOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<string[]>(["Chrome French (+100 kr)"]);

  const toggleSub = (item: string) => {
    if (selectedSub.includes(item)) {
      setSelectedSub(selectedSub.filter((s) => s !== item));
    } else {
      setSelectedSub([...selectedSub, item]);
    }
  };

  return (
    <div className="w-full bg-white border border-neutral-300 p-4 font-mono text-xs text-neutral-900">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer font-bold text-black"
      >
        <span>NAIL ART ADD-ONS (+DRILLDOWN)</span>
        <span className="text-[10px] text-neutral-500 border border-neutral-300 px-1.5 py-0.5">
          {open ? "COLLAPSE" : "CHOOSE (3 OPTIONS)"}
        </span>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-neutral-200 space-y-2">
          {["Chrome French (+100 kr)", "3D Gel Droplets (+150 kr)", "Custom Airbrush Aura (+120 kr)"].map((sub) => (
            <div 
              key={sub}
              onClick={() => toggleSub(sub)}
              className={`p-2 border cursor-pointer flex justify-between items-center text-[11px] ${
                selectedSub.includes(sub) 
                  ? "border-black bg-neutral-100 font-bold text-black" 
                  : "border-neutral-200 text-neutral-600"
              }`}
            >
              <span>{sub}</span>
              <span>{selectedSub.includes(sub) ? "✓ ADDED" : "+ ADD"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 12. Borderless Ghost Expandable
export function AccordionBorderlessGhost() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-[#fbf9f5] p-5 text-neutral-900">
      <div 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <span className="w-2 h-2 rounded-full bg-black group-hover:scale-125 transition-transform" />
        <span className="font-heading font-black text-sm uppercase text-black">
          WHAT IF I NEED CHANGES AFTER DELIVERY?
        </span>
      </div>
      {open && (
        <p className="font-mono text-xs text-neutral-600 pl-5 pt-3 leading-relaxed">
          Every build comes with 1 round of revisions. If you need regular ongoing updates, optional monthly updates are just 250 kr/month.
        </p>
      )}
    </div>
  );
}

// =========================================================================
// 10 BRAND-NEW CREATIVE ACCORDION STYLES (DIVERSE AESTHETICS & LIBRARIES)
// =========================================================================

// 13. Warm Terracotta Pill Accordion (Pottery & Artisan Studio FAQ)
export function AccordionTerracottaPill() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-[#fbf7f2] border border-[#e4d7cb] p-4 rounded-xl text-[#2c221c]">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer select-none font-serif text-sm font-semibold"
      >
        <span>When will my glazed pottery be ready to pick up?</span>
        <span className="w-6 h-6 rounded-full bg-[#f2e4d6] text-[#c25e3e] flex items-center justify-center text-xs font-bold">
          {open ? "−" : "+"}
        </span>
      </div>
      {open && (
        <p className="text-xs text-[#6e584c] mt-3 pt-3 border-t border-[#e4d7cb] leading-relaxed">
          Pieces require 2 to 3 weeks for complete bisque firing and high-fire glazing. We notify you via SMS when your stoneware is packed and ready for studio pickup.
        </p>
      )}
    </div>
  );
}

// 14. Patisserie Flavor Allergens Accordion (Cake Studios)
export function AccordionPatisserieFlavors() {
  const [open, setOpen] = useState(true);

  return (
    <div className="w-full bg-[#fdf5f7] border border-[#f5d9e3] p-5 rounded-md text-[#541624]">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer"
      >
        <div>
          <span className="font-serif text-sm font-bold block">PISTACHIO &amp; RASPBERRY TIER</span>
          <span className="text-[10px] font-mono text-[#8a384e]">ORGANIC SICILIAN PISTACHIO PASTE</span>
        </div>
        <span className="text-xs font-serif underline">{open ? "Hide Details" : "View Allergens"}</span>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-[#f5d9e3] text-xs space-y-2">
          <p className="text-[#6e2b3c] leading-relaxed">
            Whipped white chocolate ganache, fresh raspberry coulis, and lightly salted pistachio sponge.
          </p>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-[#fce8ef] text-[#732236] text-[10px] font-mono rounded">TREE NUTS</span>
            <span className="px-2 py-0.5 bg-[#fce8ef] text-[#732236] text-[10px] font-mono rounded">DAIRY</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded">GLUTEN-FREE AVAILABLE</span>
          </div>
        </div>
      )}
    </div>
  );
}

// 15. Japanese Zen Sage Accordion (Calm Spa & Natural Nails)
export function AccordionWabiSabiTea() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-[#f3f6f1] border-l-3 border-[#3f5743] p-4 text-[#1e2e21]">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer font-serif text-sm"
      >
        <span>Do you use electric files on natural nail beds?</span>
        <span className="text-xs font-mono text-[#4b664f]">{open ? "閉じる" : "詳細"}</span>
      </div>
      {open && (
        <p className="text-xs font-sans text-[#415545] mt-3 pt-2 border-t border-[#d8e2d5] leading-relaxed">
          Never directly on your natural plate. We strictly use Japanese diamond micro-bits for gentle cuticle lift, preserving full keratin thickness.
        </p>
      )}
    </div>
  );
}

// 16. Cyberpunk Glowing Terminal Accordion (Grillz & Streetwear)
export function AccordionCyberTerminal() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-[#0a0a0d] border border-[#bef264]/40 p-4 text-white font-mono text-xs shadow-[0_0_15px_rgba(190,242,100,0.1)]">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer text-[#bef264]"
      >
        <span>&gt; INTEL: HOW DOES 3D TEETH SCANNING WORK?</span>
        <span className="font-bold">{open ? "[-]" : "[+]"}</span>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-zinc-800 text-zinc-300 leading-relaxed text-[11px]">
          We use an intraoral optical laser wand. Zero slimy alginate impression trays. Takes 90 seconds and gives a precision tolerance of 15 microns for a snap-tight fit.
        </div>
      )}
    </div>
  );
}

// 17. Neo-Brutalist Chunky Accordion (Y2K Pop Indie Beauty)
export function AccordionNeoPopChunky() {
  const [open, setOpen] = useState(true);

  return (
    <div className="w-full bg-[#fde047] border-3 border-black p-4 text-black shadow-[4px_4px_0px_#000]">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer font-black text-sm uppercase"
      >
        <span>CAN I ADD 3D CRYSTALS ON APPOINTMENT DAY?</span>
        <span className="w-7 h-7 bg-black text-white flex items-center justify-center text-sm font-bold">
          {open ? "▲" : "▼"}
        </span>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t-2 border-black font-mono text-xs font-semibold leading-relaxed bg-white p-3 border-2">
          YES! Just mention it at the start of your appointment. Crystal charms and hand-painted aura gradients are priced from +80 kr to +150 kr.
        </div>
      )}
    </div>
  );
}

// 18. Magic UI Frosted Glass Glow Accordion (Modern Sleek Web)
export function AccordionMagicGlassGlow() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-neutral-900/80 backdrop-blur-xl border border-cyan-500/30 p-4 rounded-xl text-white">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer text-xs font-mono"
      >
        <span className="flex items-center gap-2 font-bold text-cyan-300">
          <FiZap />
          <span>DO YOU SUPPORT INSTANT VIPPS DEPOSITS?</span>
        </span>
        <FiChevronDown className={`text-cyan-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <p className="text-xs text-neutral-400 font-mono mt-3 pt-3 border-t border-white/10 leading-relaxed">
          Yes. The user taps once, Vipps opens natively, authenticates with FaceID, and confirmation hits the site within 10 seconds. Zero lost bookings.
        </p>
      )}
    </div>
  );
}

// 19. Luxury Fine Jewelry Roman Accordion (Ateliers & Gems)
export function AccordionLuxuryGoldAtelier() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-[#0a0a0d] border border-[#4a3e28] p-5 text-[#d4af37]">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="font-serif text-xs text-[#947d4e]">§ II</span>
          <span className="font-serif text-sm tracking-wider text-[#f5e8cd] uppercase">
            CERTIFICATION OF GEM ORIGIN
          </span>
        </div>
        <span className="text-xs text-[#d4af37] font-serif">{open ? "−" : "+"}</span>
      </div>
      {open && (
        <p className="font-serif text-xs text-[#b8a682] mt-3 pt-3 border-t border-[#4a3e28] leading-relaxed">
          Every Colombian and Zambian emerald over 0.5 carats is accompanied by an independent gemological lab dossier verifying unheated provenance.
        </p>
      )}
    </div>
  );
}

// 20. Wedding Itinerary Timeline Accordion (Bridal Photographers)
export function AccordionWeddingTimeline() {
  const [open, setOpen] = useState(true);

  return (
    <div className="w-full bg-[#faf7f2] border border-[#ded5c7] p-5 rounded-sm text-[#2b2118]">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer"
      >
        <span className="font-serif italic text-sm font-semibold">
          How do we schedule the Golden Hour portrait session?
        </span>
        <span className="text-xs font-mono text-[#786452]">{open ? "Close" : "Open"}</span>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-[#ded5c7] text-xs text-[#57483b] space-y-2 leading-relaxed">
          <p>
            We coordinate directly with your wedding planner. Approximately 45 minutes before sunset, we slip away for just 20 uninterrupted minutes to catch soft cinematic light.
          </p>
        </div>
      )}
    </div>
  );
}

// 21. Barber Hair Cut & Shave Care Accordion (Barbershop)
export function AccordionBarberQueueCheck() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-[#18181b] border border-zinc-700 p-4 text-white font-mono text-xs">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer"
      >
        <span className="text-[#ea580c] font-black uppercase">
          HOW TO PREPARE BEFORE A HOT TOWEL SHAVE
        </span>
        <span className="font-bold">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <p className="text-zinc-400 mt-3 pt-3 border-t border-zinc-800 leading-relaxed text-[11px]">
          Avoid exfoliating 24 hours prior. Let your facial hair grow for at least 3 days for the cleanest, smoothest blade glide without razor burn.
        </p>
      )}
    </div>
  );
}

// 22. Botanical Bouquet Care Accordion (Florists & Plants)
export function AccordionBotanicalCare() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-[#f6f2e8] border border-[#d2c7b4] p-4 text-[#30281e]">
      <div 
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center cursor-pointer font-serif text-sm"
      >
        <span>How to extend your bouquet life to 12+ days</span>
        <span className="text-xs text-[#7d6c56] font-mono">{open ? "−" : "+"}</span>
      </div>
      {open && (
        <p className="text-xs text-[#594d3c] mt-3 pt-2 border-t border-[#d2c7b4] leading-relaxed">
          Trim stems at a 45-degree angle under cool water every two days. Keep away from direct afternoon sun and fruit bowls emitting ripening ethylene gas.
        </p>
      )}
    </div>
  );
}
