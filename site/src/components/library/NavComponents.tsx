"use client";

import React, { useState } from "react";
import { 
  FiArrowUpRight, 
  FiMenu, 
  FiX, 
  FiShoppingBag, 
  FiCalendar, 
  FiGrid, 
  FiLayers, 
  FiClock,
  FiZap,
  FiCompass,
  FiHeart,
  FiMapPin
} from "react-icons/fi";

// 01. Classic Editorial Split
export function NavEditorialSplit() {
  return (
    <nav className="w-full py-4 px-6 bg-stone-100 border border-stone-300 flex items-center justify-between text-stone-900">
      <div className="flex items-center gap-3">
        <span className="font-serif font-bold text-sm tracking-tight">ATELIER NORD</span>
        <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest hidden sm:inline">OSLO · EST. 2024</span>
      </div>
      <div className="flex items-center gap-6 text-xs font-mono text-stone-600">
        <span className="hover:text-stone-950 cursor-pointer transition-colors">SETS</span>
        <span className="hover:text-stone-950 cursor-pointer transition-colors">LOOKBOOK</span>
        <span className="hover:text-stone-950 cursor-pointer transition-colors">STUDIO</span>
        <span className="text-stone-950 font-semibold flex items-center gap-1 cursor-pointer">
          BOOK <FiArrowUpRight className="text-xs" />
        </span>
      </div>
    </nav>
  );
}

// 02. Brutalist Boxed Grid
export function NavBrutalistGrid() {
  return (
    <nav className="w-full grid grid-cols-2 sm:grid-cols-4 border-2 border-black divide-x-2 divide-black bg-white text-xs font-mono">
      <div className="p-3 font-black tracking-tighter uppercase text-black bg-yellow-300">
        STUDIO KLØ
      </div>
      <div className="p-3 text-black flex items-center gap-2 bg-white">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] font-bold">MARCH 2026 OPEN</span>
      </div>
      <div className="p-3 text-black hover:bg-neutral-100 cursor-pointer hidden sm:flex items-center justify-center font-bold">
        [ RATES & SPECS ]
      </div>
      <div className="p-3 bg-black text-white font-black text-center uppercase cursor-pointer hover:bg-neutral-800">
        RESERVE CHAIR →
      </div>
    </nav>
  );
}

// 03. Center Floating Pill
export function NavFloatingPill() {
  const [active, setActive] = useState("Works");
  return (
    <div className="w-full py-2 flex items-center justify-center bg-stone-50">
      <nav className="inline-flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md border border-neutral-200 shadow-md rounded-full">
        {["Works", "Treatments", "About", "Reserve"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              active === tab 
                ? "bg-black text-white shadow-sm" 
                : "text-neutral-500 hover:text-black"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}

// 04. Monospace Terminal HUD
export function NavTerminalHud() {
  return (
    <nav className="w-full p-3 bg-zinc-950 border-b border-emerald-500/40 font-mono text-[11px] text-emerald-400 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 border border-emerald-500/30">TERMINAL // V2.4</span>
        <span className="hidden sm:inline text-emerald-600">59°54&apos;N 10°45&apos;E</span>
      </div>
      <div className="flex items-center gap-4 text-emerald-300">
        <span className="underline decoration-emerald-500">ROOT: [MENU]</span>
        <span className="hover:text-emerald-100 cursor-pointer">SCHEDULE</span>
        <span className="hover:text-emerald-100 cursor-pointer">VIPPS_SYNC</span>
      </div>
      <div className="flex items-center gap-1 font-bold text-emerald-200">
        <FiClock className="text-xs" />
        <span>19:30 CET</span>
      </div>
    </nav>
  );
}

// 05. Magazine Stacked Header Nav
export function NavMagazineStack() {
  return (
    <header className="w-full bg-[#fdfbf7] border border-amber-900/15 py-4 px-6 text-center text-amber-950">
      <div className="font-serif text-lg font-light tracking-[0.25em] uppercase">
        NOIRE &amp; OCHRE
      </div>
      <div className="text-[10px] font-mono tracking-widest text-amber-800/70 mt-0.5 uppercase">
        Atelier &amp; Floral Design · Oslo Studio
      </div>
      <div className="w-full h-px bg-amber-900/10 my-2.5" />
      <div className="flex items-center justify-center gap-6 text-xs font-serif tracking-wider text-amber-900/80">
        <span className="hover:text-amber-950 cursor-pointer">FLORAL SETS</span>
        <span>·</span>
        <span className="hover:text-amber-950 cursor-pointer">CUSTOM CAKES</span>
        <span>·</span>
        <span className="hover:text-amber-950 cursor-pointer font-bold text-amber-950 underline underline-offset-4">INQUIRE</span>
      </div>
    </header>
  );
}

// 06. Minimalist Underline Rule
export function NavUnderlineRule() {
  const [hovered, setHovered] = useState<string | null>("Lookbook");
  const links = ["Lookbook", "Services", "Pricing", "Book Chair"];

  return (
    <nav className="w-full py-4 px-6 bg-white border-b border-neutral-200 flex items-center justify-between text-neutral-900">
      <span className="font-black text-sm tracking-tight font-heading">K L Ø</span>
      <div className="flex items-center gap-6 text-xs font-mono">
        {links.map((link) => (
          <div
            key={link}
            onMouseEnter={() => setHovered(link)}
            className="relative cursor-pointer py-1"
          >
            <span className={hovered === link ? "text-neutral-900 font-bold" : "text-neutral-400"}>
              {link}
            </span>
            {hovered === link && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-neutral-900" />
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

// 07. Quadrant Corner Anchors
export function NavCornerAnchors() {
  return (
    <div className="w-full h-24 p-4 border border-neutral-300 bg-neutral-50 relative text-xs font-mono text-neutral-800">
      <span className="absolute top-3 left-4 font-bold">01/ BRAND</span>
      <span className="absolute top-3 right-4 hover:underline cursor-pointer font-bold">
        RESERVE →
      </span>
      <span className="absolute bottom-3 left-4 text-neutral-500 text-[10px]">
        OSLO, NO · LAT 59.91
      </span>
      <span className="absolute bottom-3 right-4 text-neutral-500 text-[10px]">
        MENU [INDEX]
      </span>
      <div className="h-full flex items-center justify-center text-[11px] text-neutral-400 tracking-widest uppercase font-mono">
        Quadrant Corner Anchor System
      </div>
    </div>
  );
}

// 08. Mobile App Bottom Dock
export function NavBottomDock() {
  const [active, setActive] = useState("treatments");

  return (
    <div className="w-full p-2 flex justify-center bg-neutral-100 border border-neutral-200">
      <div className="w-full max-w-sm bg-white border border-neutral-200 p-2 flex items-center justify-around shadow-sm rounded-xl">
        <button 
          onClick={() => setActive("lookbook")}
          className={`flex flex-col items-center gap-1 text-[10px] font-mono ${
            active === "lookbook" ? "text-black font-bold" : "text-neutral-400"
          }`}
        >
          <FiGrid className="text-sm" />
          <span>Lookbook</span>
        </button>
        <button 
          onClick={() => setActive("treatments")}
          className={`flex flex-col items-center gap-1 text-[10px] font-mono ${
            active === "treatments" ? "text-black font-bold" : "text-neutral-400"
          }`}
        >
          <FiLayers className="text-sm" />
          <span>Rates</span>
        </button>
        <button 
          onClick={() => setActive("book")}
          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-[11px] font-mono font-bold uppercase rounded-lg"
        >
          <FiCalendar className="text-xs" />
          <span>Book</span>
        </button>
      </div>
    </div>
  );
}

// 09. Continuous Marquee Ticker Nav
export function NavMarqueeTicker() {
  return (
    <div className="w-full border border-neutral-900 bg-white overflow-hidden">
      <div className="bg-black text-white py-1 px-4 text-[10px] font-mono uppercase tracking-widest whitespace-nowrap overflow-hidden flex">
        <span className="animate-marquee inline-block">
          STUDIO KLØ · MARCH SLOTS OPEN · BOOK VIA VIPPS IN 10S · NO HIDDEN FEES · OSLO CENTRAL · 
        </span>
      </div>
      <div className="p-3 px-6 flex items-center justify-between text-xs font-mono text-black">
        <span className="font-bold">KLØ NAILS</span>
        <div className="flex gap-4 text-neutral-600">
          <span className="hover:text-black cursor-pointer">MENU</span>
          <span className="hover:text-black cursor-pointer">BEFORE/AFTER</span>
          <span className="text-black font-bold cursor-pointer underline">VIPPS BOOK</span>
        </div>
      </div>
    </div>
  );
}

// 10. Atelier Compact Cart & Book
export function NavAtelierCart() {
  return (
    <nav className="w-full py-3.5 px-6 bg-zinc-900 text-white border border-zinc-800 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 bg-amber-400 rotate-45" />
        <span className="font-serif text-sm tracking-widest uppercase text-amber-200">Atelier V</span>
      </div>
      <div className="flex items-center gap-4 text-xs font-mono">
        <span className="text-zinc-400 hidden sm:inline">1 SELECTION (BIAB GEL)</span>
        <button className="flex items-center gap-2 px-3 py-1 border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 transition-all">
          <FiShoppingBag className="text-xs" />
          <span>750 KR</span>
          <span className="text-[10px] text-zinc-400">· CHECKOUT</span>
        </button>
      </div>
    </nav>
  );
}

// 11. Minimal Dot & Drawer Trigger
export function NavDotDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full bg-white border border-neutral-200 relative text-black">
      <nav className="p-4 px-6 flex items-center justify-between">
        <span className="font-heading font-black tracking-tighter text-sm">GURE.STUDIO</span>
        <button 
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1 border border-neutral-300 text-xs font-mono hover:bg-neutral-50 transition-colors"
        >
          {open ? <FiX className="text-xs" /> : <FiMenu className="text-xs" />}
          <span>{open ? "CLOSE" : "MENU"}</span>
        </button>
      </nav>
      {open && (
        <div className="p-6 border-t border-neutral-200 bg-neutral-50 grid grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <div className="text-[10px] text-neutral-500 mb-2 uppercase font-bold">Direct Links</div>
            <div className="flex flex-col gap-2">
              <span className="font-bold hover:underline cursor-pointer">01. Lookbook Archive</span>
              <span className="font-bold hover:underline cursor-pointer">02. Price Calculator</span>
              <span className="font-bold hover:underline cursor-pointer">03. Client Questionnaire</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 mb-2 uppercase font-bold">Contact &amp; Location</div>
            <div className="text-neutral-600 text-[11px] leading-relaxed">
              Oslo, Norway<br />
              hello@agure.space<br />
              +47 900 00 000
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 12. Split Dual-Tone (50/50 Yin-Yang)
export function NavSplitDualTone() {
  return (
    <nav className="w-full flex border border-neutral-300 text-xs font-mono overflow-hidden">
      <div className="w-1/2 p-3.5 px-5 bg-white text-black flex items-center justify-between border-r border-neutral-300">
        <span className="font-bold">A.GURE / ARCHIVE</span>
        <span className="text-[10px] text-neutral-400 hidden sm:inline">PAGE 01</span>
      </div>
      <div className="w-1/2 p-3.5 px-5 bg-neutral-900 text-white flex items-center justify-between">
        <div className="flex gap-4">
          <span className="hover:opacity-80 cursor-pointer">WORKS</span>
          <span className="hover:opacity-80 cursor-pointer hidden sm:inline">RATES</span>
        </div>
        <span className="font-bold hover:underline cursor-pointer">BOOK DROP →</span>
      </div>
    </nav>
  );
}

// 13. Index Ledger Numbers Nav
export function NavIndexNumbers() {
  return (
    <nav className="w-full py-4 px-6 bg-neutral-100 border border-neutral-300 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-neutral-900">
      <div className="font-bold tracking-tight">[ STUDIO PROTOCOL ]</div>
      <div className="flex items-center gap-6 text-neutral-600">
        <span className="hover:text-black cursor-pointer"><strong className="text-black">01</strong> / SETS</span>
        <span className="hover:text-black cursor-pointer"><strong className="text-black">02</strong> / TIME</span>
        <span className="hover:text-black cursor-pointer"><strong className="text-black">03</strong> / VIPPS</span>
        <span className="hover:text-black cursor-pointer text-black font-bold"><strong className="underline">04</strong> / CONFIRM</span>
      </div>
    </nav>
  );
}

// 14. Industrial Folder Tab Bar
export function NavFolderTabs() {
  const [tab, setTab] = useState("OVERVIEW");
  const tabs = ["OVERVIEW", "SPECIMENS", "BOOKING_MANIFEST"];

  return (
    <div className="w-full bg-neutral-200 border-b-2 border-neutral-400 pt-2 px-4 flex items-end gap-1 font-mono text-xs">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`px-4 py-2 border-t-2 border-x-2 border-neutral-400 transition-all ${
            tab === t
              ? "bg-white text-black font-bold -mb-[2px] z-10"
              : "bg-neutral-300 text-neutral-600 hover:text-black"
          }`}
        >
          {t}
        </button>
      ))}
      <div className="ml-auto pb-2 text-[10px] text-neutral-600 hidden sm:block">
        DOC-ID: #882-OSLO
      </div>
    </div>
  );
}

// =========================================================================
// 10 BRAND-NEW CREATIVE NAV STYLES (DIVERSE AESTHETICS & LIBRARIES)
// =========================================================================

// 15. Warm Terracotta Earthy Nav (Ceramics, Boho Salon, Natural Studio)
export function NavTerracottaEarthy() {
  return (
    <nav className="w-full py-4 px-6 bg-[#fbf7f2] border-b border-[#e3d7cb] text-[#2c221e] flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-3 h-3 rounded-full bg-[#c25e3e]" />
        <span className="font-serif italic text-base tracking-wide text-[#2c221e]">Tierra Studio</span>
        <span className="text-[10px] font-mono text-[#8a7266] uppercase tracking-wider hidden sm:inline">Pottery &amp; Objects</span>
      </div>
      <div className="flex items-center gap-5 text-xs font-mono">
        <span className="text-[#6d554a] hover:text-[#c25e3e] cursor-pointer">Collections</span>
        <span className="text-[#6d554a] hover:text-[#c25e3e] cursor-pointer">Workshops</span>
        <button className="px-3 py-1.5 rounded-full bg-[#c25e3e] text-white font-medium hover:bg-[#a64e32] transition-colors shadow-sm">
          Book Wheel
        </button>
      </div>
    </nav>
  );
}

// 16. Pastel French Patisserie Nav (Custom Cakes & Sweet Studios)
export function NavPastelPatisserie() {
  return (
    <nav className="w-full py-4 px-6 bg-[#fdf5f7] border-b border-[#f2d8df] text-[#581c2b] flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-serif text-lg tracking-wider font-normal">Maison Choux</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f8e0e6] text-[#78283c] font-mono">Parisian Tartes</span>
      </div>
      <div className="flex items-center gap-6 text-xs font-serif italic">
        <span className="hover:text-[#882d44] cursor-pointer">Flavor Menu</span>
        <span className="hover:text-[#882d44] cursor-pointer">Wedding Tastings</span>
        <button className="px-4 py-1.5 rounded-md border border-[#c4788c] text-[#581c2b] hover:bg-[#fae6ec] transition-colors font-sans text-xs font-semibold">
          Order Weekend Box
        </button>
      </div>
    </nav>
  );
}

// 17. Japanese Wabi-Sabi Matcha Nav (Clean Spa, Japanese Nails & Wellness)
export function NavWabiSabiMatcha() {
  return (
    <nav className="w-full py-4 px-6 bg-[#f4f6f2] border-b border-[#d8e0d5] text-[#223324] flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#dbe5d7] text-[#2d4230] rounded">茶 / SAGE</span>
        <span className="font-serif tracking-widest text-sm uppercase">Komorebi Rituals</span>
      </div>
      <div className="flex items-center gap-6 text-xs font-mono text-[#4b604e]">
        <span className="hover:text-[#182619] cursor-pointer">HEAD SPA</span>
        <span className="hover:text-[#182619] cursor-pointer">MINERAL NAILS</span>
        <button className="px-3 py-1 bg-[#2d4230] text-[#f4f6f2] text-xs hover:bg-[#1f2f21] transition-colors">
          RESERVE SESSION
        </button>
      </div>
    </nav>
  );
}

// 18. Cyberpunk Neon Tech Nav (Custom Grillz, Streetwear, Tattoo)
export function NavCyberpunkNeon() {
  return (
    <nav className="w-full py-3.5 px-6 bg-[#09090b] border-b-2 border-[#bef264] text-[#bef264] font-mono flex items-center justify-between shadow-[0_0_20px_rgba(190,242,100,0.15)]">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-[#bef264] shadow-[0_0_8px_#bef264]" />
        <span className="font-black text-sm tracking-wider uppercase text-white">CHROME.LAB // 099</span>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-zinc-400 hover:text-[#bef264] cursor-pointer">CASTINGS</span>
        <span className="text-zinc-400 hover:text-[#bef264] cursor-pointer">OPAL_MODS</span>
        <button className="px-3 py-1 bg-[#bef264] text-black font-bold uppercase hover:bg-[#d9f99d] transition-colors">
          REQUEST MOLD →
        </button>
      </div>
    </nav>
  );
}

// 19. Neo-Brutalist Pop Y2K Nav (Indie Creatives, Trend Studios)
export function NavNeoBrutalistPop() {
  return (
    <nav className="w-full py-3 px-5 bg-[#e0e7ff] border-3 border-black text-black flex items-center justify-between shadow-[4px_4px_0px_#000]">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-[#fde047] border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_#000]">
          ✦ GLOSS CLUB
        </span>
        <span className="text-xs font-mono font-bold hidden sm:inline">OSLO HOTLINE</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold hover:underline cursor-pointer hidden sm:inline">PRICE LIST</span>
        <button className="px-4 py-1.5 bg-[#ec4899] text-white border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
          BOOK SET ✨
        </button>
      </div>
    </nav>
  );
}

// 20. Magic UI Inspired Floating Dock Nav (Smooth Frosted Glass)
export function NavMagicFloatingDock() {
  return (
    <div className="w-full py-3 flex justify-center bg-gradient-to-b from-neutral-900 to-black p-4">
      <nav className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-white/10 shadow-2xl text-white font-mono text-xs">
        <div className="flex items-center gap-2 pr-3 border-r border-white/10 font-bold tracking-tight">
          <FiZap className="text-cyan-400 animate-pulse" />
          <span>AURA STUDIO</span>
        </div>
        <div className="flex items-center gap-4 text-neutral-300">
          <span className="hover:text-white cursor-pointer transition-colors">Portfolio</span>
          <span className="hover:text-white cursor-pointer transition-colors">Services</span>
          <span className="hover:text-white cursor-pointer transition-colors">About</span>
        </div>
        <button className="ml-2 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-[11px] shadow-sm hover:opacity-90">
          Book 10s
        </button>
      </nav>
    </div>
  );
}

// 21. Luxury Gold Noir Nav (Fine Jewelry, Bespoke Watches)
export function NavLuxuryGoldNoir() {
  return (
    <nav className="w-full py-4 px-8 bg-[#0a0a0c] border-b border-[#3b3223] text-[#dcd2bb] flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="font-serif text-base tracking-[0.3em] uppercase text-[#e4d4b2]">MAISON VALOIR</span>
        <span className="text-[9px] font-mono text-[#918165] uppercase">HAUTE JOAILLERIE</span>
      </div>
      <div className="flex items-center gap-6 text-xs font-serif tracking-widest text-[#b5a78c]">
        <span className="hover:text-[#f4e8cf] cursor-pointer">ATELIER</span>
        <span className="hover:text-[#f4e8cf] cursor-pointer">SPECIMENS</span>
        <button className="px-4 py-1.5 border border-[#85714e] text-[#f4e8cf] hover:bg-[#85714e]/20 transition-colors uppercase text-[11px] font-mono">
          PRIVATE APPOINTMENT
        </button>
      </div>
    </nav>
  );
}

// 22. Wedding Editorial Script Nav (Bridal Studios & Fine Art Photography)
export function NavWeddingEditorialScript() {
  return (
    <nav className="w-full py-5 px-8 bg-[#faf7f2] border-b border-[#ece4d8] text-[#332a24] flex items-center justify-between">
      <div className="font-serif italic text-lg sm:text-xl text-[#2e231b]">
        Karin &amp; Johannes · Photography
      </div>
      <div className="flex items-center gap-6 text-xs font-serif tracking-wide text-[#6e5d50]">
        <span className="hover:text-black cursor-pointer">Love Stories</span>
        <span className="hover:text-black cursor-pointer">Pricing Guide</span>
        <button className="px-4 py-1.5 bg-[#4a3b32] text-[#faf7f2] hover:bg-[#332720] transition-colors rounded-sm text-xs font-sans">
          Check 2026 Dates
        </button>
      </div>
    </nav>
  );
}

// 23. Streetwear High-Vis Badge Nav (Barbers, Tattoo Artists, Urban Clinics)
export function NavStreetwearBadge() {
  return (
    <nav className="w-full py-3.5 px-6 bg-[#18181b] border-b border-zinc-700 text-white flex items-center justify-between font-mono">
      <div className="flex items-center gap-2">
        <span className="bg-[#ff5500] text-black px-2 py-0.5 text-xs font-black uppercase tracking-tighter">
          BARBER.NO
        </span>
        <span className="text-xs text-zinc-400 hidden sm:inline">TORSHOV, OSLO</span>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-zinc-300 hover:text-white cursor-pointer">FADES &amp; BEARD</span>
        <button className="px-3.5 py-1.5 bg-white text-black font-bold uppercase hover:bg-neutral-200 transition-colors">
          NEXT CUT: 14:30 →
        </button>
      </div>
    </nav>
  );
}

// 24. Artisan Linen Stitched Nav (Florists, Organic Bakeries, Handcraft)
export function NavArtisanLinen() {
  return (
    <nav className="w-full py-3.5 px-6 bg-[#f5f1e8] border-b-2 border-dashed border-[#b8a994] text-[#3c342b] flex items-center justify-between font-mono text-xs">
      <div className="flex items-center gap-2 font-bold uppercase">
        <FiHeart className="text-[#a44230]" />
        <span>KORN &amp; BLOMST</span>
      </div>
      <div className="flex items-center gap-4 text-[#695d50]">
        <span className="hover:text-black cursor-pointer">Sourdough Menu</span>
        <span className="hover:text-black cursor-pointer">Weekly Bouquet</span>
        <button className="px-3 py-1 bg-[#8c7a65] text-white rounded-none hover:bg-[#736350] transition-colors">
          Reserve Loaf
        </button>
      </div>
    </nav>
  );
}

// 25. Nordic Cobalt Floating Swiss Nav (Modernist Studios, Architecture, Galleries)
export function NavNordicCobaltPill() {
  return (
    <nav className="w-full py-3 px-5 bg-[#f4f5f7] border border-[#d8dce3] flex items-center justify-between text-[#0b0c10]">
      <div className="flex items-center gap-3">
        <span className="font-heading font-black tracking-tight text-sm text-[#002fa7] uppercase">
          KLEIN / 01
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[#002fa7]/10 text-[#002fa7] font-mono text-[10px] font-bold">
          OSLO 22:45
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs font-mono">
        <span className="text-neutral-500 hover:text-black cursor-pointer hidden sm:inline">Index</span>
        <span className="text-neutral-500 hover:text-black cursor-pointer hidden sm:inline">Archive</span>
        <button className="px-3.5 py-1.5 rounded-full bg-[#002fa7] text-white font-bold text-xs hover:bg-[#002587] transition-colors shadow-sm flex items-center gap-1.5">
          <span>Book Session</span>
          <FiArrowUpRight className="text-xs" />
        </button>
      </div>
    </nav>
  );
}

// 26. Y2K Acid Chrome Marquee Bar (Tooth Gems, Cyber Nails, Streetwear)
export function NavY2KChromeMarquee() {
  return (
    <nav className="w-full bg-[#121214] border-b border-[#3a3a42] text-[#f0f0f5] text-xs font-mono">
      <div className="py-1 px-4 bg-gradient-to-r from-[#232328] via-[#3a3a42] to-[#232328] border-b border-white/10 flex items-center justify-between text-[10px] text-neutral-400">
        <span className="flex items-center gap-1 text-[#e2fe52] font-bold">
          <FiZap className="text-xs" /> FLASH DROP OPEN · 4 SLOTS LEFT
        </span>
        <span className="tracking-widest hidden sm:inline">OSLO · ST. HANSHAUGEN</span>
      </div>
      <div className="py-3 px-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm tracking-widest text-[#e2fe52] uppercase bg-black px-2 py-0.5 border border-[#e2fe52]/40">
            CHROME★GEM
          </span>
          <span className="text-[10px] text-neutral-400 hidden sm:inline">TOOTH GEMS &amp; GRILLZ</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-3 py-1 rounded bg-[#e2fe52] text-black font-black uppercase text-[11px] hover:bg-[#c9e838] transition-colors shadow-[0_0_12px_rgba(226,254,82,0.3)]">
            LOCK SLOT →
          </button>
        </div>
      </div>
    </nav>
  );
}

