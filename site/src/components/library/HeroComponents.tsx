"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  FiArrowRight, 
  FiCheck, 
  FiClock, 
  FiCalendar, 
  FiMapPin, 
  FiCornerDownRight, 
  FiExternalLink,
  FiStar,
  FiZap
} from "react-icons/fi";

// 01. The Big Ink (Pure Typographic Scale)
export function HeroBigInk() {
  return (
    <div className="w-full bg-[#f8f8f6] border border-neutral-300 p-6 sm:p-10 text-neutral-900">
      <div className="flex items-center justify-between text-xs font-mono text-neutral-500 mb-6">
        <span>[ DISPATCH 2026 ]</span>
        <span>OSLO, NORWAY</span>
      </div>
      <h1 className="font-heading font-black text-3xl sm:text-5xl uppercase tracking-tighter leading-none text-black">
        SOLO BUILDER.<br />
        ZERO FLUFF.<br />
        <span className="text-neutral-400">LIVE IN 48H.</span>
      </h1>
      <div className="mt-8 pt-6 border-t border-neutral-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-xs font-mono text-neutral-600 max-w-sm leading-relaxed">
          I build high-end booking sites for independent creators and studios. Talk directly to me. No agency bloat.
        </p>
        <button className="px-5 py-3 bg-black text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors self-start sm:self-auto">
          VIEW TIER 1 DROP →
        </button>
      </div>
    </div>
  );
}

// 02. Editorial 50/50 Split Screen
export function HeroSplitScreen() {
  return (
    <div className="w-full bg-[#faf7f2] border border-[#e8dfd3] grid grid-cols-1 md:grid-cols-2 text-[#2c221a]">
      <div className="p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#e8dfd3]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#8a7664]">
            Atelier No. 04 · Oslo
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl text-[#1f1712] mt-3 leading-tight">
            Nail architecture tailored to your natural silhouette.
          </h2>
          <p className="text-xs font-mono text-[#6e5c4e] mt-4 leading-relaxed">
            Specializing in structured BIAB gels and Japanese chrome micro-tips. By appointment only.
          </p>
        </div>
        <div className="mt-8 flex items-center gap-4">
          <button className="px-4 py-2.5 bg-[#2c221a] text-[#faf7f2] font-mono text-xs font-bold uppercase hover:bg-[#1a140f]">
            Reserve Set
          </button>
          <span className="text-xs font-mono text-[#8a7664]">Starting from 750 kr</span>
        </div>
      </div>
      <div className="relative h-64 md:h-auto min-h-[220px] bg-neutral-200 overflow-hidden">
        <Image
          src="/demo/nails/nail-1.jpg"
          alt="Studio Klø Nails"
          fill
          className="object-cover contrast-110 hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-mono border border-neutral-300">
          FIG 1.0 — FRENCH CHROME
        </div>
      </div>
    </div>
  );
}

// 03. Floating Portrait Vignette
export function HeroPortraitVignette() {
  return (
    <div className="w-full bg-[#fffcf7] border border-amber-900/15 p-6 sm:p-10 text-center text-amber-950">
      <span className="text-xs font-mono uppercase tracking-widest text-amber-800/80">
        Independent Fine Bakery
      </span>
      <h2 className="font-serif italic text-2xl sm:text-4xl text-amber-950 mt-2 mb-6">
        Couture celebration cakes baked in Grünerløkka.
      </h2>
      <div className="relative mx-auto w-44 h-56 sm:w-52 sm:h-64 border-2 border-amber-900/20 overflow-hidden shadow-md">
        <Image
          src="/demo/cakes/cake-1.jpg"
          alt="Vintage Lambeth Cake"
          fill
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 py-1 bg-amber-950 text-amber-50 text-[10px] font-mono uppercase tracking-wider">
          ORDER WEEKEND SLICE
        </div>
      </div>
      <p className="text-xs font-mono text-amber-900/70 mt-5 max-w-xs mx-auto">
        Natural sourdough sponge, seasonal berry compote, custom piped script.
      </p>
    </div>
  );
}

// 04. Newspaper 3-Column Broadside
export function HeroNewspaperBroadside() {
  return (
    <div className="w-full bg-[#f4efe6] border-2 border-neutral-800 p-5 sm:p-6 font-mono text-xs text-neutral-900">
      <div className="border-b-2 border-neutral-900 pb-2 mb-4 flex items-center justify-between text-[11px] font-bold">
        <span>THE CREATIVE COURIER</span>
        <span>VOL. XII // NO. 44</span>
        <span>PRICE: ZERO MONTHLY FEES</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-neutral-400 pt-1">
        <div className="pr-0 sm:pr-4">
          <div className="text-[10px] text-neutral-600 uppercase font-bold mb-1">§ 01. The Problem</div>
          <p className="text-neutral-700 leading-relaxed text-[11px]">
            &quot;DM for price&quot; drives customers away. Clients want instant transparency, clear treatment menus, and 10-second Vipps checkout.
          </p>
        </div>
        <div className="pt-4 sm:pt-0 sm:px-4">
          <div className="text-[10px] text-neutral-900 uppercase font-bold mb-1">§ 02. The Solution</div>
          <h3 className="font-heading font-black text-base text-neutral-900 uppercase leading-tight mb-2">
            THE BOOKING DROP
          </h3>
          <p className="text-neutral-700 leading-relaxed text-[11px]">
            A custom 1-page mobile site. Target 1–2 weeks. Flat 2,000 kr one-time.
          </p>
        </div>
        <div className="pt-4 sm:pt-0 sm:pl-4 flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-neutral-600 uppercase font-bold mb-1">§ 03. Live Metrics</div>
            <div className="text-neutral-900 font-bold text-lg">94%</div>
            <div className="text-[10px] text-neutral-600">Client reservation completion rate.</div>
          </div>
          <button className="w-full mt-4 py-2 border border-neutral-900 font-bold hover:bg-neutral-900 hover:text-white transition-colors text-[11px]">
            INSPECT CASE STUDY →
          </button>
        </div>
      </div>
    </div>
  );
}

// 05. Cinematic Lookbook Cover
export function HeroCinematicCover() {
  return (
    <div className="relative w-full h-80 sm:h-96 border border-zinc-800 overflow-hidden bg-black flex flex-col justify-between p-6">
      <Image
        src="/demo/wedding/wedding-1.jpg"
        alt="Editorial Wedding Collection"
        fill
        className="object-cover opacity-60 hover:opacity-75 transition-opacity duration-700"
      />
      <div className="relative z-10 flex items-center justify-between text-white/80 font-mono text-xs">
        <span className="tracking-widest uppercase">KONTRAST // 2026</span>
        <span>AUTUMN PORTFOLIO</span>
      </div>
      <div className="relative z-10">
        <span className="px-2 py-0.5 bg-white text-black font-mono text-[10px] uppercase font-bold tracking-wider">
          EXHIBITION
        </span>
        <h2 className="font-serif italic text-3xl sm:text-5xl text-white mt-2 leading-none">
          Documentary intimacy in raw light.
        </h2>
        <div className="mt-4 flex items-center gap-4">
          <button className="px-4 py-2 bg-white text-black font-mono text-xs font-bold hover:bg-neutral-200">
            VIEW FULL SERIES
          </button>
          <span className="text-xs font-mono text-white/70">8 SLOTS REMAINING</span>
        </div>
      </div>
    </div>
  );
}

// 06. Brutalist Wireframe Blueprint
export function HeroBrutalistWireframe() {
  return (
    <div className="w-full bg-[#fffeee] border-2 border-black p-5 font-mono text-xs relative text-black">
      <div className="absolute top-2 left-2 text-[10px] font-bold">+</div>
      <div className="absolute top-2 right-2 text-[10px] font-bold">+</div>
      <div className="absolute bottom-2 left-2 text-[10px] font-bold">+</div>
      <div className="absolute bottom-2 right-2 text-[10px] font-bold">+</div>

      <div className="border-b-2 border-black pb-2 mb-4 flex items-center justify-between">
        <span className="bg-black text-white px-2 py-0.5 text-[10px] font-bold">
          SPEC_ID: HERO_V6
        </span>
        <span className="text-neutral-600 text-[10px]">W: 100% · H: AUTO</span>
      </div>
      <h2 className="font-heading font-black text-2xl sm:text-3xl uppercase tracking-tight text-black leading-tight">
        CUSTOM WEBSITES FOR CREATIVE STUDIOS WITHOUT SAAS SUBSCRIPTIONS.
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-3 border-t-2 border-dashed border-black pt-4 text-[11px]">
        <div>
          <span className="text-neutral-500 block text-[10px] font-bold">DELIVERY WINDOW:</span>
          <span className="font-black text-black">48H — 1 WEEK</span>
        </div>
        <div>
          <span className="text-neutral-500 block text-[10px] font-bold">BASE RETAINER:</span>
          <span className="font-black text-black">2,000 KR (ONE-TIME)</span>
        </div>
      </div>
    </div>
  );
}

// 07. Sequential 01-02-03 Value Ledger
export function HeroSequentialLedger() {
  const steps = [
    { num: "01", title: "Fill Questionnaire", desc: "Pick your layout, typography, services and photo lookbook in 5 minutes." },
    { num: "02", title: "Site Built In 48h", desc: "I code your site directly, connect your colors, and deploy to your custom domain." },
    { num: "03", title: "Direct Vipps Bookings", desc: "Your clients pick their slot and pay deposits directly without awkward DMs." },
  ];

  return (
    <div className="w-full bg-white border border-neutral-300 p-6 font-mono text-neutral-900">
      <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-4 font-bold">
        SIMPLE 3-STEP PROCESS
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
        {steps.map((s, i) => (
          <div key={s.num} className={i === 0 ? "pr-3" : "pt-4 md:pt-0 md:px-3"}>
            <span className="text-2xl font-black font-heading text-black block mb-1">
              {s.num}
            </span>
            <h4 className="text-xs font-bold text-black uppercase mb-1">
              {s.title}
            </h4>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 08. Product / Service Focus Halo
export function HeroProductFocus() {
  return (
    <div className="w-full bg-[#f6f7f8] border border-neutral-300 p-6 flex flex-col sm:flex-row items-center gap-6 text-neutral-900">
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 border border-neutral-300 bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
        <Image
          src="/demo/nails/nail-2.jpg"
          alt="Sculpted BIAB"
          fill
          className="object-cover p-2"
        />
        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black text-white text-[9px] font-mono font-bold">
          SIGNATURE
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 mb-1">
          <span>TREATMENT FOCUS</span>
          <span>·</span>
          <span className="text-black font-bold">750 KR</span>
        </div>
        <h3 className="font-heading font-black text-xl sm:text-2xl uppercase tracking-tight text-black leading-snug">
          Structured BIAB Gel Overlay with Diamond French
        </h3>
        <p className="text-xs font-mono text-neutral-600 mt-2 leading-relaxed">
          Reinforces natural nail plates with high-apex architecture. Lasts 4+ weeks with zero chipping.
        </p>
        <button className="mt-4 px-4 py-2 bg-black text-white text-xs font-mono font-bold hover:bg-neutral-800 transition-colors">
          BOOK THIS EXACT SET →
        </button>
      </div>
    </div>
  );
}

// 09. Asymmetric Bleed Layout
export function HeroAsymmetricBleed() {
  return (
    <div className="w-full bg-[#fdfbf7] border border-[#e5ded3] overflow-hidden flex flex-col md:flex-row text-[#2b221a]">
      <div className="p-6 md:p-8 md:w-3/5 flex flex-col justify-center">
        <span className="text-[10px] font-mono text-[#8c745f] uppercase tracking-widest">
          STUDIO DOSSIER 2026
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl text-[#1f1712] mt-2 leading-tight">
          Clean digital spaces for brands with high standards.
        </h2>
        <p className="text-xs font-mono text-[#6e5a49] mt-3 max-w-md leading-relaxed">
          High-contrast Scandinavian layouts. No generic WordPress templates or endless monthly subscriptions.
        </p>
      </div>
      <div className="md:w-2/5 relative h-48 md:h-auto min-h-[180px] bg-neutral-200">
        <Image
          src="/demo/cakes/cake-2.jpg"
          alt="Minimalist Cake Design"
          fill
          className="object-cover"
        />
      </div>
    </div>
  );
}

// 10. Direct Lead Capture Single-Input Hero
export function HeroSingleInput() {
  const [handle, setHandle] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="w-full bg-[#111113] border border-neutral-800 p-6 sm:p-8 font-mono text-white">
      <div className="inline-block px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-400 uppercase mb-3">
        Instagram Link-in-Bio Upgrader
      </div>
      <h2 className="font-heading font-black text-xl sm:text-3xl uppercase text-white leading-tight">
        Drop your @handle. I’ll draft your mobile booking layout.
      </h2>
      <p className="text-xs text-neutral-400 mt-2 mb-6">
        No sales calls. I review your page and send a prototype mockup within 24 hours.
      </p>
      {submitted ? (
        <div className="p-3 bg-emerald-500 text-black text-xs font-bold flex items-center gap-2">
          <FiCheck className="text-sm" />
          <span>Mockup queued for {handle}. Check your DMs shortly.</span>
        </div>
      ) : (
        <form 
          onSubmit={(e) => { e.preventDefault(); if (handle) setSubmitted(true); }}
          className="flex flex-col sm:flex-row gap-2 max-w-md"
        >
          <input
            type="text"
            placeholder="@yourstudio"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="flex-1 p-2.5 border border-neutral-700 text-xs text-white bg-neutral-900 focus:border-white outline-none"
            required
          />
          <button type="submit" className="px-5 py-2.5 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-200">
            Send Mockup
          </button>
        </form>
      )}
    </div>
  );
}

// 11. Quad Masonry Mini-Collage Hero
export function HeroQuadMasonry() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center text-neutral-900">
      <div>
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          PORTFOLIO ARCHIVE
        </span>
        <h2 className="font-heading font-black text-2xl sm:text-3xl text-black uppercase mt-2">
          Real client sites built for Oslo creators.
        </h2>
        <p className="text-xs font-mono text-neutral-600 mt-3 leading-relaxed">
          From nail technicians to independent cake studios. Every site is built custom, mobile-first, and lightning fast.
        </p>
        <div className="mt-5 flex gap-3 text-xs font-mono">
          <span className="px-2.5 py-1 border border-neutral-300 font-bold">NAILS</span>
          <span className="px-2.5 py-1 border border-neutral-300 font-bold">BAKERY</span>
          <span className="px-2.5 py-1 border border-neutral-300 font-bold">JEWELRY</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 h-56">
        <div className="relative border border-neutral-300 overflow-hidden">
          <Image src="/demo/nails/nail-3.jpg" alt="Work 1" fill className="object-cover hover:scale-105 transition-transform" />
        </div>
        <div className="relative border border-neutral-300 overflow-hidden">
          <Image src="/demo/cakes/cake-3.jpg" alt="Work 2" fill className="object-cover hover:scale-105 transition-transform" />
        </div>
        <div className="relative border border-neutral-300 overflow-hidden">
          <Image src="/demo/wedding/wedding-2.jpg" alt="Work 3" fill className="object-cover hover:scale-105 transition-transform" />
        </div>
        <div className="relative border border-neutral-300 overflow-hidden">
          <Image src="/demo/nails/nail-4.jpg" alt="Work 4" fill className="object-cover hover:scale-105 transition-transform" />
        </div>
      </div>
    </div>
  );
}

// 12. Monospace Studio Dossier
export function HeroStudioDossier() {
  return (
    <div className="w-full bg-[#f8f9fa] border border-neutral-300 p-5 font-mono text-xs text-neutral-900">
      <div className="border-b border-neutral-300 pb-3 flex items-center justify-between">
        <div>
          <span className="text-black font-bold">DOSSIER // AG-2026-OSL</span>
          <span className="text-neutral-500 text-[10px] block">SECURITY CLEARANCE: PUBLIC ARCHIVE</span>
        </div>
        <div className="text-right text-[10px] text-neutral-500">
          STATUS: <span className="text-emerald-600 font-bold">AVAILABLE FOR COMMISSIONS</span>
        </div>
      </div>
      <div className="py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-neutral-300">
        <div>
          <span className="text-[10px] text-neutral-500 block">BUILD SPEED</span>
          <span className="font-bold text-black">48H — 1 WEEK</span>
        </div>
        <div>
          <span className="text-[10px] text-neutral-500 block">TECH STACK</span>
          <span className="font-bold text-black">NEXT.JS 15 / VIPPS</span>
        </div>
        <div>
          <span className="text-[10px] text-neutral-500 block">STARTING RATE</span>
          <span className="font-bold text-black">2,000 KR FLAT</span>
        </div>
        <div>
          <span className="text-[10px] text-neutral-500 block">LOCATION</span>
          <span className="font-bold text-black">OSLO (NO REMOTE AGENCY)</span>
        </div>
      </div>
      <div className="pt-3 flex items-center justify-between">
        <span className="text-neutral-500 text-[11px]">Direct 1-on-1 development with A.Gure</span>
        <span className="text-black font-bold underline cursor-pointer">START QUESTIONNAIRE →</span>
      </div>
    </div>
  );
}

// 13. Minimal Studio Business Card Header
export function HeroBusinessCard() {
  return (
    <div className="w-full p-4 sm:p-8 flex justify-center bg-[#eae7e1] border border-neutral-300">
      <div className="w-full max-w-md bg-white border-2 border-black p-6 shadow-md font-mono text-xs text-black">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-heading font-black text-xl tracking-tight">
              A.GURE
            </h3>
            <span className="text-[10px] text-neutral-500 uppercase">Web Developer &amp; Designer</span>
          </div>
          <div className="w-6 h-6 border-2 border-black flex items-center justify-center font-bold text-[10px]">
            AG
          </div>
        </div>
        <div className="space-y-1 text-neutral-600 text-[11px]">
          <p>Oslo, Norway</p>
          <p className="text-black font-bold">hello@agure.space</p>
          <p>agure.space/demo</p>
        </div>
        <div className="mt-6 pt-4 border-t border-neutral-200 flex justify-between items-center text-[10px] text-neutral-500">
          <span>TIER 1 BOOKING DROP</span>
          <span className="text-black font-black uppercase">2,000 KR ONE-TIME</span>
        </div>
      </div>
    </div>
  );
}

// 14. High-Fashion Kinetic Headline
export function HeroKineticHeadline() {
  return (
    <div className="w-full bg-[#fbf9f5] border border-neutral-300 p-6 sm:p-10 text-center text-neutral-900">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-200 border border-neutral-300 text-[10px] font-mono text-black uppercase tracking-widest mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-black" />
        SPRING 2026 COMMISSIONS
      </div>
      <h1 className="text-3xl sm:text-5xl leading-tight tracking-tight">
        <span className="font-serif italic font-normal">Sculptural digital form</span><br />
        <span className="font-heading font-black uppercase tracking-tighter">Engineered for conversion.</span>
      </h1>
      <p className="text-xs font-mono text-neutral-600 max-w-md mx-auto mt-4 leading-relaxed">
        We replace awkward DMs with structured price ledgers, calendar slots, and 10-second Vipps deposits.
      </p>
      <div className="mt-6 flex justify-center gap-4">
        <button className="px-5 py-2.5 bg-black text-white font-mono text-xs font-bold uppercase hover:bg-neutral-800">
          Explore Demos
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// 10 BRAND-NEW CREATIVE HERO STYLES (DIVERSE AESTHETICS & LIBRARIES)
// =========================================================================

// 15. Warm Terracotta Pottery Hero (Ceramics, Boho Aesthetic Studio)
export function HeroTerracottaPottery() {
  return (
    <div className="w-full bg-[#fcf9f5] border border-[#e5d8cc] p-6 sm:p-10 text-[#2b211c]">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f2e4d8] text-[#c25e3e] text-xs font-mono font-medium mb-3">
            <span>●</span>
            <span>POTTERY WORKSHOPS &amp; OBJECTS</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#2b211c] leading-tight">
            Hand-thrown stoneware born from Oslo clay.
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#735e52] mt-4 leading-relaxed max-w-md">
            Small-batch table ceramics, architectural vases, and intimate 4-seat wheel workshops. Reserve your weekend session online.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button className="px-6 py-3 rounded-full bg-[#c25e3e] text-white font-medium text-xs hover:bg-[#a84c2f] transition-all shadow-md">
              Book Wheel Workshop (850 kr)
            </button>
            <span className="text-xs font-mono text-[#8c7466]">Only 2 spots left this Saturday</span>
          </div>
        </div>
        <div className="w-full md:w-56 h-72 relative rounded-t-full overflow-hidden border-2 border-[#d9c4b2] shadow-lg flex-shrink-0">
          <Image src="/demo/cakes/cake-4.jpg" alt="Vase" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2b211c]/60 via-transparent to-transparent flex items-end p-4">
            <span className="text-white text-xs font-serif italic">The Terracotta Amphora</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 16. Vintage French Patisserie Hero (Custom Cakes & Celebration Bakeries)
export function HeroVintagePatisserie() {
  return (
    <div className="w-full bg-[#fdf5f7] border border-[#f5d8e1] p-6 sm:p-10 text-[#541624] relative overflow-hidden">
      <div className="text-center max-w-xl mx-auto">
        <span className="text-[11px] font-serif tracking-[0.2em] text-[#a84d63] uppercase block mb-2">
          — PÂTISSERIE &amp; GÂTEAUX DE MARIAGE —
        </span>
        <h1 className="font-serif italic text-3xl sm:text-5xl text-[#541624] leading-tight">
          Vintage Lambeth piping with organic berry curd.
        </h1>
        <p className="text-xs sm:text-sm font-sans text-[#783648] mt-3 max-w-md mx-auto leading-relaxed">
          Artisanal celebration cakes handcrafted in Grünerløkka. Custom tier architecture, edible garden florals, and heirloom piping.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="px-5 py-2.5 bg-[#8b263e] text-white text-xs font-serif tracking-wider rounded hover:bg-[#731f33] shadow-md">
            Reserve Celebration Date
          </button>
          <button className="px-5 py-2.5 border border-[#c97b8f] text-[#541624] text-xs font-serif rounded hover:bg-[#fcecef]">
            Tasting Box Menu
          </button>
        </div>
      </div>
    </div>
  );
}

// 17. Japanese Zen Matcha Hero (Wellness, Japanese Nail Spa & Head Spa)
export function HeroZenMatchaNails() {
  return (
    <div className="w-full bg-[#f4f7f2] border border-[#d6e0d2] p-6 sm:p-10 text-[#1e2e21]">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-[#cbd8c6]">
        <div>
          <span className="text-xs font-mono text-[#4b664f] uppercase tracking-widest font-semibold block mb-1">
            自然 / NATURAL NAIL ATELIER
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl text-[#1e2e21] leading-tight">
            Minimal Japanese gel artistry &amp; restorative cuticle care.
          </h2>
        </div>
        <div className="px-3 py-1.5 bg-[#dbe8d7] text-[#283e2c] font-mono text-xs rounded font-bold">
          HEMA-FREE CERTIFIED
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative h-44 rounded-lg overflow-hidden border border-[#cbd8c6]">
          <Image src="/demo/nails/nail-5.jpg" alt="Zen" fill className="object-cover" />
        </div>
        <div className="p-4 bg-white/70 rounded-lg border border-[#cbd8c6] flex flex-col justify-between font-mono text-xs">
          <div>
            <span className="text-[#59785e] font-bold block mb-1">OUR PHILOSOPHY</span>
            <p className="text-[#334636] leading-relaxed text-[11px]">
              No aggressive drills. We gently nurture natural nail beds using nutrient-rich organic botanical serums.
            </p>
          </div>
          <span className="font-bold text-[#1e2e21] mt-3">From 650 kr</span>
        </div>
        <div className="p-4 bg-[#233526] text-white rounded-lg flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono text-[#a5c7ab] block mb-1">NEXT AVAILABLE SESSION</span>
            <span className="text-xl font-bold font-serif">Thursday 27 March</span>
            <p className="text-xs text-white/70 mt-1">13:30 · Studio Chair 2</p>
          </div>
          <button className="w-full py-2 bg-[#dbe8d7] text-[#1e2e21] font-mono font-bold text-xs rounded hover:bg-white mt-4">
            CONFIRM SLOT
          </button>
        </div>
      </div>
    </div>
  );
}

// 18. Cyberpunk Neon Tech Hero (Streetwear, Custom Chrome Grillz)
export function HeroCyberStreetwear() {
  return (
    <div className="w-full bg-[#0a0a0c] border-2 border-[#bef264] p-6 sm:p-10 text-white font-mono shadow-[0_0_30px_rgba(190,242,100,0.1)]">
      <div className="flex justify-between items-center pb-4 border-b border-zinc-800 text-xs">
        <span className="text-[#bef264] font-black uppercase tracking-wider">CHROME DENTISTRY // LAB_099</span>
        <span className="text-zinc-500">59.9139° N, 10.7522° E</span>
      </div>
      <div className="mt-6 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-5xl font-black uppercase text-white leading-none tracking-tight">
            CUSTOM <span className="text-[#bef264] underline">CHROME</span> &amp; OPAL GRILLZ.
          </h1>
          <p className="text-xs text-zinc-400 mt-4 max-w-md leading-relaxed">
            Medical-grade surgical chrome-cobalt &amp; solid 18k white gold caps. 3D optical scan of your teeth in our Oslo studio. Guaranteed zero slip fit.
          </p>
          <div className="mt-6 flex gap-3">
            <button className="px-5 py-3 bg-[#bef264] text-black font-black text-xs uppercase hover:bg-[#d9f99d] transition-all">
              BOOK 3D IMPRESSION (500 KR)
            </button>
            <button className="px-4 py-3 border border-zinc-700 text-white text-xs hover:border-[#bef264]">
              PRICE GUIDE
            </button>
          </div>
        </div>
        <div className="w-48 h-48 relative border-2 border-[#bef264] bg-zinc-950 flex-shrink-0 overflow-hidden shadow-[0_0_15px_rgba(190,242,100,0.2)]">
          <Image src="/showcase/grillz/work-1.png" alt="Grillz" fill className="object-cover" />
        </div>
      </div>
    </div>
  );
}

// 19. Neo-Brutalist Pop Y2K Hero (Trend Studios, Tooth Gems, Indie Nail Artists)
export function HeroNeoBrutalistY2K() {
  return (
    <div className="w-full bg-[#fef08a] border-4 border-black p-6 sm:p-10 text-black shadow-[6px_6px_0px_#000]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <span className="px-3 py-1 bg-[#a855f7] text-white border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_#000]">
          ✦ OSLO&apos;S COOLEST NAIL &amp; GEM BAR
        </span>
        <span className="font-mono text-xs font-bold">★ 4.9 RATING (240+ CLIENTS)</span>
      </div>
      <h1 className="font-heading font-black text-3xl sm:text-5xl uppercase tracking-tighter leading-none">
        HOT NAILS.<br />
        <span className="bg-[#ec4899] text-white px-2 py-0.5 border-2 border-black inline-block mt-1 shadow-[3px_3px_0px_#000]">
          ZERO AWKWARD DMs.
        </span>
      </h1>
      <p className="font-mono text-xs sm:text-sm font-semibold mt-4 max-w-lg leading-relaxed">
        Pick your set, pick your crystal charms, and lock your studio chair in 10 seconds via Vipps. 
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="px-6 py-3 bg-[#06b6d4] text-black border-3 border-black font-black text-xs uppercase shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
          BOOK YOUR SET NOW ✨
        </button>
        <button className="px-5 py-3 bg-white text-black border-3 border-black font-bold text-xs uppercase shadow-[3px_3px_0px_#000]">
          VIEW PHOTO MENU
        </button>
      </div>
    </div>
  );
}

// 20. Aceternity Inspired Lamp Glow Hero (Futuristic Luxury Dark Theme)
export function HeroAceternityLampGlow() {
  return (
    <div className="w-full bg-[#050508] border border-cyan-500/20 p-8 sm:p-12 text-center text-white relative overflow-hidden">
      {/* Lamp Beam Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-44 bg-gradient-to-b from-cyan-500/30 via-cyan-500/5 to-transparent blur-2xl pointer-events-none" />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] mb-4 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <FiZap className="animate-pulse" />
          <span>NEXT-GEN BOOKING ARCHITECTURE</span>
        </div>
        <h1 className="text-3xl sm:text-6xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-neutral-500 leading-tight">
          Websites that convert<br />at first glance.
        </h1>
        <p className="text-xs sm:text-sm font-mono text-neutral-400 mt-4 max-w-md mx-auto leading-relaxed">
          Crafted with razor-sharp micro-interactions, smooth touch response, and instant Vipps checkout.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs uppercase shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:opacity-90">
            LAUNCH YOUR BUILD
          </button>
        </div>
      </div>
    </div>
  );
}

// 21. Fine Jewelry Noir & Gold Hero (Luxury Atelier, High End Gems)
export function HeroFineJewelryNoir() {
  return (
    <div className="w-full bg-[#0a0a0d] border border-[#4d3d25] p-6 sm:p-10 text-[#d4af37]">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#998154] block mb-2">
            M A I S O N   V A L O I R   ·   O S L O
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#f3e5c8] leading-tight font-light">
            Rare natural emeralds set in recycled 18k yellow gold.
          </h1>
          <p className="font-sans text-xs text-[#a89574] mt-4 leading-relaxed max-w-md">
            Every piece is certified conflict-free and sculpted individually in our Kvadraturen atelier. Custom commissions open for Autumn 2026.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <button className="px-5 py-2.5 bg-[#d4af37] text-black font-serif text-xs uppercase tracking-widest font-semibold hover:bg-[#e4c45e] transition-colors">
              Schedule Private Viewing
            </button>
            <span className="text-xs font-mono text-[#8a754c]">By appointment only</span>
          </div>
        </div>
        <div className="w-48 h-64 relative border border-[#6b5533] overflow-hidden flex-shrink-0 shadow-2xl">
          <Image src="/showcase/grillz/work-4.png" alt="Jewelry" fill className="object-cover" />
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 text-[9px] font-mono text-[#d4af37] border border-[#6b5533]">
            PIECE № 019
          </div>
        </div>
      </div>
    </div>
  );
}

// 22. Wedding Documentary Emotional Hero (Bridal & Fine Art Photography)
export function HeroWeddingDocumentary() {
  return (
    <div className="w-full bg-[#f8f6f0] border border-[#ded8cb] p-6 sm:p-10 text-[#29221b]">
      <div className="text-center max-w-2xl mx-auto">
        <span className="font-mono text-xs uppercase tracking-widest text-[#7a6b5c] block mb-2">
          OSLO &amp; DESTINATION WEDDING PHOTOGRAPHY
        </span>
        <h1 className="font-serif italic text-3xl sm:text-5xl text-[#1f1710] leading-tight">
          Unscripted romance, captured with honest light and 35mm film.
        </h1>
        <p className="text-xs sm:text-sm text-[#57493d] mt-4 max-w-lg mx-auto leading-relaxed">
          No awkward stiff poses. We blend into your celebration to document real tears, messy dancing, and timeless quiet moments.
        </p>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="relative h-32 rounded border border-[#ded8cb] overflow-hidden">
            <Image src="/demo/wedding/wedding-1.jpg" alt="1" fill className="object-cover" />
          </div>
          <div className="relative h-32 rounded border border-[#ded8cb] overflow-hidden">
            <Image src="/demo/wedding/wedding-3.jpg" alt="2" fill className="object-cover" />
          </div>
          <div className="relative h-32 rounded border border-[#ded8cb] overflow-hidden">
            <Image src="/demo/wedding/wedding-4.jpg" alt="3" fill className="object-cover" />
          </div>
          <div className="relative h-32 rounded border border-[#ded8cb] overflow-hidden">
            <Image src="/demo/wedding/wedding-5.jpg" alt="4" fill className="object-cover" />
          </div>
        </div>
        <button className="mt-6 px-6 py-3 bg-[#33271e] text-[#f8f6f0] font-serif text-xs rounded hover:bg-[#1a120b] transition-colors">
          Download 2026 Wedding Investment Guide
        </button>
      </div>
    </div>
  );
}

// 23. Barber & Tattoo Industrial Hero (Barbershops, Tattoos, Raw Studios)
export function HeroBarberIndustrial() {
  return (
    <div className="w-full bg-[#18181b] border-2 border-zinc-700 p-6 sm:p-10 text-white font-mono">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#ea580c] animate-pulse" />
          <span className="text-xs font-black uppercase text-[#ea580c]">TORSHOV BARBER CLUB</span>
        </div>
        <span className="text-xs text-zinc-400">WALK-INS WELCOME TODAY</span>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="font-black text-3xl sm:text-5xl uppercase tracking-tighter text-white leading-none">
            PRECISION FADES.<br />
            HOT TOWEL SHAVES.
          </h1>
          <p className="text-xs text-zinc-400 mt-3 max-w-sm">
            Traditional Turkish hot towel shaves, sharp line-ups, and beard sculpting. Cold beer on tap.
          </p>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-700 text-center w-full sm:w-auto">
          <span className="text-[10px] text-zinc-500 uppercase block mb-1">NEXT AVAILABLE CHAIR</span>
          <span className="text-2xl font-black text-white block">14:15 TODAY</span>
          <button className="mt-3 px-6 py-2.5 bg-[#ea580c] text-white font-bold text-xs uppercase hover:bg-[#c2410c] transition-colors w-full">
            GRAB CHAIR →
          </button>
        </div>
      </div>
    </div>
  );
}

// 24. Artisan Floral & Botanical Hero (Florists, Plant Shops, Organic Apothecary)
export function HeroArtisanFloralBoutique() {
  return (
    <div className="w-full bg-[#f6f3ec] border border-[#d8d0c0] p-6 sm:p-10 text-[#302920]">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-40 h-48 relative border-2 border-[#b5a794] rounded-sm overflow-hidden flex-shrink-0 shadow-sm">
          <Image src="/demo/cakes/cake-3.jpg" alt="Botanical Cake" fill className="object-cover" />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#7a6b57] block mb-1">
            BOTANICAL STUDIO · THORVALD MEYERS GATE
          </span>
          <h2 className="font-serif italic text-2xl sm:text-4xl text-[#241e17] leading-tight">
            Hand-tied field bouquets &amp; wild Scandinavian florals.
          </h2>
          <p className="text-xs font-sans text-[#5c5040] mt-3 leading-relaxed">
            Sourced weekly from organic growers in Viken. We craft Friday doorstep deliveries and custom event installations.
          </p>
          <div className="mt-5 flex gap-3">
            <button className="px-4 py-2 bg-[#4a3e30] text-white text-xs font-serif rounded-sm hover:bg-[#332b21]">
              Order Friday Flora (450 kr)
            </button>
            <button className="px-4 py-2 border border-[#9c8d78] text-[#302920] text-xs font-serif rounded-sm">
              Event Inquiry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 25. Neo-Mint Wellness & Breathwork Hero (2026 Collective Exhale Aesthetic)
export function HeroNeoMintWellness() {
  return (
    <div className="w-full bg-[#f0fdf4] border border-[#bbf7d0] p-6 sm:p-10 text-[#0f172a] rounded-2xl">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dcfce7] border border-[#86efac] text-[#15803d] font-mono text-[11px] font-bold mb-4">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span>SPRING APPOINTMENTS LIVE · OSLO SENTRUM</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-[#14532d] leading-[1.15]">
          The collective exhale. <br />
          <span className="font-serif italic font-normal text-[#16a34a]">Lymphatic drainage</span> &amp; sound baths.
        </h1>
        <p className="text-xs sm:text-sm text-[#374151] mt-4 leading-relaxed max-w-lg">
          Zero rush. Sixty minutes of restorative vagus-nerve therapy and organic botanical oils in our soundproof sanctuary.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className="px-5 py-2.5 rounded-full bg-[#15803d] text-white font-medium text-xs hover:bg-[#166534] transition-all shadow-sm">
            Reserve Studio Session · 950 kr
          </button>
          <span className="text-[11px] font-mono text-[#15803d] font-semibold">
            Only 3 slots open for this Saturday
          </span>
        </div>
      </div>
    </div>
  );
}

// 26. Dark Botanical Velvet Apothecary Hero (Herbalists, Botanical Tattoo, Natural Perfume)
export function HeroDarkBotanicalApothecary() {
  return (
    <div className="w-full bg-[#07130e] border border-[#1d3b30] p-6 sm:p-10 text-[#e4efea]">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-8">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#c4975a] uppercase mb-2">
            <span>VOL. IV // ORGANIC ALCHEMY</span>
            <span>·</span>
            <span>OSLO BOTANICAL</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-white leading-tight">
            Small-batch forest tinctures &amp; handcrafted floral inks.
          </h2>
          <p className="text-xs text-neutral-400 mt-3 leading-relaxed max-w-md">
            Distilled from wild juniper and pine needle extracts harvested in Nordmarka. Each bottle is numbered by hand.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <button className="px-4 py-2 border border-[#c4975a] bg-[#c4975a]/10 text-[#c4975a] text-xs font-mono uppercase tracking-wider hover:bg-[#c4975a] hover:text-black transition-colors">
              Request Custom Blend →
            </button>
            <span className="text-[11px] font-mono text-neutral-400">Batch 14 · 18 of 50 Left</span>
          </div>
        </div>
        <div className="md:col-span-4 bg-[#0e231b] border border-[#1d3b30] p-4 text-center">
          <div className="w-12 h-12 rounded-full border border-[#c4975a] mx-auto flex items-center justify-center text-[#c4975a] font-serif text-lg mb-2">
            🌿
          </div>
          <span className="font-serif italic text-white text-sm block">Nordmarka Harvest</span>
          <span className="text-[10px] font-mono text-[#c4975a] block mt-1">OCTOBER EXTRACT · 450 KR</span>
        </div>
      </div>
    </div>
  );
}

// 27. Japanese Aizome Indigo Hero (Craftsman Pottery, Raw Denim, Traditional Woodcraft)
export function HeroJapaneseIndigoArtisan() {
  return (
    <div className="w-full bg-[#0d1527] border border-[#2a3b5e] p-6 sm:p-10 text-[#f8f6f0]">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-[#2a3b5e]/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-5 h-5 rounded-full bg-[#ef4444] text-white flex items-center justify-center text-[10px] font-bold">
              印
            </span>
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
              STUDIO AIZOME · INDIGO OBJECTS
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-light text-white tracking-tight">
            Hand-dipped indigo canvas &amp; woodfired ceramics.
          </h2>
        </div>
        <div className="text-right font-mono text-xs hidden sm:block">
          <span className="text-[#ef4444] font-bold block">1-OF-1 ARTISAN PIECES</span>
          <span className="text-neutral-400 text-[10px]">WORKSHOP VISITS BY APPOINTMENT</span>
        </div>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <p className="text-xs text-neutral-300 font-mono leading-relaxed max-w-md">
          Natural fermentation vats maintained with Japanese sukumo. No chemical fixatives.
        </p>
        <button className="px-5 py-2.5 bg-[#f8f6f0] text-[#0d1527] font-mono font-bold text-xs uppercase hover:bg-white transition-colors flex items-center gap-2">
          <span>SCHEDULE STUDIO VISIT</span>
          <FiArrowRight />
        </button>
      </div>
    </div>
  );
}

