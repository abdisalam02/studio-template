"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FiChevronLeft, FiChevronRight, FiMaximize2, FiArrowUpRight, FiHeart } from "react-icons/fi";

// 01. Horizontal Filmstrip Carousel
export function GalleryFilmstrip() {
  const [index, setIndex] = useState(0);
  const slides = [
    { src: "/demo/nails/nail-1.jpg", title: "Clean French Micro-Tip", price: "750 kr" },
    { src: "/demo/nails/nail-2.jpg", title: "Structured Chrome Overlay", price: "800 kr" },
    { src: "/demo/nails/nail-3.jpg", title: "Milk White BIAB", price: "700 kr" },
    { src: "/demo/nails/nail-4.jpg", title: "Aura Airbrush Gradient", price: "850 kr" },
  ];

  const next = () => setIndex((i) => (i + 1) % slides.length);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  return (
    <div className="w-full bg-[#f8f8f8] border border-neutral-300 p-5 text-neutral-900">
      <div className="flex items-center justify-between mb-3 text-xs font-mono">
        <span className="font-bold">FILMSTRIP 0{index + 1} / 0{slides.length}</span>
        <div className="flex gap-1">
          <button onClick={prev} className="p-1.5 border border-neutral-300 bg-white hover:bg-neutral-100">
            <FiChevronLeft className="text-xs" />
          </button>
          <button onClick={next} className="p-1.5 border border-neutral-300 bg-white hover:bg-neutral-100">
            <FiChevronRight className="text-xs" />
          </button>
        </div>
      </div>
      <div className="relative h-60 w-full border border-neutral-300 overflow-hidden">
        <Image
          src={slides[index].src}
          alt={slides[index].title}
          fill
          className="object-cover transition-all duration-500"
        />
        <div className="absolute bottom-0 inset-x-0 p-3 bg-white/95 backdrop-blur-sm border-t border-neutral-300 flex justify-between items-center text-xs font-mono">
          <span className="font-bold text-black">{slides[index].title}</span>
          <span className="text-neutral-500">{slides[index].price}</span>
        </div>
      </div>
    </div>
  );
}

// 02. Asymmetrical Editorial Duo
export function GalleryEditorialDuo() {
  return (
    <div className="w-full bg-[#fcfaf7] border border-[#e8dfd3] p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[#2b221a]">
      <div className="sm:col-span-2 relative h-64 border border-[#e8dfd3] overflow-hidden group">
        <Image
          src="/demo/wedding/wedding-1.jpg"
          alt="Lead Look"
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-white text-[10px] font-mono border border-neutral-300 font-bold">
          PRIMARY SPECIMEN
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="relative h-36 border border-[#e8dfd3] overflow-hidden">
          <Image
            src="/demo/wedding/wedding-2.jpg"
            alt="Macro Texture"
            fill
            className="object-cover"
          />
        </div>
        <div className="p-3 bg-white border border-[#e8dfd3] font-mono text-[11px] flex-1 flex flex-col justify-center">
          <div className="text-[10px] text-neutral-500 uppercase font-bold">Macro Specimen</div>
          <div className="font-bold text-black mt-0.5">Grain &amp; Linen Detail</div>
          <div className="text-neutral-500 text-[10px] mt-2">Captured on 35mm analogue film.</div>
        </div>
      </div>
    </div>
  );
}

// 03. Tight Masonry Trio
export function GalleryMasonryTrio() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-5 grid grid-cols-3 gap-2">
      <div className="relative h-56 border border-neutral-300 overflow-hidden group">
        <Image src="/demo/cakes/cake-1.jpg" alt="Cake 1" fill className="object-cover group-hover:scale-105 transition-transform" />
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-white text-[9px] font-mono border border-neutral-300 font-bold">
          01. CHERRY
        </div>
      </div>
      <div className="relative h-44 mt-6 border border-neutral-300 overflow-hidden group">
        <Image src="/demo/cakes/cake-2.jpg" alt="Cake 2" fill className="object-cover group-hover:scale-105 transition-transform" />
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-white text-[9px] font-mono border border-neutral-300 font-bold">
          02. MATCHA
        </div>
      </div>
      <div className="relative h-52 border border-neutral-300 overflow-hidden group">
        <Image src="/demo/cakes/cake-3.jpg" alt="Cake 3" fill className="object-cover group-hover:scale-105 transition-transform" />
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-white text-[9px] font-mono border border-neutral-300 font-bold">
          03. LAMBETH
        </div>
      </div>
    </div>
  );
}

// 04. Polaroid / Exhibition Specimen Cards
export function GalleryPolaroidSpecimen() {
  return (
    <div className="w-full bg-[#f4f1eb] border border-neutral-300 p-6 flex flex-wrap justify-center gap-6">
      <div className="w-48 bg-white border border-neutral-300 p-3 shadow-md hover:-rotate-1 transition-transform">
        <div className="relative h-40 w-full border border-neutral-200 bg-neutral-100 overflow-hidden">
          <Image src="/demo/nails/nail-2.jpg" alt="Polaroid 1" fill className="object-cover" />
        </div>
        <div className="mt-3 font-mono text-[10px]">
          <div className="font-bold text-black uppercase">Set #041 · French Chrome</div>
          <div className="text-neutral-500">Oslo Studio · 14.03.2026</div>
        </div>
      </div>
      <div className="w-48 bg-white border border-neutral-300 p-3 shadow-md hover:rotate-1 transition-transform">
        <div className="relative h-40 w-full border border-neutral-200 bg-neutral-100 overflow-hidden">
          <Image src="/demo/nails/nail-3.jpg" alt="Polaroid 2" fill className="object-cover" />
        </div>
        <div className="mt-3 font-mono text-[10px]">
          <div className="font-bold text-black uppercase">Set #042 · Soft BIAB</div>
          <div className="text-neutral-500">Oslo Studio · 18.03.2026</div>
        </div>
      </div>
    </div>
  );
}

// 05. Full-Bleed Vertical Scroll Stacker
export function GalleryVerticalStacker() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-4 font-mono text-xs">
      <div className="text-[10px] text-neutral-500 uppercase mb-3 font-bold">[ SERIES // CHRONOLOGY ]</div>
      <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
        <div className="relative h-44 border border-neutral-300 overflow-hidden">
          <Image src="/demo/wedding/wedding-3.jpg" alt="Stack 1" fill className="object-cover" />
          <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 text-[10px] font-bold">
            01 / CEREMONY
          </div>
        </div>
        <div className="relative h-44 border border-neutral-300 overflow-hidden">
          <Image src="/demo/wedding/wedding-4.jpg" alt="Stack 2" fill className="object-cover" />
          <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 text-[10px] font-bold">
            02 / RECEPTION
          </div>
        </div>
      </div>
    </div>
  );
}

// 06. Interactive Hover Zoom & Detail Preview
export function GalleryHoverZoom() {
  const [hovered, setHovered] = useState<number | null>(null);

  const items = [
    { src: "/demo/nails/nail-5.jpg", name: "Almond Sculpt", time: "90 min", price: "800 kr" },
    { src: "/demo/nails/nail-6.jpg", name: "Short Square Micro", time: "75 min", price: "750 kr" },
  ];

  return (
    <div className="w-full bg-[#18181b] border border-zinc-700 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((item, idx) => (
        <div
          key={item.name}
          onMouseEnter={() => setHovered(idx)}
          onMouseLeave={() => setHovered(null)}
          className="relative h-52 border border-zinc-700 overflow-hidden cursor-pointer"
        >
          <Image
            src={item.src}
            alt={item.name}
            fill
            className={`object-cover transition-transform duration-500 ${
              hovered === idx ? "scale-110" : "scale-100"
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
          <div className="absolute bottom-3 inset-x-3 text-white font-mono text-xs flex justify-between items-end">
            <div>
              <div className="font-bold">{item.name}</div>
              <div className="text-[10px] text-zinc-300">{item.time}</div>
            </div>
            <span className="px-2 py-1 bg-white text-black font-bold text-[10px]">
              {item.price}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// 07. Minimal 6-Grid Lookbook with Badge Pointers
export function GallerySixGrid() {
  const grid = [
    { src: "/demo/nails/nail-1.jpg", tag: "FRENCH" },
    { src: "/demo/nails/nail-2.jpg", tag: "CHROME" },
    { src: "/demo/nails/nail-3.jpg", tag: "BIAB" },
    { src: "/demo/nails/nail-4.jpg", tag: "AURA" },
    { src: "/demo/nails/nail-5.jpg", tag: "ALMOND" },
    { src: "/demo/nails/nail-6.jpg", tag: "NATURAL" },
  ];

  return (
    <div className="w-full bg-white border border-neutral-300 p-4">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {grid.map((g) => (
          <div key={g.tag} className="relative aspect-square border border-neutral-300 overflow-hidden group">
            <Image src={g.src} alt={g.tag} fill className="object-cover group-hover:scale-105 transition-transform" />
            <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-white text-[8px] font-mono border border-neutral-300 font-bold">
              {g.tag}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 08. Offset Overlap Layering (Physical Photo Stack)
export function GalleryOffsetStack() {
  return (
    <div className="w-full bg-[#f8f6f0] border border-neutral-300 p-6 flex justify-center items-center h-64 overflow-hidden relative">
      <div className="relative w-44 h-48 border border-neutral-300 shadow-md -rotate-6 z-0 overflow-hidden">
        <Image src="/demo/cakes/cake-4.jpg" alt="Under cake" fill className="object-cover" />
      </div>
      <div className="relative w-48 h-52 border-2 border-black shadow-xl rotate-3 -ml-12 z-10 overflow-hidden">
        <Image src="/demo/cakes/cake-5.jpg" alt="Top cake" fill className="object-cover" />
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black text-white text-[10px] font-mono font-bold">
          LAYERED DUO
        </div>
      </div>
    </div>
  );
}

// 09. Before / After Split Slider Layout
export function GalleryBeforeAfter() {
  const [showAfter, setShowAfter] = useState(true);

  return (
    <div className="w-full bg-white border border-neutral-300 p-5 font-mono text-xs text-neutral-900">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold">TRANSFORMATION SCAN</span>
        <div className="flex border border-neutral-300 p-0.5">
          <button
            onClick={() => setShowAfter(false)}
            className={`px-2 py-0.5 text-[10px] ${!showAfter ? "bg-black text-white font-bold" : "text-neutral-500"}`}
          >
            BEFORE
          </button>
          <button
            onClick={() => setShowAfter(true)}
            className={`px-2 py-0.5 text-[10px] ${showAfter ? "bg-black text-white font-bold" : "text-neutral-500"}`}
          >
            AFTER (4 WEEKS)
          </button>
        </div>
      </div>
      <div className="relative h-56 border border-neutral-300 overflow-hidden">
        <Image
          src={showAfter ? "/demo/nails/nail-1.jpg" : "/demo/nails/nail-4.jpg"}
          alt="Before / After"
          fill
          className="object-cover transition-opacity duration-300"
        />
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white border border-neutral-300 text-[10px] font-bold">
          {showAfter ? "AFTER: Apex Balanced Structured Gel" : "BEFORE: Bare Damaged Nail Beds"}
        </div>
      </div>
    </div>
  );
}

// 10. Blueprint Greyscale to Color Reveal
export function GalleryBlueprintReveal() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-5 grid grid-cols-2 gap-4 font-mono text-xs">
      <div className="relative h-48 border border-neutral-300 overflow-hidden group cursor-pointer">
        <Image
          src="/demo/wedding/wedding-5.jpg"
          alt="Blueprint 1"
          fill
          className="object-cover filter grayscale contrast-125 group-hover:filter-none transition-all duration-500"
        />
        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-white text-[9px] border border-neutral-300 font-bold">
          HOVER FOR COLOR
        </div>
      </div>
      <div className="relative h-48 border border-neutral-300 overflow-hidden group cursor-pointer">
        <Image
          src="/demo/wedding/wedding-6.jpg"
          alt="Blueprint 2"
          fill
          className="object-cover filter grayscale contrast-125 group-hover:filter-none transition-all duration-500"
        />
        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-white text-[9px] border border-neutral-300 font-bold">
          HOVER FOR COLOR
        </div>
      </div>
    </div>
  );
}

// 11. Circular Architectural Framing
export function GalleryCircularFraming() {
  return (
    <div className="w-full bg-[#fdfaf5] border border-amber-900/15 p-6 flex justify-around items-center">
      <div className="text-center">
        <div className="relative w-28 h-36 sm:w-32 sm:h-44 rounded-t-full border border-amber-900/20 overflow-hidden mx-auto shadow-sm">
          <Image src="/demo/cakes/cake-6.jpg" alt="Arch 1" fill className="object-cover" />
        </div>
        <span className="font-mono text-[10px] text-amber-900/70 block mt-2 font-bold">ARCH NO. 1</span>
      </div>
      <div className="text-center">
        <div className="relative w-28 h-36 sm:w-32 sm:h-44 rounded-t-full border border-amber-900/20 overflow-hidden mx-auto shadow-sm">
          <Image src="/demo/cakes/cake-1.jpg" alt="Arch 2" fill className="object-cover" />
        </div>
        <span className="font-mono text-[10px] text-amber-900/70 block mt-2 font-bold">ARCH NO. 2</span>
      </div>
    </div>
  );
}

// 12. 1-Large + 2-Small Focus Gallery
export function GalleryFocusTrio() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-5 grid grid-cols-1 sm:grid-cols-5 gap-3">
      <div className="sm:col-span-3 relative h-56 border border-neutral-300 overflow-hidden">
        <Image src="/demo/nails/nail-2.jpg" alt="Focus Lead" fill className="object-cover" />
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black text-white text-[10px] font-mono font-bold">
          MAIN SPECIMEN
        </div>
      </div>
      <div className="sm:col-span-2 flex flex-col gap-3">
        <div className="relative h-[106px] border border-neutral-300 overflow-hidden">
          <Image src="/demo/nails/nail-3.jpg" alt="Sub 1" fill className="object-cover" />
        </div>
        <div className="relative h-[106px] border border-neutral-300 overflow-hidden">
          <Image src="/demo/nails/nail-4.jpg" alt="Sub 2" fill className="object-cover" />
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 10 BRAND-NEW CREATIVE GALLERY STYLES (DIVERSE AESTHETICS & LIBRARIES)
// =========================================================================

// 13. Warm Terracotta Urns Gallery (Artisan Pottery, Warm Decor)
export function GalleryTerracottaUrns() {
  return (
    <div className="w-full bg-[#faf6f0] border border-[#e4d6c7] p-5 text-[#2b211a]">
      <div className="flex justify-between items-center mb-3">
        <span className="font-serif italic text-sm text-[#2b211a]">Wood-Fired Ceramics</span>
        <span className="text-[10px] font-mono text-[#c25e3e] font-bold">LIMITED BATCH (4 OF 6 CLAIMED)</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="relative h-44 rounded-t-3xl border border-[#d9c7b4] overflow-hidden">
          <Image src="/demo/cakes/cake-4.jpg" alt="1" fill className="object-cover" />
        </div>
        <div className="relative h-44 rounded-t-3xl border border-[#d9c7b4] overflow-hidden">
          <Image src="/demo/cakes/cake-5.jpg" alt="2" fill className="object-cover" />
        </div>
        <div className="relative h-44 rounded-t-3xl border border-[#d9c7b4] overflow-hidden">
          <Image src="/demo/cakes/cake-6.jpg" alt="3" fill className="object-cover" />
        </div>
      </div>
    </div>
  );
}

// 14. Cake Flavors & Swatch Cards Gallery (Sweet Patisseries)
export function GalleryCakeFlavorsGrid() {
  const flavors = [
    { title: "Raspberry Sourdough", tag: "SUMMER", color: "bg-[#fdf2f4]" },
    { title: "Salted Caramel Brioche", tag: "SIGNATURE", color: "bg-[#fcf8f0]" },
    { title: "Matcha Velvet", tag: "SPECIAL", color: "bg-[#f2f7f1]" },
  ];

  return (
    <div className="w-full bg-[#fdf6f7] border border-[#f5d9e2] p-5 text-[#541624]">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {flavors.map((f, i) => (
          <div key={f.title} className={`${f.color} border border-[#e8bac8] p-3 rounded-md shadow-sm`}>
            <div className="relative h-32 rounded overflow-hidden mb-2">
              <Image src={`/demo/cakes/cake-${i + 1}.jpg`} alt={f.title} fill className="object-cover" />
            </div>
            <div className="flex justify-between items-center text-xs font-serif">
              <span className="font-bold text-[#541624]">{f.title}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ebd0d9] text-[#732236] font-mono">{f.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 15. Japanese Zen Sage Circular Gallery (Clean Nail Spa)
export function GalleryZenMatchaNails() {
  return (
    <div className="w-full bg-[#f2f5f0] border border-[#d5ded2] p-5 text-[#213123]">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#4b664f] overflow-hidden mx-auto shadow-md">
            <Image src="/demo/nails/nail-1.jpg" alt="Zen 1" fill className="object-cover" />
          </div>
          <span className="text-xs font-mono font-bold block mt-2">MICRO FRENCH</span>
        </div>
        <div>
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#4b664f] overflow-hidden mx-auto shadow-md">
            <Image src="/demo/nails/nail-2.jpg" alt="Zen 2" fill className="object-cover" />
          </div>
          <span className="text-xs font-mono font-bold block mt-2">CHROME HALO</span>
        </div>
        <div>
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#4b664f] overflow-hidden mx-auto shadow-md">
            <Image src="/demo/nails/nail-3.jpg" alt="Zen 3" fill className="object-cover" />
          </div>
          <span className="text-xs font-mono font-bold block mt-2">BIAB NUDE</span>
        </div>
      </div>
    </div>
  );
}

// 16. Cyber Chrome Glowing Gallery (Streetwear Grillz & Tattoo)
export function GalleryCyberChromeGrillz() {
  return (
    <div className="w-full bg-[#0a0a0d] border border-[#bef264]/40 p-4 text-white font-mono shadow-[0_0_20px_rgba(190,242,100,0.1)]">
      <div className="flex justify-between text-xs text-[#bef264] pb-2 border-b border-zinc-800 mb-3">
        <span>CASTING ARCHIVE // 3D SCANS</span>
        <span>LAB_REF: #990</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative h-44 border-2 border-[#bef264]/60 overflow-hidden group">
          <Image src="/showcase/grillz/work-2.png" alt="Grillz 1" fill className="object-cover group-hover:scale-105 transition-transform" />
          <div className="absolute bottom-1 left-1 bg-black/80 px-2 py-0.5 text-[9px] text-[#bef264] border border-[#bef264]/40">
            SOLID 18K WHITE GOLD
          </div>
        </div>
        <div className="relative h-44 border-2 border-[#bef264]/60 overflow-hidden group">
          <Image src="/showcase/grillz/work-3.png" alt="Grillz 2" fill className="object-cover group-hover:scale-105 transition-transform" />
          <div className="absolute bottom-1 left-1 bg-black/80 px-2 py-0.5 text-[9px] text-[#bef264] border border-[#bef264]/40">
            AUSTRALIAN OPAL CAP
          </div>
        </div>
      </div>
    </div>
  );
}

// 17. Neo-Brutalist Sticker Pinboard Gallery (Y2K Indie Nail & Beauty)
export function GalleryNeoPopStickerPinboard() {
  return (
    <div className="w-full bg-[#e0e7ff] border-3 border-black p-5 text-black shadow-[4px_4px_0px_#000]">
      <div className="flex justify-between items-center mb-4">
        <span className="px-2 py-0.5 bg-[#f43f5e] text-white border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_#000]">
          ✦ FRESH DROP ✦
        </span>
        <span className="font-mono text-xs font-bold">CLICK TO INSPECT</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border-2 border-black p-2 shadow-[3px_3px_0px_#000] rotate-1">
          <div className="relative h-28 border border-black mb-1 overflow-hidden">
            <Image src="/demo/nails/nail-4.jpg" alt="1" fill className="object-cover" />
          </div>
          <span className="text-[10px] font-black uppercase">AURA GRADIENT</span>
        </div>
        <div className="bg-white border-2 border-black p-2 shadow-[3px_3px_0px_#000] -rotate-1">
          <div className="relative h-28 border border-black mb-1 overflow-hidden">
            <Image src="/demo/nails/nail-5.jpg" alt="2" fill className="object-cover" />
          </div>
          <span className="text-[10px] font-black uppercase">CHROME STARS</span>
        </div>
        <div className="bg-white border-2 border-black p-2 shadow-[3px_3px_0px_#000] rotate-2 hidden sm:block">
          <div className="relative h-28 border border-black mb-1 overflow-hidden">
            <Image src="/demo/nails/nail-6.jpg" alt="3" fill className="object-cover" />
          </div>
          <span className="text-[10px] font-black uppercase">GEL DROPLETS</span>
        </div>
      </div>
    </div>
  );
}

// 18. Magic UI 3D Parallax Tilt Cards Gallery
export function GalleryMagicParallaxStack() {
  return (
    <div className="w-full bg-gradient-to-br from-neutral-950 via-zinc-900 to-black border border-white/10 p-6 text-white">
      <div className="flex justify-between items-center mb-4 font-mono text-xs">
        <span className="text-cyan-400 font-bold">FEATURED WORKS</span>
        <span className="text-neutral-500">INTERACTIVE PREVIEW</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative h-48 rounded-xl overflow-hidden border border-white/10 group shadow-xl">
          <Image src="/demo/wedding/wedding-1.jpg" alt="1" fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex items-end p-4">
            <div>
              <span className="text-sm font-bold block">Fjord Wedding Film</span>
              <span className="text-xs text-neutral-400 font-mono">Documentary Series</span>
            </div>
          </div>
        </div>
        <div className="relative h-48 rounded-xl overflow-hidden border border-white/10 group shadow-xl">
          <Image src="/demo/wedding/wedding-2.jpg" alt="2" fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex items-end p-4">
            <div>
              <span className="text-sm font-bold block">Evening Lanterns</span>
              <span className="text-xs text-neutral-400 font-mono">Raw Ambient Light</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 19. Luxury Fine Jewelry Gold Foil Gallery
export function GalleryLuxuryGoldJewels() {
  return (
    <div className="w-full bg-[#0a0a0c] border border-[#3b301c] p-5 text-[#d4af37]">
      <div className="text-center mb-4">
        <span className="text-[10px] font-serif tracking-[0.25em] uppercase text-[#8c7750]">
          ATELIER HIGH JEWELRY
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="relative h-44 border border-[#524125] p-1 bg-black">
          <Image src="/showcase/grillz/work-5.png" alt="Jewel 1" fill className="object-cover" />
        </div>
        <div className="relative h-44 border border-[#524125] p-1 bg-black">
          <Image src="/showcase/grillz/work-6.png" alt="Jewel 2" fill className="object-cover" />
        </div>
        <div className="relative h-44 border border-[#524125] p-1 bg-black">
          <Image src="/showcase/grillz/work-7.png" alt="Jewel 3" fill className="object-cover" />
        </div>
      </div>
    </div>
  );
}

// 20. Wedding 35mm Filmstrip Gallery (Documentary Photographers)
export function GalleryWedding35mmFilm() {
  return (
    <div className="w-full bg-[#201c18] border border-[#403830] p-4 text-[#ded8d0] font-mono text-xs">
      <div className="flex items-center gap-2 mb-2 text-[#998a7a] text-[10px]">
        <span>■ KODAK PORTRA 400</span>
        <span>·</span>
        <span>FRAME 18-21</span>
      </div>
      <div className="grid grid-cols-3 gap-1 bg-black p-2 border-y-2 border-dashed border-[#54483c]">
        <div className="relative h-32 overflow-hidden border border-neutral-800">
          <Image src="/demo/wedding/wedding-4.jpg" alt="Film 1" fill className="object-cover" />
        </div>
        <div className="relative h-32 overflow-hidden border border-neutral-800">
          <Image src="/demo/wedding/wedding-5.jpg" alt="Film 2" fill className="object-cover" />
        </div>
        <div className="relative h-32 overflow-hidden border border-neutral-800">
          <Image src="/demo/wedding/wedding-6.jpg" alt="Film 3" fill className="object-cover" />
        </div>
      </div>
    </div>
  );
}

// 21. Barber Fade Before/After Grid (Urban Barbershop)
export function GalleryBarberFadeGrid() {
  return (
    <div className="w-full bg-[#18181b] border-2 border-zinc-700 p-4 text-white font-mono">
      <div className="flex justify-between items-center mb-3 text-xs">
        <span className="font-bold text-[#ea580c]">FADE SPOTLIGHT</span>
        <span className="text-zinc-400">MID SKIN FADE + BEARD</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative h-48 border border-zinc-700 overflow-hidden">
          <Image src="/demo/nails/nail-1.jpg" alt="Cut 1" fill className="object-cover" />
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black text-[#ea580c] font-black text-[10px]">
            PROFILE VIEW
          </div>
        </div>
        <div className="relative h-48 border border-zinc-700 overflow-hidden">
          <Image src="/demo/nails/nail-2.jpg" alt="Cut 2" fill className="object-cover" />
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black text-[#ea580c] font-black text-[10px]">
            LINEUP DETAIL
          </div>
        </div>
      </div>
    </div>
  );
}

// 22. Botanical Pressed Herbarium Gallery (Florist & Plants)
export function GalleryBotanicalHerbarium() {
  return (
    <div className="w-full bg-[#f6f3eb] border border-[#d2c9b8] p-5 text-[#2c241b]">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["Wild Chamomile", "Alpine Pine", "Sweet Fern", "Nordic Lichen"].map((name, idx) => (
          <div key={name} className="bg-white border border-[#d2c9b8] p-2 text-center shadow-sm">
            <div className="relative h-28 border border-[#e8e2d5] mb-2 overflow-hidden">
              <Image src={`/demo/cakes/cake-${idx + 1}.jpg`} alt={name} fill className="object-cover" />
            </div>
            <span className="text-xs font-serif italic text-[#2c241b] block">{name}</span>
            <span className="text-[9px] font-mono text-[#8a7a66]">Specimen № 0{idx + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 23. Espresso Roast Polaroid Ledger (Specialty Coffee, Bakeries, Roasteries)
export function GalleryEspressoPolaroidStrip() {
  return (
    <div className="w-full bg-[#18110d] border border-[#3d2e25] p-5 text-[#f5ebe1] font-mono">
      <div className="flex justify-between items-center text-xs pb-3 border-b border-[#3d2e25] mb-4">
        <span className="text-[#d97706] font-bold">ROAST PROFILES // TASTING ARCHIVE</span>
        <span className="text-neutral-500 text-[10px]">ETHIOPIA &amp; COLOMBIA HARVEST</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { origin: "Yirgacheffe Kochere", note: "Jasmine, Peach & Honey", roast: "Light Filter" },
          { origin: "Huila Pink Bourbon", note: "Red Apple & Bergamot", roast: "Omni Roast" },
          { origin: "Antioquia Natural", note: "Dark Chocolate & Fig", roast: "Espresso" },
        ].map((item, i) => (
          <div key={item.origin} className="bg-[#281d17] border border-[#4a392e] p-3 rounded shadow-sm">
            <div className="relative h-32 bg-black/40 border border-[#4a392e] mb-3 overflow-hidden">
              <Image src={`/demo/cakes/cake-${i + 1}.jpg`} alt={item.origin} fill className="object-cover" />
              <span className="absolute bottom-1 right-1 bg-black/80 text-[#d97706] text-[9px] px-1.5 py-0.5">
                {item.roast}
              </span>
            </div>
            <span className="text-xs font-bold text-white block">{item.origin}</span>
            <p className="text-[10px] text-neutral-400 mt-0.5">{item.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 24. 70s Retro Sunset Vinyl Lookbook (Vintage Boutiques, Retro Salons)
export function GalleryRetroSunsetMosaic() {
  return (
    <div className="w-full bg-[#fff5f0] border-2 border-[#ffccba] p-5 text-[#2d1e2f] rounded-2xl">
      <div className="flex justify-between items-center mb-4">
        <span className="px-3 py-1 bg-[#ff5722] text-white text-xs font-bold rounded-full uppercase tracking-wider">
          SIDE A · SELECTION
        </span>
        <span className="text-xs font-mono text-[#9c27b0] font-bold">OSLO RETRO VAULT</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="relative h-36 rounded-xl overflow-hidden border-2 border-[#ff5722]">
          <Image src="/demo/wedding/portfolio-1.jpg" alt="Vintage 1" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
            <span className="text-white text-[10px] font-bold">1974 Silk Blazer</span>
          </div>
        </div>
        <div className="relative h-36 rounded-xl overflow-hidden border-2 border-[#9c27b0]">
          <Image src="/demo/wedding/portfolio-2.jpg" alt="Vintage 2" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
            <span className="text-white text-[10px] font-bold">Amber Acetate Shades</span>
          </div>
        </div>
        <div className="relative h-36 rounded-xl overflow-hidden border-2 border-[#ff5722] col-span-2 sm:col-span-1">
          <Image src="/demo/wedding/portfolio-3.jpg" alt="Vintage 3" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
            <span className="text-white text-[10px] font-bold">Italian Leather Hobo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

