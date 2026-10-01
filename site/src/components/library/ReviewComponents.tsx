"use client";

import React from "react";
import Image from "next/image";
import { FiStar, FiCheck, FiInstagram, FiHeart, FiMessageCircle } from "react-icons/fi";

// 01. Instagram DM Chat Bubble
export function ReviewInstaDmCard() {
  return (
    <div className="w-full bg-[#111113] border border-neutral-800 p-5 rounded-xl font-sans text-white text-xs">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-800">
        <FiInstagram className="text-pink-500" />
        <span className="font-bold">@marielind.oslo</span>
        <span className="text-[10px] text-neutral-500 ml-auto">Direct Message · 2h ago</span>
      </div>
      <div className="space-y-2">
        <div className="bg-neutral-800 p-3 rounded-2xl rounded-tl-sm max-w-xs text-neutral-200 text-[11px] leading-relaxed">
          &quot;Omg honestly the best nails I have ever had in Oslo. It has been 5 weeks and there is literally ZERO lifting! Getting compliments every day.&quot;
        </div>
        <div className="flex items-center gap-1 text-[10px] text-neutral-500 pl-2">
          <span>Seen</span>
        </div>
      </div>
    </div>
  );
}

// 02. Google 5.0 Star Rating Banner
export function ReviewGoogleRatingBanner() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-neutral-900">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center font-bold text-base">
          G
        </div>
        <div>
          <div className="flex items-center gap-1 text-amber-500 text-xs">
            <FiStar className="fill-amber-500" />
            <FiStar className="fill-amber-500" />
            <FiStar className="fill-amber-500" />
            <FiStar className="fill-amber-500" />
            <FiStar className="fill-amber-500" />
            <span className="font-black text-black ml-1">5.0</span>
          </div>
          <span className="text-[10px] text-neutral-500">Based on 148 verified client reviews</span>
        </div>
      </div>
      <div className="text-right text-[11px] text-neutral-600 sm:max-w-xs">
        &quot;Super easy to book, clear prices, and the studio space is so peaceful.&quot;
      </div>
    </div>
  );
}

// 03. Classic Editorial Quote
export function ReviewEditorialQuotes() {
  return (
    <div className="w-full bg-[#fdfbf7] border border-[#e8dfd3] p-6 text-center text-[#2b221a]">
      <span className="text-3xl font-serif text-[#c25e3e] leading-none block mb-1">“</span>
      <p className="font-serif italic text-base sm:text-lg text-[#1f1712] max-w-md mx-auto leading-relaxed">
        The photos made us cry happy tears. They captured moments we didn’t even realize happened during the ceremony.
      </p>
      <div className="mt-3 text-xs font-mono text-[#8a7664]">
        — Ingrid &amp; Mathias · Villa Eckbo Wedding
      </div>
    </div>
  );
}

// 04. Brutalist Hard Outline Review
export function ReviewBrutalistBox() {
  return (
    <div className="w-full bg-white border-2 border-black p-4 font-mono text-xs text-black">
      <div className="flex justify-between items-center pb-2 border-b-2 border-black mb-2">
        <span className="font-black uppercase">CLIENT DISPATCH #112</span>
        <span className="bg-black text-white px-1.5 py-0.5 text-[10px] font-bold">VERIFIED VIPPS</span>
      </div>
      <p className="text-[11px] leading-relaxed text-neutral-800">
        &quot;No more endless back-and-forth DMs asking &apos;what are your prices?&apos;. My clients just pick their set and pay deposits directly.&quot;
      </p>
      <div className="mt-2 text-[10px] font-bold text-neutral-500 uppercase">
        — LINA K. · INDEPENDENT LASH &amp; NAIL ARTIST
      </div>
    </div>
  );
}

// 05. Warm Terracotta Pottery Feedback
export function ReviewTerracottaCard() {
  return (
    <div className="w-full bg-[#fbf7f2] border border-[#e3d7cb] p-5 rounded-xl text-[#2c221e]">
      <div className="flex items-center gap-2 mb-2 text-[#c25e3e] text-xs">
        <FiHeart className="fill-[#c25e3e]" />
        <span className="font-mono text-[10px] font-bold uppercase">WORKSHOP ATTENDEE</span>
      </div>
      <p className="font-serif italic text-sm text-[#2c221e] leading-relaxed">
        &quot;Such a calm, tactile experience. The studio smells like wild clay and fresh eucalyptus. The coffee cups we made are our daily favorites.&quot;
      </p>
      <div className="mt-3 text-xs font-mono text-[#7d6859]">
        Sunniva · Saturday 4-Seat Workshop
      </div>
    </div>
  );
}

// 06. French Patisserie Cake Review
export function ReviewPatisserieSweet() {
  return (
    <div className="w-full bg-[#fdf5f7] border border-[#f5d9e3] p-5 rounded-md text-[#541624]">
      <div className="flex items-center gap-1 text-amber-500 text-xs mb-2">
        <FiStar className="fill-amber-400" /><FiStar className="fill-amber-400" /><FiStar className="fill-amber-400" /><FiStar className="fill-amber-400" /><FiStar className="fill-amber-400" />
      </div>
      <p className="font-serif text-sm leading-relaxed text-[#541624]">
        &quot;Not only was the Lambeth piping breathtaking in photos, but the pistachio curd was completely devoured. Our guests wouldn&apos;t stop talking about it!&quot;
      </p>
      <span className="text-xs font-mono text-[#8a384e] block mt-2 font-bold">
        — Celine &amp; Thomas · 3-Tier Summer Wedding
      </span>
    </div>
  );
}

// 07. Japanese Zen Sage Review
export function ReviewWabiSabiCalm() {
  return (
    <div className="w-full bg-[#f4f7f2] border-l-4 border-[#3e5642] p-5 text-[#213123]">
      <p className="font-serif italic text-sm leading-relaxed text-[#1e2e21]">
        &quot;My natural nails were paper thin after years of salon drills. After three visits here, my natural nail plates are completely healthy and strong.&quot;
      </p>
      <div className="mt-2 text-xs font-mono text-[#557359]">
        Client since October 2025 · BIAB Restoration
      </div>
    </div>
  );
}

// 08. Cyberpunk Tech Review Badge
export function ReviewCyberpunkTag() {
  return (
    <div className="w-full bg-[#0a0a0d] border border-[#bef264]/40 p-4 text-white font-mono text-xs shadow-[0_0_15px_rgba(190,242,100,0.1)]">
      <div className="flex justify-between text-[#bef264] text-[10px] pb-1 border-b border-zinc-800 mb-2">
        <span>VERIFIED_WEARER // #084</span>
        <span>10/10 PRECISION FIT</span>
      </div>
      <p className="text-zinc-300 text-[11px] leading-relaxed">
        &quot;The optical scan meant zero painful tooth molds. Snapped onto my canine perfectly with zero adhesive. Solid craftsmanship.&quot;
      </p>
    </div>
  );
}

// 09. Neo-Brutalist Sticker Review
export function ReviewNeoPopStickerReview() {
  return (
    <div className="w-full bg-[#fde047] border-3 border-black p-4 text-black font-mono shadow-[4px_4px_0px_#000]">
      <div className="flex justify-between items-center mb-1">
        <span className="bg-[#a855f7] text-white px-2 py-0.5 border border-black font-black text-[10px] uppercase">
          ★ 5-STAR VIBES
        </span>
        <span className="font-bold text-xs">@emilie_k</span>
      </div>
      <p className="text-xs font-bold mt-2">
        &quot;BEST NAIL SET OF MY ENTIRE LIFE. The aura gradient with 3D chrome drops is unreal.&quot;
      </p>
    </div>
  );
}

// 10. Magic UI Frosted Testimonial
export function ReviewMagicGlowTestimonial() {
  return (
    <div className="w-full bg-neutral-900/80 backdrop-blur-xl border border-cyan-500/30 p-5 rounded-2xl text-white font-mono text-xs shadow-[0_0_20px_rgba(6,182,212,0.15)]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-500 p-0.5">
          <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center font-bold text-cyan-400">
            SL
          </div>
        </div>
        <div>
          <span className="font-bold text-white block">Sofia Lind</span>
          <span className="text-[10px] text-cyan-300">Bi-Weekly Client</span>
        </div>
      </div>
      <p className="text-neutral-300 text-[11px] leading-relaxed">
        &quot;The booking site works so smoothly on my phone. 10 seconds and I have my slot locked.&quot;
      </p>
    </div>
  );
}

// 11. Before / After Feedback Proof
export function ReviewBeforeAfterFeedback() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-4 font-mono text-xs text-neutral-900">
      <div className="flex gap-4 items-center">
        <div className="relative w-20 h-20 rounded border border-neutral-300 overflow-hidden flex-shrink-0">
          <Image src="/demo/nails/nail-2.jpg" alt="Review" fill className="object-cover" />
        </div>
        <div>
          <span className="text-xs font-bold text-black block">4-Week Retention Check</span>
          <p className="text-[11px] text-neutral-600 mt-1 leading-snug">
            &quot;Zero chips after a 2-week holiday in Greece. Still looks fresh!&quot;
          </p>
          <span className="text-[10px] text-neutral-500 block mt-1">— Helene B.</span>
        </div>
      </div>
    </div>
  );
}

// 12. Infinite Review Marquee Ribbon
export function ReviewMarqueeTickerReviews() {
  return (
    <div className="w-full bg-black text-white py-2 px-4 border border-black font-mono text-xs overflow-hidden">
      <div className="whitespace-nowrap animate-marquee flex gap-6">
        <span>★ 5.0 &quot;FLAWLESS FRENCH NAILS&quot; — ANJA M.</span>
        <span>★ 5.0 &quot;SAVED MY WEDDING TIMELINE&quot; — SARA &amp; ERIK</span>
        <span>★ 5.0 &quot;NO MORE INSTA DMs TO BOOK&quot; — STUDIO KLØ</span>
        <span>★ 5.0 &quot;SUPERIOR CHROME FINISH&quot; — KASPER</span>
      </div>
    </div>
  );
}

// 13. Barber Chair Customer Shoutout
export function ReviewBarberChop() {
  return (
    <div className="w-full bg-[#18181b] border-2 border-zinc-700 p-4 text-white font-mono text-xs">
      <div className="flex justify-between text-[#ea580c] font-black uppercase text-[10px] mb-2">
        <span>TORSHOV BARBER CLUB</span>
        <span>REGULAR CUSTOMER</span>
      </div>
      <p className="text-zinc-300 text-[11px] leading-relaxed">
        &quot;Best skin fade in Oslo. Hot towel shave is legendary. Booking online takes 15 seconds.&quot;
      </p>
      <span className="text-zinc-500 text-[10px] block mt-2">— Jonas T., Oslo</span>
    </div>
  );
}

// 14. Vipps Verified Receipt Review
export function ReviewVippsVerifiedSlip() {
  return (
    <div className="w-full bg-white border border-neutral-300 p-4 font-mono text-xs text-neutral-900 shadow-sm">
      <div className="flex justify-between items-center pb-2 border-b border-neutral-200 mb-2">
        <span className="font-bold text-[#ff5b24]">VIPPS VERIFIED BOOKING</span>
        <span className="text-[10px] text-neutral-500">250 KR DEPOSIT CONFIRMED</span>
      </div>
      <p className="text-[11px] text-neutral-700">
        &quot;I booked at midnight while lying in bed. Instant confirmation email and SMS pass. So seamless!&quot;
      </p>
    </div>
  );
}

// 15. Dark Botanical Herbalist Testimonial (Apothecary & Botanical Tattoo)
export function ReviewDarkBotanicalPraise() {
  return (
    <div className="w-full bg-[#07130e] border border-[#1d3b30] p-5 text-[#e4efea] font-mono text-xs">
      <div className="flex justify-between items-center pb-2 border-b border-[#1d3b30] mb-3">
        <span className="text-[#c4975a] font-bold text-[10px] uppercase flex items-center gap-1.5">
          <span>🌿 VERIFIED BOTANICAL CLIENT</span>
        </span>
        <span className="text-[10px] text-neutral-500">BATCH 09 VISITOR</span>
      </div>
      <p className="font-serif italic text-sm text-neutral-200 leading-relaxed">
        &quot;The juniper facial ritual completely transformed my skin texture. The studio smells like wild Nordmarka pine and calm.&quot;
      </p>
      <div className="mt-3 flex justify-between items-center text-[10px] text-neutral-400">
        <span>Amalie H. · Grünerløkka</span>
        <span className="text-[#c4975a]">★★★★★ 5.0</span>
      </div>
    </div>
  );
}

// 16. Peach Cloud K-Beauty Direct Feedback (Lash & Brow Spas)
export function ReviewPeachCloudDM() {
  return (
    <div className="w-full bg-[#fff7f3] border border-[#fcd5c5] p-5 rounded-2xl text-[#431407] text-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-full bg-[#feece2] border border-[#fcd5c5] flex items-center justify-center font-bold text-xs text-[#fb7185]">
          🌸
        </span>
        <div>
          <span className="font-bold block text-[#431407]">Elena V. (@elena.beauty)</span>
          <span className="text-[10px] text-[#fb7185] font-mono">VERIFIED LASH LIFT &amp; TINT</span>
        </div>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#feece2] text-[#fb7185] font-bold font-mono">
          5.0 ★
        </span>
      </div>
      <div className="p-3 bg-white rounded-xl border border-[#fcd5c5]/60 text-[#431407] text-[11px] leading-relaxed shadow-sm">
        &quot;My lash lift usually falls after 3 weeks but here it lasted a full 7 weeks! The studio is like a pink cloud heaven.&quot;
      </div>
    </div>
  );
}

