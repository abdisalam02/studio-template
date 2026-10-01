"use client";

import React from "react";
import Image from "next/image";
import { FiZap, FiHeart, FiStar } from "react-icons/fi";

// 01. High-Contrast Serif & Grotesk Counterpoint
export function TitleSerifGrotesk() {
  return (
    <div className="w-full bg-[#fbf9f5] border border-neutral-300 p-6 sm:p-8 text-neutral-900">
      <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 block mb-2 font-bold">
        SECTION 01 · CURATED SELECTION
      </span>
      <h2 className="text-2xl sm:text-4xl text-black leading-tight">
        <span className="font-serif italic font-normal">Modern treatments</span>{" "}
        <span className="font-heading font-black uppercase tracking-tight">Built with precision.</span>
      </h2>
      <p className="text-xs font-mono text-neutral-600 mt-2 max-w-sm">
        Every appointment includes thorough Russian cuticle prep and structured apex balancing.
      </p>
    </div>
  );
}

// 02. Monospace Index Lead
export function TitleMonoIndex() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-6 font-mono text-neutral-900">
      <div className="flex items-center gap-3 text-xs text-neutral-500 mb-3">
        <span className="text-black font-bold">[ 02 // LEDGER ]</span>
        <div className="h-px flex-1 bg-neutral-300" />
        <span className="text-[10px]">ALL PRICES IN NOK</span>
      </div>
      <h3 className="font-heading font-bold text-2xl uppercase tracking-tight text-black">
        TREATMENT MENU &amp; ADD-ONS
      </h3>
      <p className="text-xs text-neutral-600 mt-1">
        Transparent fixed rates. No surprise charges at the studio chair.
      </p>
    </div>
  );
}

// 03. Heavy Architectural Sans with Hairline Rule
export function TitleHeavyRule() {
  return (
    <div className="w-full bg-[#f4efe8] border-2 border-neutral-800 p-6 text-neutral-900">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b-2 border-black">
        <h2 className="font-heading font-black text-3xl sm:text-4xl uppercase tracking-tighter text-black leading-none">
          PORTFOLIO ARCHIVE
        </h2>
        <span className="text-xs font-mono text-neutral-600 uppercase tracking-widest font-bold">
          2024 — 2026 RELEASES
        </span>
      </div>
      <div className="flex justify-between items-center text-[11px] font-mono text-neutral-600 mt-2">
        <span>TOTAL CLIENTS: 18 STUDIOS</span>
        <span>LOCATION: OSLO / NORGE</span>
      </div>
    </div>
  );
}

// 04. Ghost Contrast (Ink + Whisper Grey)
export function TitleGhostContrast() {
  return (
    <div className="w-full bg-neutral-950 border border-neutral-800 p-6 sm:p-8 text-white">
      <h2 className="font-heading font-black text-2xl sm:text-4xl uppercase tracking-tight leading-tight">
        <span className="text-white">CLEAN LOOKBOOK.</span><br />
        <span className="text-neutral-700">ZERO COMPLICATIONS.</span>
      </h2>
      <p className="text-xs font-mono text-neutral-400 mt-3 max-w-sm leading-relaxed">
        High contrast typographic hierarchy guides your visitors effortlessly to checkout.
      </p>
    </div>
  );
}

// 05. Drop-Cap Editorial Manifesto
export function TitleDropCap() {
  return (
    <div className="w-full bg-[#fcfaf7] border border-amber-900/15 p-6 font-serif text-amber-950">
      <div className="text-[10px] font-mono uppercase tracking-widest text-amber-800/70 mb-3 font-bold">
        THE STUDIO PHILOSOPHY
      </div>
      <div className="flex gap-4 items-start">
        <span className="font-heading font-black text-5xl sm:text-6xl text-amber-900 leading-none select-none">
          T
        </span>
        <p className="text-sm sm:text-base text-amber-950 leading-relaxed pt-1 font-serif">
          he modern studio booking link should look like a luxury fashion editorial, not a generic spreadsheet. We build bespoke mobile pages where every detail is intentional.
        </p>
      </div>
    </div>
  );
}

// 06. Super-Tracked All-Caps Luxury Spacing
export function TitleSuperTracked() {
  return (
    <div className="w-full bg-[#0a0a0d] border border-[#3d3221] p-6 sm:p-8 text-center text-[#d4af37]">
      <span className="text-[10px] font-mono text-[#8f7952] uppercase tracking-[0.3em] block mb-2 font-bold">
        A U T U M N   /   W I N T E R
      </span>
      <h2 className="font-serif text-lg sm:text-2xl text-[#f3e5c8] uppercase tracking-[0.35em] font-light">
        S P E C I M E N   G A L L E R Y
      </h2>
      <div className="w-12 h-px bg-[#d4af37] mx-auto mt-4" />
    </div>
  );
}

// 07. Highlight Ink Block Marker
export function TitleInkBlock() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-6 flex flex-wrap items-center gap-3 text-neutral-900">
      <span className="px-3 py-1 bg-black text-white font-mono text-xs font-bold uppercase tracking-wider">
        TIER 1 DROP
      </span>
      <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-black">
        THE 1-PAGE MOBILE SITE
      </h3>
      <span className="text-xs font-mono text-neutral-500 ml-auto font-bold">
        2,000 KR ONE-TIME
      </span>
    </div>
  );
}

// 08. Hanging Indent Section Header
export function TitleHangingIndent() {
  return (
    <div className="w-full bg-[#f8f8f8] border border-neutral-300 p-6 sm:p-8 font-mono text-neutral-900">
      <div className="flex gap-4">
        <span className="text-sm font-bold text-neutral-400 select-none">§04</span>
        <div>
          <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-black">
            FREQUENT QUESTIONS &amp; POLICIES
          </h3>
          <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
            Straightforward rules on deposits, cancellations, and prep before your visit.
          </p>
        </div>
      </div>
    </div>
  );
}

// 09. Inline Visual Token (Mini Thumbnail in Title)
export function TitleInlineToken() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-6 text-neutral-900">
      <h2 className="font-heading font-black text-xl sm:text-3xl uppercase tracking-tight text-black flex flex-wrap items-center gap-2 sm:gap-3 leading-tight">
        <span>FEATURED</span>
        <span className="inline-block relative w-12 h-6 sm:w-16 sm:h-8 border border-neutral-300 overflow-hidden align-middle">
          <Image src="/demo/nails/nail-5.jpg" alt="Token" fill className="object-cover" />
        </span>
        <span>TREATMENTS &amp;</span>
        <span className="text-neutral-400">LOOKS</span>
      </h2>
      <span className="text-[11px] font-mono text-neutral-500 block mt-2">
        CLICK ANY SET BELOW TO EXPAND SPECIFICATIONS
      </span>
    </div>
  );
}

// 10. Split Number & Topic Ledger
export function TitleSplitLedger() {
  return (
    <div className="w-full bg-[#f6f6f6] border border-neutral-300 p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center font-mono text-xs text-neutral-900">
      <div className="text-2xl font-black font-heading text-black">
        № 03
      </div>
      <div className="sm:col-span-2">
        <div className="font-bold uppercase text-black">APPOINTMENT SCHEDULING</div>
        <div className="text-neutral-500 text-[11px]">Next opening: Thursday March 27</div>
      </div>
      <div className="text-left sm:text-right">
        <span className="px-2 py-1 bg-black text-white text-[10px] uppercase font-bold">
          LIVE CALENDAR
        </span>
      </div>
    </div>
  );
}

// 11. Minimalist Bracket Enclosure
export function TitleBracketEnclosure() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-6 text-center font-mono text-neutral-900">
      <div className="inline-flex items-center gap-2 text-black font-bold text-sm sm:text-base tracking-widest uppercase">
        <span className="text-neutral-400">[</span>
        <span>THE STUDIO SPECIFICATION</span>
        <span className="text-neutral-400">]</span>
      </div>
      <div className="text-[11px] text-neutral-500 mt-1 uppercase tracking-wider">
        BY APPOINTMENT · BYGG 4 · OSLO
      </div>
    </div>
  );
}

// 12. Rotated Vertical Accent Spine
export function TitleVerticalSpine() {
  return (
    <div className="w-full bg-[#fafafa] border border-neutral-300 p-6 flex gap-5 items-stretch text-neutral-900">
      <div className="flex items-center justify-center border-r border-neutral-300 pr-3">
        <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 -rotate-90 whitespace-nowrap font-bold">
          CATEGORY // 08
        </span>
      </div>
      <div>
        <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-black">
          LOOKBOOK CATALOGUE
        </h3>
        <p className="text-xs font-mono text-neutral-600 mt-1 max-w-sm">
          High-definition photography of real studio clients. Natural daylight, zero artificial skin blurring.
        </p>
      </div>
    </div>
  );
}

// =========================================================================
// 10 BRAND-NEW CREATIVE TITLE STYLES (DIVERSE AESTHETICS & LIBRARIES)
// =========================================================================

// 13. Warm Terracotta Pill Title (Artisan Pottery & Natural Living)
export function TitleTerracottaPill() {
  return (
    <div className="w-full bg-[#fbf7f2] border border-[#e3d5c6] p-6 text-[#291f19]">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0dfd1] text-[#c25e3e] font-mono text-xs font-bold mb-2">
        <span>STONEWARE COLLECTION 2026</span>
      </div>
      <h2 className="font-serif italic text-2xl sm:text-4xl text-[#291f19] leading-tight">
        Formed on the wheel, fired in wood ash.
      </h2>
      <div className="w-16 h-1 bg-[#c25e3e] mt-3 rounded-full" />
    </div>
  );
}

// 14. Patisserie Sweet Ribbon Title (Cake Studio, Bakery, Confectionery)
export function TitlePatisserieScript() {
  return (
    <div className="w-full bg-[#fdf5f7] border border-[#f5d8e2] p-6 text-center text-[#591726]">
      <span className="text-[10px] font-serif uppercase tracking-[0.25em] text-[#a1445b] block mb-1">
        ✦ MENUS &amp; GÂTEAUX ✦
      </span>
      <h3 className="font-serif italic text-2xl sm:text-4xl text-[#591726]">
        Celebration Flavors &amp; Piped Finishes
      </h3>
      <p className="text-xs font-sans text-[#783244] mt-2 max-w-sm mx-auto">
        Layered sponge cakes flavored with Norwegian wild berries, roasted pistachio, and Madagascar vanilla bean.
      </p>
    </div>
  );
}

// 15. Japanese Wabi-Sabi Sage Title (Calm Wellness & Japanese Spa)
export function TitleWabiSabiSage() {
  return (
    <div className="w-full bg-[#f2f6f1] border-l-4 border-[#3e5642] p-6 text-[#1c2c1e]">
      <div className="flex items-center gap-2 text-xs font-mono text-[#4a634e] font-semibold mb-1">
        <span>[ 壱 // 施術 ]</span>
        <span>·</span>
        <span>HOLISTIC NAIL PROTOCOL</span>
      </div>
      <h3 className="font-serif text-2xl sm:text-3xl text-[#1c2c1e] tracking-wide">
        Mindful Cuticle Care &amp; Organic Balancing
      </h3>
    </div>
  );
}

// 16. Cyber Glitch Tech Title (Streetwear, Chrome Jewelry, Urban)
export function TitleCyberGlitch() {
  return (
    <div className="w-full bg-[#0a0a0d] border border-[#bef264]/40 p-5 text-white font-mono shadow-[0_0_15px_rgba(190,242,100,0.1)]">
      <div className="flex items-center gap-2 text-[#bef264] text-xs font-bold mb-1">
        <span className="animate-pulse">●</span>
        <span>SYS_CATALOG // SPEC_099</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wider">
        SURGICAL CHROME &amp; TOOTH GEMS
      </h2>
      <div className="mt-2 text-xs text-zinc-400">
        &gt; 3D OPTICAL FITMENT ONLY · NO INVASIVE DRILLING
      </div>
    </div>
  );
}

// 17. Neo-Brutalist Sticker Pop Title (Indie Nails & Y2K Trends)
export function TitleNeoPopSticker() {
  return (
    <div className="w-full bg-[#ede9fe] border-3 border-black p-5 text-black shadow-[4px_4px_0px_#000]">
      <div className="inline-block px-3 py-1 bg-[#fde047] border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_#000] mb-2 -rotate-1">
        ★ CLIENT FAVORITES ★
      </div>
      <h2 className="font-heading font-black text-2xl sm:text-4xl uppercase tracking-tighter">
        PICK YOUR NAIL SHAPE &amp; ART LEVEL
      </h2>
    </div>
  );
}

// 18. Magic UI Animated Gradient Title (Modern Tech & High Conversion)
export function TitleMagicGradientText() {
  return (
    <div className="w-full bg-gradient-to-r from-zinc-950 via-neutral-900 to-zinc-950 border border-white/10 p-6 sm:p-8 text-center text-white">
      <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-cyan-300 font-mono text-[10px] mb-3">
        <FiZap />
        <span>INTERACTIVE WORKFLOW</span>
      </div>
      <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400">
        Choose your bespoke package.
      </h2>
    </div>
  );
}

// 19. Luxury Gold Roman Title (High Jewelry & Ateliers)
export function TitleLuxuryGoldSerif() {
  return (
    <div className="w-full bg-[#08080a] border-y border-[#3d321d] py-6 px-8 text-center text-[#d4af37]">
      <span className="font-serif italic text-xs tracking-[0.3em] text-[#9c8453] uppercase block mb-1">
        CHRONIQUE № IV
      </span>
      <h3 className="font-serif text-xl sm:text-3xl text-[#f5e8cd] tracking-[0.15em] uppercase font-normal">
        THE BESPOKE COMMISSION ARCHIVE
      </h3>
      <div className="w-8 h-px bg-[#d4af37] mx-auto mt-3" />
    </div>
  );
}

// 20. Wedding Script Monogram Title (Bridal & Fine Art Photo)
export function TitleWeddingScriptEmboss() {
  return (
    <div className="w-full bg-[#faf7f2] border border-[#e8dfd1] p-6 text-center text-[#2b2118]">
      <div className="font-serif text-xs italic tracking-widest text-[#7a6452] uppercase mb-1">
        PORTFOLIO &amp; ARCHIVE
      </div>
      <h2 className="font-serif text-2xl sm:text-3xl text-[#1f1711] font-light">
        Real Weddings from the Norwegian Fjords
      </h2>
      <p className="text-xs text-[#615042] mt-2 max-w-sm mx-auto">
        Full-day documentary coverage from first morning coffee to late-night sparkler exits.
      </p>
    </div>
  );
}

// 21. Barber Industrial Stencil Title (Urban Barbers & Tattoo Studios)
export function TitleBarberStencil() {
  return (
    <div className="w-full bg-[#1c1c1f] border-2 border-zinc-700 p-5 text-white font-mono">
      <div className="flex items-center gap-2 text-xs font-bold text-[#ea580c] mb-1">
        <span>/// SECTION 02</span>
        <span>·</span>
        <span>SERVICES &amp; RATES</span>
      </div>
      <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
        TRADITIONAL GROOMING MENU
      </h3>
    </div>
  );
}

// 22. Artisan Hand-Stitch Title (Organic Florals, Bread & Craft)
export function TitleArtisanHandStitch() {
  return (
    <div className="w-full bg-[#f7f4ed] border-2 border-dashed border-[#b3a490] p-6 text-[#3b3227]">
      <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#806f5b] uppercase mb-1">
        <FiHeart className="text-[#a44230]" />
        <span>Weekly Harvest &amp; Fresh Bakes</span>
      </div>
      <h3 className="font-serif italic text-2xl sm:text-3xl text-[#262018]">
        Slow Fermentation Sourdough &amp; Seasonal Blooms
      </h3>
    </div>
  );
}

// 23. Swiss Utilitarian Coordinate Title (Architectural, Industrial, Strict DIN)
export function TitleSwissUtilitarianGrid() {
  return (
    <div className="w-full bg-[#f7f7f7] border border-[#d1d1d6] p-6 font-mono text-black">
      <div className="flex justify-between items-center text-[10px] text-neutral-500 pb-2 border-b border-black mb-3">
        <span className="font-bold flex items-center gap-1.5 text-black">
          <span className="w-2 h-2 bg-[#ff3b30] rounded-none inline-block" />
          SYSTEM SPEC // 04.01
        </span>
        <span>59.9139° N, 10.7522° E · OSLO</span>
      </div>
      <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tighter leading-none">
        INDEX OF DISCIPLINARY DELIVERABLES
      </h3>
      <p className="text-[11px] text-neutral-600 mt-2 font-normal">
        All projects documented under ISO dimensional standards.
      </p>
    </div>
  );
}

// 24. Peach Cloud Dewy Title (K-Beauty, Lash & Brow Spas, Skin Hydration)
export function TitlePeachCloudGlow() {
  return (
    <div className="w-full bg-[#fff7f3] border border-[#fcd5c5] p-6 sm:p-8 rounded-2xl text-[#431407]">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#feece2] text-[#fb7185] font-mono text-[10px] font-bold mb-3 shadow-sm">
        <span>✨ HYDRATION ARCHIVE</span>
        <span>·</span>
        <span>K-BEAUTY LAB</span>
      </div>
      <h3 className="font-serif text-2xl sm:text-3xl font-normal leading-tight text-[#431407]">
        Glass skin treatments &amp; <br className="hidden sm:inline" />
        <span className="italic font-light text-[#fb7185]">featherlight lash artistry.</span>
      </h3>
    </div>
  );
}

