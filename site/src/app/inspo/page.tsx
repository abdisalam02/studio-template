"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import inspoData from "@/data/inspo-index.json";
import { FiSearch, FiX, FiCopy, FiCheck, FiArrowRight, FiZap, FiHash } from "react-icons/fi";

import WeeklyAvailabilityTicker from "@/components/library/extracted/WeeklyAvailabilityTicker";
import EditorialGridBooking from "@/components/library/extracted/EditorialGridBooking";
import ArtistProfileCard from "@/components/library/extracted/ArtistProfileCard";
import NewspaperPolicyGrid from "@/components/library/extracted/NewspaperPolicyGrid";

type InspoItem = {
  id: string;
  title: string;
  file: string;
  niche: string;
  componentType: string;
  aesthetic: string;
  palette: string[];
  layoutNotes: string;
  uxFeatures: string[];
  suggestedPrompt: string;
};

const items = inspoData as InspoItem[];

const EXTRACTED_MAP: Record<
  string,
  { name: string; category: string; component: React.ComponentType }
> = {
  "704461566760527104_sp0_b0.jpg": {
    name: "Weekly Availability Ticker",
    category: "BOOKING",
    component: WeeklyAvailabilityTicker,
  },
  "704461566760527113_sp0_b0.jpg": {
    name: "Editorial Grid Booking",
    category: "BOOKING",
    component: EditorialGridBooking,
  },
  "704461566760527119.jpg": {
    name: "Artist Profile Card",
    category: "BIO",
    component: ArtistProfileCard,
  },
  "704461566760527122_sp0_b0.jpg": {
    name: "Newspaper Policy Grid",
    category: "POLICIES",
    component: NewspaperPolicyGrid,
  },
};

const NICHES = [
  "all",
  "nails",
  "hair",
  "brows-lashes",
  "skincare-clinic",
  "cakes",
  "creative-studio",
  "fitness",
  "general",
] as const;

const COMPONENT_TYPES = [
  "all",
  "hero",
  "booking-availability",
  "price-list",
  "artist-bio",
  "policies",
  "lookbook-grid",
  "full-page",
  "services-menu",
  "contact-form",
  "testimonials",
  "about-section",
  "product-showcase",
  "navigation",
  "footer",
] as const;

const AESTHETICS = [
  "all",
  "scandinavian-clean",
  "luxury-editorial",
  "y2k-pop",
  "warm-organic",
  "retro-newspaper",
  "minimal-mono",
  "dark-luxury",
  "soft-feminine",
] as const;

function Pill({
  label,
  active,
  onClick,
  accent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[10px] font-mono whitespace-nowrap transition-all flex-shrink-0 uppercase tracking-wider ${
        active
          ? accent
            ? "bg-[#C86D51] text-white font-bold"
            : "bg-foreground text-background font-bold"
          : accent
          ? "border border-[#C86D51]/50 text-[#C86D51] hover:bg-[#C86D51]/10 font-bold"
          : "border border-card-border text-muted hover:text-foreground hover:border-foreground"
      }`}
    >
      {label.replace(/-/g, " ")}
    </button>
  );
}

function InspectModal({
  item,
  onClose,
}: {
  item: InspoItem;
  onClose: () => void;
}) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [viewTab, setViewTab] = useState<"reference" | "component">("reference");

  const extracted = EXTRACTED_MAP[item.file];
  const ExtractedComponent = extracted?.component;

  const copyPrompt = useCallback(() => {
    navigator.clipboard.writeText(item.suggestedPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  }, [item.suggestedPrompt]);

  const copyId = useCallback(() => {
    navigator.clipboard.writeText(item.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }, [item.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-background border border-card-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-background border-b border-card-border p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                {item.niche} · {item.componentType} · {item.aesthetic}
              </span>
              {extracted && (
                <span className="px-1.5 py-0.2 bg-[#C86D51] text-white text-[8px] font-mono font-bold uppercase">
                  ⚡ EXTRACTED
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-heading text-foreground">
                {item.title}
              </h3>
              <button
                onClick={copyId}
                className="px-2 py-0.5 border border-card-border text-[10px] font-mono text-muted hover:text-foreground hover:border-foreground transition-colors flex items-center gap-1"
                title="Copy reference ID to paste in chat"
              >
                <FiHash size={10} />
                <span>{item.id}</span>
                {copiedId ? <FiCheck size={10} className="text-emerald-500" /> : <FiCopy size={9} />}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-foreground"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* View Switcher if component was extracted */}
        {extracted && (
          <div className="flex border-b border-card-border bg-card/60 px-4 py-2 gap-2">
            <button
              onClick={() => setViewTab("reference")}
              className={`px-3 py-1 text-xs font-mono uppercase font-bold transition-all ${
                viewTab === "reference"
                  ? "bg-foreground text-background"
                  : "border border-card-border text-muted hover:text-foreground"
              }`}
            >
              Pin Reference Photo
            </button>
            <button
              onClick={() => setViewTab("component")}
              className={`px-3 py-1 text-xs font-mono uppercase font-bold transition-all flex items-center gap-1.5 ${
                viewTab === "component"
                  ? "bg-[#C86D51] text-white"
                  : "border border-[#C86D51]/50 text-[#C86D51] hover:bg-[#C86D51]/10"
              }`}
            >
              <FiZap size={12} />
              <span>Live Extracted Component</span>
            </button>
          </div>
        )}

        <div className="p-4 sm:p-6">
          {viewTab === "component" && ExtractedComponent ? (
            <div className="mb-6 space-y-4">
              <div className="p-3 border border-[#C86D51]/30 bg-[#C86D51]/5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono font-bold uppercase text-[#C86D51] tracking-wider block">
                    CODE REPRODUCTION READY
                  </span>
                  <span className="text-sm font-bold font-mono text-foreground">
                    {extracted.name}
                  </span>
                </div>
                <Link
                  href="/library"
                  className="px-3 py-1 bg-foreground text-background text-xs font-mono font-bold uppercase hover:opacity-90 flex items-center gap-1"
                >
                  <span>UI Vault</span>
                  <FiArrowRight size={12} />
                </Link>
              </div>

              <div className="p-6 border border-card-border bg-card/80 flex items-center justify-center overflow-x-auto min-h-[220px]">
                <div className="w-full">
                  <ExtractedComponent />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full aspect-[3/4] sm:aspect-auto sm:h-[500px] bg-card border border-card-border mb-6">
              <Image
                src={`/abdisalamqlayout/${item.file}`}
                alt={item.layoutNotes}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 700px"
              />
            </div>
          )}

          <div className="space-y-5">
            <div>
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted mb-2">
                Color Palette
              </h4>
              <div className="flex gap-2 flex-wrap">
                {item.palette.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => navigator.clipboard.writeText(hex)}
                    className="group flex items-center gap-1.5 border border-card-border px-2 py-1 hover:border-foreground transition-colors"
                    title={`Copy ${hex}`}
                  >
                    <span
                      className="w-4 h-4 border border-black/10 flex-shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-[10px] font-mono text-foreground">
                      {hex}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5">
                Layout Breakdown
              </h4>
              <p className="text-xs text-foreground leading-relaxed">
                {item.layoutNotes}
              </p>
            </div>

            <div>
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted mb-2">
                UX Features
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {item.uxFeatures.map((f) => (
                  <span
                    key={f}
                    className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 bg-foreground/5 text-foreground border border-card-border"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-card-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted">
                  AI Prompt
                </h4>
                <button
                  onClick={copyPrompt}
                  className="flex items-center gap-1 text-[10px] font-mono text-muted hover:text-foreground transition-colors"
                >
                  {copiedPrompt ? (
                    <>
                      <FiCheck size={10} /> Copied
                    </>
                  ) : (
                    <>
                      <FiCopy size={10} /> Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-foreground leading-relaxed bg-card border border-card-border p-3 font-mono">
                {item.suggestedPrompt}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InspoVaultPage() {
  const [niche, setNiche] = useState("all");
  const [componentType, setComponentType] = useState("all");
  const [aesthetic, setAesthetic] = useState("all");
  const [search, setSearch] = useState("");
  const [showExtractedOnly, setShowExtractedOnly] = useState(false);
  const [inspecting, setInspecting] = useState<InspoItem | null>(null);

  // Auto-open pin if deep linked by file or ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pinParam = params.get("pin");
      if (pinParam) {
        const match = items.find((i) => i.file === pinParam || i.id === pinParam);
        if (match) setInspecting(match);
      }
    }
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (showExtractedOnly && !EXTRACTED_MAP[item.file]) return false;
      if (niche !== "all" && item.niche !== niche) return false;
      if (componentType !== "all" && item.componentType !== componentType)
        return false;
      if (aesthetic !== "all" && item.aesthetic !== aesthetic) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${item.title} ${item.id} ${item.niche} ${item.componentType} ${item.aesthetic} ${item.layoutNotes} ${item.uxFeatures.join(" ")} ${item.suggestedPrompt}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [showExtractedOnly, niche, componentType, aesthetic, search]);

  const nicheCounts = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach((i) => {
      m[i.niche] = (m[i.niche] || 0) + 1;
    });
    return m;
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-card-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <Link
                href="/library"
                className="font-heading font-black text-sm tracking-tight hover:opacity-80"
              >
                A.GURE
              </Link>
              <span className="text-muted text-xs">/</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider hidden sm:inline">
                Inspo Vault
              </span>
              <span className="px-2 py-0.5 bg-foreground text-background text-[10px] font-mono font-bold">
                {items.length} PINS
              </span>
              <Link
                href="/library"
                className="px-2 py-0.5 border border-card-border text-[10px] font-mono font-bold uppercase text-muted hover:text-foreground hover:border-foreground transition-colors hidden sm:inline"
              >
                ← Back to UI Vault
              </Link>
              <span className="text-muted text-xs hidden lg:inline">·</span>
              <span className="text-xs font-mono text-muted hidden lg:inline">
                {filtered.length} showing
              </span>
            </div>

            <div className="relative w-full max-w-[200px] sm:max-w-[260px]">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs" />
              <input
                type="text"
                placeholder="Search inspo (e.g. pilates, nail, id)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-7 py-1.5 border border-card-border bg-card text-foreground font-mono text-xs outline-none focus:border-foreground"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            {/* Quick Filter Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[9px] font-mono text-muted uppercase font-bold flex-shrink-0 mr-1 hidden sm:inline">
                Focus:
              </span>
              <Pill
                label="All (61)"
                active={!showExtractedOnly && niche === "all" && componentType === "all" && aesthetic === "all"}
                onClick={() => {
                  setShowExtractedOnly(false);
                  setNiche("all");
                  setComponentType("all");
                  setAesthetic("all");
                }}
              />
              <Pill
                label="⚡ Extracted to React (4)"
                active={showExtractedOnly}
                onClick={() => setShowExtractedOnly(!showExtractedOnly)}
                accent
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-t border-card-border/40">
              <span className="text-[9px] font-mono text-muted uppercase font-bold flex-shrink-0 mr-1 hidden sm:inline">
                Niche:
              </span>
              {NICHES.map((n) => (
                <Pill
                  key={n}
                  label={
                    n === "all" ? "All Niches" : `${n}${nicheCounts[n] ? ` (${nicheCounts[n]})` : ""}`
                  }
                  active={niche === n}
                  onClick={() => setNiche(n)}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-t border-card-border/40">
              <span className="text-[9px] font-mono text-muted uppercase font-bold flex-shrink-0 mr-1 hidden sm:inline">
                Type:
              </span>
              {COMPONENT_TYPES.map((t) => (
                <Pill
                  key={t}
                  label={t}
                  active={componentType === t}
                  onClick={() => setComponentType(t)}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-t border-card-border/40">
              <span className="text-[9px] font-mono text-muted uppercase font-bold flex-shrink-0 mr-1 hidden sm:inline">
                Vibe:
              </span>
              {AESTHETICS.map((a) => (
                <Pill
                  key={a}
                  label={a}
                  active={aesthetic === a}
                  onClick={() => setAesthetic(a)}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        {filtered.length === 0 ? (
          <div className="w-full py-20 text-center border border-dashed border-card-border font-mono text-xs text-muted">
            No inspo matches your filters.
            <br />
            <button
              onClick={() => {
                setShowExtractedOnly(false);
                setNiche("all");
                setComponentType("all");
                setAesthetic("all");
                setSearch("");
              }}
              className="mt-4 px-4 py-2 border border-foreground text-foreground font-bold uppercase"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="columns-2 lg:columns-3 gap-4 space-y-4">
            {filtered.map((item) => {
              const isExtracted = Boolean(EXTRACTED_MAP[item.file]);
              return (
                <div
                  key={item.file}
                  className={`break-inside-avoid cursor-pointer group border transition-all bg-card ${
                    isExtracted
                      ? "border-[#C86D51] ring-1 ring-[#C86D51]/30 hover:ring-[#C86D51]"
                      : "border-card-border hover:border-foreground"
                  }`}
                  onClick={() => setInspecting(item)}
                >
                  <div className="relative w-full overflow-hidden">
                    <Image
                      src={`/abdisalamqlayout/${item.file}`}
                      alt={item.title}
                      width={400}
                      height={600}
                      className="w-full h-auto"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                    {isExtracted && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#C86D51] text-white text-[9px] font-mono font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <FiZap size={10} />
                        <span>EXTRACTED</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="font-heading font-bold text-xs text-foreground truncate">
                        {item.title}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono text-muted mb-2">
                      <span className="truncate">#{item.id}</span>
                      <span className="uppercase">{item.aesthetic}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 mb-2">
                      <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-foreground text-background font-bold">
                        {item.niche}
                      </span>
                      <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-card-border text-muted">
                        {item.componentType}
                      </span>
                      {isExtracted && (
                        <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 text-[#C86D51] font-bold">
                          ⚡ React Code
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {item.palette.slice(0, 5).map((hex) => (
                        <span
                          key={hex}
                          className="w-3 h-3 border border-black/10 flex-shrink-0"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {inspecting && (
        <InspectModal
          item={inspecting}
          onClose={() => setInspecting(null)}
        />
      )}
    </main>
  );
}
