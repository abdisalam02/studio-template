"use client";

import React from "react";
import { FiMapPin, FiClock, FiPhone, FiMail, FiInstagram, FiArrowUpRight, FiHeart } from "react-icons/fi";

// 01. Classic Editorial Footer
export function FooterClassicEditorial() {
  return (
    <footer className="w-full bg-[#fbf9f5] border-t border-neutral-300 p-6 sm:p-8 font-mono text-xs text-neutral-900">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-neutral-300">
        <div>
          <span className="font-heading font-black text-sm uppercase block mb-2 text-black">STUDIO LOCATION</span>
          <p className="text-neutral-600 leading-relaxed text-[11px]">
            Thorvald Meyers gate 42<br />
            0555 Grünerløkka, Oslo<br />
            Tram 11, 12, 18 to Birkelunden
          </p>
        </div>
        <div>
          <span className="font-heading font-black text-sm uppercase block mb-2 text-black">OPENING HOURS</span>
          <p className="text-neutral-600 leading-relaxed text-[11px]">
            Tuesday – Friday: 10:00 – 19:00<br />
            Saturday: 11:00 – 17:00<br />
            Sunday – Monday: Closed
          </p>
        </div>
        <div>
          <span className="font-heading font-black text-sm uppercase block mb-2 text-black">DIRECT CONTACT</span>
          <p className="text-neutral-600 leading-relaxed text-[11px]">
            booking@studioklo.no<br />
            +47 901 23 456<br />
            @studioklo.oslo
          </p>
        </div>
      </div>
      <div className="pt-4 flex flex-col sm:flex-row justify-between items-center text-[10px] text-neutral-500 gap-2">
        <span>© 2026 STUDIO KLØ OSLO · POWERED BY A.GURE</span>
        <span>NO RECURRING MONTHLY FEES</span>
      </div>
    </footer>
  );
}

// 02. Brutalist Map Coordinates Footer
export function FooterBrutalistMap() {
  return (
    <footer className="w-full bg-white border-2 border-black p-5 text-black font-mono text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b-2 border-black">
        <div>
          <div className="flex items-center gap-2 mb-2 font-black uppercase">
            <FiMapPin />
            <span>OSLO HEADQUARTERS // LAT 59.9139° N</span>
          </div>
          <p className="text-[11px] text-neutral-700">
            Bygg 4, Kvadraturen. Ring buzzer #12 for studio chair entry. 3 min walk from Stortinget T-bane.
          </p>
        </div>
        <div className="p-3 bg-[#fde047] border-2 border-black">
          <span className="font-black text-xs block mb-1">PARKING NOTICE:</span>
          <p className="text-[11px] text-black">
            Street parking available on Dronningens gate or Bankplassen p-hus (200m away).
          </p>
        </div>
      </div>
      <div className="pt-3 flex justify-between items-center text-[10px] font-bold">
        <span>SECURITY PROTOCOL: BY APPOINTMENT ONLY</span>
        <span className="underline cursor-pointer">OPEN GOOGLE MAPS →</span>
      </div>
    </footer>
  );
}

// 03. Warm Terracotta Studio Hours
export function FooterTerracottaHours() {
  return (
    <footer className="w-full bg-[#fbf7f2] border-t border-[#e4d7cb] p-6 text-[#2c221e] rounded-xl font-mono text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="font-serif italic text-base text-[#2c221e] block">Tierra Pottery Studio</span>
          <p className="text-xs text-[#705a4d] mt-1">Storgata 33, 0184 Oslo · Wheel workshops &amp; kiln firing</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-[#c25e3e] font-bold block">TUE – SAT: 11:00 – 18:00</span>
          <span className="text-[10px] text-[#8c7668]">hello@tierrastudio.no</span>
        </div>
      </div>
    </footer>
  );
}

// 04. French Patisserie Pickup Window
export function FooterPatisseriePickup() {
  return (
    <footer className="w-full bg-[#fdf5f7] border-t border-[#f5d9e3] p-6 text-[#541624] text-xs font-serif">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
        <div>
          <h4 className="font-bold text-sm tracking-wider uppercase text-[#8b263e]">Atelier Weekend Pickup</h4>
          <p className="text-xs text-[#783648] mt-1">Friday 14:00–18:00 &amp; Saturday 10:00–15:00 at our bakery counter.</p>
        </div>
        <button className="px-4 py-2 border border-[#c4788c] rounded text-[#541624] font-sans text-xs hover:bg-white">
          Get Pickup Directions
        </button>
      </div>
    </footer>
  );
}

// 05. Japanese Zen Spa Location
export function FooterWabiSabiLocation() {
  return (
    <footer className="w-full bg-[#f4f7f2] border-t border-[#d6e0d2] p-6 text-[#213123] font-mono text-xs">
      <div className="flex justify-between items-center">
        <div>
          <span className="font-serif text-sm block font-bold">Komorebi Rituals</span>
          <span className="text-[10px] text-[#557359]">Pilestredet 27 · Ring bell 3</span>
        </div>
        <div className="text-right text-[11px] text-[#3b543f]">
          <span>Silence requested upon entry.</span>
        </div>
      </div>
    </footer>
  );
}

// 06. Cyberpunk Terminal Coordinates
export function FooterCyberTerminalCoords() {
  return (
    <footer className="w-full bg-[#0a0a0d] border-t-2 border-[#bef264] p-5 text-white font-mono text-xs shadow-[0_0_20px_rgba(190,242,100,0.1)]">
      <div className="flex justify-between items-center">
        <span className="text-[#bef264] font-bold">LAB_099 // TORGGATA 18</span>
        <span className="text-zinc-500 text-[10px]">SYSTEM STATUS: ONLINE</span>
      </div>
    </footer>
  );
}

// 07. Neo-Brutalist Chunky Socials Footer
export function FooterNeoPopSocials() {
  return (
    <footer className="w-full bg-[#ede9fe] border-3 border-black p-5 text-black font-mono shadow-[4px_4px_0px_#000]">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <span className="font-black text-sm uppercase">✦ STAY IN TOUCH ✦</span>
        <div className="flex gap-2 text-xs font-bold">
          <span className="px-2 py-1 bg-[#fde047] border border-black cursor-pointer shadow-[2px_2px_0px_#000]">INSTAGRAM</span>
          <span className="px-2 py-1 bg-[#f43f5e] text-white border border-black cursor-pointer shadow-[2px_2px_0px_#000]">TIKTOK</span>
          <span className="px-2 py-1 bg-white border border-black cursor-pointer shadow-[2px_2px_0px_#000]">VIPPS</span>
        </div>
      </div>
    </footer>
  );
}

// 08. Magic UI Frosted Footer
export function FooterMagicGlowBottom() {
  return (
    <footer className="w-full bg-neutral-950 border-t border-white/10 p-6 text-white font-mono text-xs">
      <div className="flex justify-between items-center">
        <span className="text-neutral-400">© 2026 A.GURE · Built with Next.js 15 &amp; Tailwind</span>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="px-3 py-1 bg-white/10 rounded-full border border-white/10 hover:bg-white/20 text-cyan-400 text-[11px]"
        >
          Back to Top ↑
        </button>
      </div>
    </footer>
  );
}

// 09. Luxury Gold Noir Concierge Footer
export function FooterLuxuryGoldNoir() {
  return (
    <footer className="w-full bg-[#0a0a0d] border-t border-[#3b3221] p-6 text-[#d4af37] font-serif text-xs">
      <div className="text-center">
        <span className="tracking-[0.25em] text-[#998154] uppercase text-[10px] block mb-1">
          MAISON VALOIR · PRIVATE ATELIER
        </span>
        <p className="text-[#f5e8cd] text-xs">Rådhusgata 17, 0158 Oslo · Concierge: +47 22 00 00 00</p>
      </div>
    </footer>
  );
}

// 10. Wedding Inquiry Closing Footer
export function FooterWeddingInquiryClosing() {
  return (
    <footer className="w-full bg-[#faf7f2] border-t border-[#ded5c7] p-8 text-center text-[#2b2118]">
      <h3 className="font-serif italic text-2xl text-[#1f1710]">Let&apos;s capture your 2026 celebration.</h3>
      <p className="text-xs font-sans text-[#635142] mt-2 mb-4">Dates book out 6 to 12 months in advance.</p>
      <span className="font-mono text-xs font-bold underline cursor-pointer">hello@karinjohannes.no</span>
    </footer>
  );
}

// 11. Traditional Barbershop Walk-In Footer
export function FooterBarberWalkInBanner() {
  return (
    <footer className="w-full bg-[#18181b] border-t-2 border-zinc-700 p-5 text-white font-mono text-xs">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[#ea580c] font-black uppercase block">TORSHOV BARBER CLUB</span>
          <span className="text-zinc-400 text-[11px]">Vogts gate 55 · Tram 11, 12, 13</span>
        </div>
        <span className="px-3 py-1 bg-white text-black font-bold uppercase">WALK-IN OR BOOK</span>
      </div>
    </footer>
  );
}

// 12. Botanical Storefront Footer
export function FooterBotanicalStorefront() {
  return (
    <footer className="w-full bg-[#f6f2e8] border-t border-[#d2c7b4] p-5 text-[#30281e] font-mono text-xs">
      <div className="flex justify-between items-center">
        <span className="font-serif italic font-bold">Korn &amp; Blomst</span>
        <span className="text-[#7d6c56]">Doorstep delivery in Oslo Zone 1 every Friday</span>
      </div>
    </footer>
  );
}

// 13. Mobile Quick-Dial Contact Dock
export function FooterOneTapActionDock() {
  return (
    <div className="w-full p-2 bg-neutral-100 border border-neutral-300 flex justify-center">
      <div className="w-full max-w-sm bg-white border border-neutral-300 p-2 flex justify-around font-mono text-xs rounded-xl shadow-sm">
        <button className="flex items-center gap-1.5 p-2 text-black font-bold">
          <FiPhone className="text-sm" /><span>Call</span>
        </button>
        <button className="flex items-center gap-1.5 p-2 text-black font-bold">
          <FiMapPin className="text-sm" /><span>Map</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white font-bold rounded-lg">
          <span>Book Now</span>
        </button>
      </div>
    </div>
  );
}

// 14. Minimalist Single Line Footer
export function FooterMinimalistSingleLine() {
  return (
    <footer className="w-full bg-white border-t border-neutral-200 py-4 px-6 flex justify-between items-center font-mono text-[11px] text-neutral-500">
      <span>A.GURE // INDEPENDENT WEB DEVELOPER · OSLO</span>
      <span className="text-black font-bold hover:underline cursor-pointer">hello@agure.space</span>
    </footer>
  );
}

// 15. Espresso Roastery & Cafe Hours Footer (Specialty Coffee & Bakery)
export function FooterEspressoRoastery() {
  return (
    <footer className="w-full bg-[#18110d] border-t border-[#3d2e25] p-6 sm:p-8 font-mono text-xs text-[#f5ebe1]">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-[#3d2e25]">
        <div>
          <span className="text-[#d97706] font-bold text-xs uppercase block mb-2">BREW BAR &amp; ROASTERY</span>
          <p className="text-neutral-400 text-[11px] leading-relaxed">
            Markveien 56, Grünerløkka<br />
            0554 Oslo, Norway<br />
            Tram 11 / 12 / 18 to Olaf Ryes Plass
          </p>
        </div>
        <div>
          <span className="text-[#d97706] font-bold text-xs uppercase block mb-2">BARISTA HOURS</span>
          <p className="text-neutral-400 text-[11px] leading-relaxed">
            Tuesday – Friday: 07:30 – 16:30<br />
            Saturday – Sunday: 09:00 – 17:00<br />
            Monday: Closed for Roasting
          </p>
        </div>
        <div>
          <span className="text-[#d97706] font-bold text-xs uppercase block mb-2">WHOLESALE &amp; BEANS</span>
          <p className="text-neutral-400 text-[11px] leading-relaxed">
            kaffe@osloroasters.no<br />
            Fresh roasts shipped nationwide every Wednesday.
          </p>
        </div>
      </div>
      <div className="pt-4 flex justify-between items-center text-[10px] text-neutral-500">
        <span>© 2026 OSLO COFFEE ROASTERS</span>
        <span className="text-[#d97706]">BATCH-ROASTED WEEKLY</span>
      </div>
    </footer>
  );
}

// 16. Solar Amber Industrial Workshop Terminal (Fabrication, Motors, Metal)
export function FooterSolarAmberTerminal() {
  return (
    <footer className="w-full bg-[#1c1917] border-t-2 border-[#f59e0b] p-6 text-[#fafaf9] font-mono text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-[#44403c]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-[#f59e0b]" />
            <span className="font-black text-sm uppercase text-white tracking-tight">OSLO FABRICATION DOCK</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Kabelgata 10, Økern Industrial Park · Gate 3 Loading Dock
          </p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[#f59e0b] font-bold block text-[11px]">SHOP ACTIVE // VISITS BY APPOINTMENT</span>
          <span className="text-neutral-500 text-[10px]">DIRECT: workshop@oslofab.no</span>
        </div>
      </div>
      <div className="pt-3 flex justify-between items-center text-[10px] text-neutral-500">
        <span>ISO 9001 WORKSHOP STANDARDS</span>
        <span>SECURITY BUZZER: #041</span>
      </div>
    </footer>
  );
}

