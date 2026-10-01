"use client";

import React from "react";

const SERVICES = [
  { name: "Brows", desc: "Shape & Tint" },
  { name: "Lash Lifts", desc: "Keratin Curl" },
  { name: "Extensions", desc: "Volume & Classic" },
  { name: "Waxing", desc: "Face & Body" },
];

export default function ArtistProfileCard() {
  return (
    <section className="w-full max-w-sm mx-auto font-mono">
      <div className="border border-[#E8E4DD]">
        <div className="p-5 pb-4 border-b border-[#E8E4DD]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8B7766] mb-3">
            Meet Your Artist
          </p>
          <div className="flex gap-4">
            <div className="flex-1">
              <h3 className="text-base font-bold text-[#2B2B2B] leading-tight">
                Nadia K.
              </h3>
              <p className="text-xs text-[#8B7766] mt-1.5 leading-relaxed">
                Certified brow architect with 6 years of experience. 
                Precision mapping for every face shape, every time.
              </p>
            </div>
            <div className="w-20 h-20 bg-[#E8E4DD] flex-shrink-0 flex items-center justify-center text-[#8B7766] text-xs">
              PHOTO
            </div>
          </div>
        </div>

        <div className="p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8B7766] mb-3">
            Services
          </p>
          <div className="grid grid-cols-4 gap-2">
            {SERVICES.map((s) => (
              <div
                key={s.name}
                className="text-center py-3 px-1 bg-[#F5F3EE] border border-[#E8E4DD] hover:border-[#2B2B2B] transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 mx-auto bg-[#E8E4DD] mb-2 flex items-center justify-center text-[10px] text-[#8B7766]">
                  IMG
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2B2B2B] block">
                  {s.name}
                </span>
                <span className="text-[9px] text-[#8B7766] block mt-0.5">
                  {s.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-[#E8E4DD] text-[10px]">
          <div className="p-4 border-r border-[#E8E4DD]">
            <p className="font-bold uppercase tracking-wider text-[#2B2B2B] mb-2">
              Hours
            </p>
            <p className="text-[#8B7766]">Mon – Fri: 9:00 – 18:00</p>
            <p className="text-[#8B7766]">Sat: 11:00 – 18:00</p>
            <p className="text-[#8B7766]">Sun: Closed</p>
          </div>
          <div className="p-4">
            <p className="font-bold uppercase tracking-wider text-[#2B2B2B] mb-2">
              Location
            </p>
            <p className="text-[#8B7766]">Kirkeveien 48</p>
            <p className="text-[#8B7766]">Majorstuen, Oslo</p>
            <p className="text-[#8B7766]">0368</p>
          </div>
        </div>

        <div className="border-t border-[#E8E4DD] p-4 flex items-center justify-between text-[10px] text-[#8B7766]">
          <span>+47 912 34 567</span>
          <span>hello@browroom.no</span>
          <span>@browroom.oslo</span>
        </div>
      </div>
    </section>
  );
}
