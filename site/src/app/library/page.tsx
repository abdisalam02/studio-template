"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { UI_COMPONENTS_REGISTRY } from "@/components/library/registry";
import { ComponentCard } from "@/components/library/ComponentCard";
import { ComponentCategory, AestheticVibe } from "@/components/library/types";
import { THEME_PALETTES } from "@/components/library/palettes";
import { 
  FiSearch, 
  FiFilter, 
  FiLayers, 
  FiGrid, 
  FiSun, 
  FiMoon, 
  FiCheck, 
  FiX, 
  FiArrowUp,
  FiShare2,
  FiCode,
  FiEye,
  FiStar,
  FiChevronDown,
  FiChevronUp,
  FiZap
} from "react-icons/fi";
import WeeklyAvailabilityTicker from "@/components/library/extracted/WeeklyAvailabilityTicker";
import EditorialGridBooking from "@/components/library/extracted/EditorialGridBooking";
import ArtistProfileCard from "@/components/library/extracted/ArtistProfileCard";
import NewspaperPolicyGrid from "@/components/library/extracted/NewspaperPolicyGrid";

const CATEGORIES: { id: ComponentCategory; label: string; count: number }[] = [
  { id: "all", label: "ALL COMPONENTS", count: 197 },
  { id: "navs", label: "NAVIGATIONS", count: 26 },
  { id: "heroes", label: "HEADERS & HEROES", count: 27 },
  { id: "titles", label: "TITLES & TYPOGRAPHY", count: 24 },
  { id: "galleries", label: "IMAGE GALLERIES", count: 24 },
  { id: "dropdowns", label: "ACCORDIONS & DROPDOWNS", count: 22 },
  { id: "pricing", label: "PRICING & MENUS", count: 19 },
  { id: "reviews", label: "REVIEWS & SOCIAL PROOF", count: 16 },
  { id: "booking", label: "BOOKING & CTAs", count: 23 },
  { id: "footers", label: "LOCATION & FOOTERS", count: 16 },
];

const AESTHETIC_VIBES: { id: AestheticVibe; dotColor?: string }[] = [
  { id: "All" },
  { id: "Terracotta / Earthy", dotColor: "#C86D51" },
  { id: "Patisserie / Pastel", dotColor: "#E07A8A" },
  { id: "Wabi-Sabi / Sage", dotColor: "#5B7059" },
  { id: "Cyber Chrome / Dark", dotColor: "#00F0FF" },
  { id: "Neo-Brutalist / Pop", dotColor: "#CCFF00" },
  { id: "Luxury Atelier / Gold", dotColor: "#D4AF37" },
  { id: "Editorial / Print", dotColor: "#B83A2E" },
  { id: "Modern Magic / Glow", dotColor: "#8B5CF6" },
  { id: "Artisan / Linen", dotColor: "#8C7355" },
  // 10 Brand New Palettes
  { id: "Nordic Cobalt / Modernist", dotColor: "#002FA7" },
  { id: "Neo-Mint / Digital Sage", dotColor: "#15803D" },
  { id: "Y2K Acid Chrome / Silver", dotColor: "#E2FE52" },
  { id: "Dark Botanical / Moss", dotColor: "#C4975A" },
  { id: "Japanese Indigo / Sashiko", dotColor: "#EF4444" },
  { id: "Espresso & Oat / Specialty", dotColor: "#D97706" },
  { id: "Retro Sunset / Lilac", dotColor: "#FF5722" },
  { id: "Swiss Utilitarian / Grid", dotColor: "#FF3B30" },
  { id: "Peach Cloud / K-Beauty", dotColor: "#FB7185" },
  { id: "Solar Amber / Industrial", dotColor: "#F59E0B" },
];

export default function UILibraryPage() {
  const [activeCategory, setActiveCategory] = useState<ComponentCategory>("all");
  const [selectedVibe, setSelectedVibe] = useState<AestheticVibe>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [isLightMode, setIsLightMode] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "sections">("grid");
  const [copySuccess, setCopySuccess] = useState(false);
  const [previewSiteOpen, setPreviewSiteOpen] = useState(false);
  const [paletteGuideOpen, setPaletteGuideOpen] = useState(false);

  // Sync theme with localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ag_theme");
    if (saved === "dark") {
      setIsLightMode(false);
      document.documentElement.classList.remove("theme-paper");
      document.documentElement.classList.add("theme-obsidian");
    } else {
      setIsLightMode(true);
      document.documentElement.classList.remove("theme-obsidian");
      document.documentElement.classList.add("theme-paper");
    }
  }, []);

  const toggleTheme = () => {
    const next = !isLightMode;
    setIsLightMode(next);
    if (next) {
      document.documentElement.classList.remove("theme-obsidian");
      document.documentElement.classList.add("theme-paper");
      localStorage.setItem("ag_theme", "light");
    } else {
      document.documentElement.classList.remove("theme-paper");
      document.documentElement.classList.add("theme-obsidian");
      localStorage.setItem("ag_theme", "dark");
    }
  };

  const handleSelect = (id: string) => {
    if (selectedComponents.includes(id)) {
      setSelectedComponents(selectedComponents.filter((item) => item !== id));
    } else {
      setSelectedComponents([...selectedComponents, id]);
    }
  };

  const filteredItems = useMemo(() => {
    return UI_COMPONENTS_REGISTRY.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      const matchVibe = selectedVibe === "All" || item.aestheticVibe === selectedVibe;
      const matchSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.styleTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.aestheticVibe.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchVibe && matchSearch;
    });
  }, [activeCategory, selectedVibe, searchQuery]);

  const copyComposition = () => {
    const chosenDetails = UI_COMPONENTS_REGISTRY.filter((c) => selectedComponents.includes(c.id)).map(
      (c) => `- ${c.name} [${c.category.toUpperCase()}] — Vibe: ${c.aestheticVibe} (Style: ${c.styleTag})`
    );
    const text = `A.GURE 2,000 KR CUSTOM SITE BLUEPRINT:\n\n${chosenDetails.join("\n")}\n\nGenerated via agure.space/library`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Sort selected components in logical site order for live assembled preview
  const assembledItems = useMemo(() => {
    const categoryOrder: ComponentCategory[] = [
      "navs",
      "heroes",
      "titles",
      "galleries",
      "pricing",
      "reviews",
      "dropdowns",
      "booking",
      "footers",
    ];
    const picked = UI_COMPONENTS_REGISTRY.filter((c) => selectedComponents.includes(c.id));
    return picked.sort(
      (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
    );
  }, [selectedComponents]);

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-36">
      {/* 
        STICKY ACCESSIBLE FILTER COMMAND CENTER 
        Stays pinned as you scroll down through all 197 components.
      */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-card-border shadow-sm transition-all">
        {/* Top Control Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Logo & Counter */}
            <div className="flex items-center gap-2.5">
              <Link href="/" className="font-heading font-black text-sm sm:text-base tracking-tight hover:opacity-80">
                A.GURE
              </Link>
              <span className="text-muted text-xs">/</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground hidden sm:inline">
                UI VAULT
              </span>
              <span className="px-2 py-0.5 bg-foreground text-background text-[10px] font-mono font-bold">
                197 COMPONENTS
              </span>
              <Link
                href="/inspo"
                className="px-2 py-0.5 border border-card-border text-[10px] font-mono font-bold uppercase text-muted hover:text-foreground hover:border-foreground transition-colors"
              >
                INSPO VAULT (61)
              </Link>
              <span className="text-muted text-xs hidden lg:inline">·</span>
              <span className="text-xs font-mono text-muted hidden lg:inline">
                {filteredItems.length} matching styles
              </span>
            </div>

            {/* Quick Search & Actions */}
            <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
              <div className="relative w-full max-w-[200px] sm:max-w-[240px]">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs" />
                <input
                  type="text"
                  placeholder="Search 197 components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-7 py-1 border border-card-border bg-card text-foreground font-mono text-xs outline-none focus:border-foreground"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs"
                  >
                    <FiX />
                  </button>
                )}
              </div>

              {/* View Switcher */}
              <div className="hidden sm:flex border border-card-border p-0.5 font-mono text-xs">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-2 py-0.5 flex items-center gap-1 ${
                    viewMode === "grid" ? "bg-foreground text-background font-bold" : "text-muted hover:text-foreground"
                  }`}
                  title="Masonry Grid"
                >
                  <FiGrid className="text-xs" />
                  <span className="text-[10px] hidden md:inline">GRID</span>
                </button>
                <button
                  onClick={() => setViewMode("sections")}
                  className={`px-2 py-0.5 flex items-center gap-1 ${
                    viewMode === "sections" ? "bg-foreground text-background font-bold" : "text-muted hover:text-foreground"
                  }`}
                  title="Grouped by Section"
                >
                  <FiLayers className="text-xs" />
                  <span className="text-[10px] hidden md:inline">SECTIONS</span>
                </button>
              </div>

              {/* Palette Guide Button */}
              <button
                onClick={() => setPaletteGuideOpen(!paletteGuideOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 border text-xs font-mono transition-colors ${
                  paletteGuideOpen
                    ? "bg-foreground text-background font-bold border-foreground"
                    : "border-card-border text-muted hover:text-foreground bg-card"
                }`}
                title="View Color Palette Guide"
              >
                <span>🎨</span>
                <span className="text-[11px] font-bold hidden sm:inline">19 PALETTES</span>
                {paletteGuideOpen ? <FiChevronUp className="text-xs" /> : <FiChevronDown className="text-xs" />}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 border border-card-border text-foreground hover:bg-muted/10 text-xs font-mono"
                title="Toggle Theme"
              >
                {isLightMode ? <FiMoon /> : <FiSun />}
              </button>

              {/* Sticky Assembled Preview Trigger (Visible when components are queued) */}
              {selectedComponents.length > 0 && (
                <button
                  onClick={() => setPreviewSiteOpen(true)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs uppercase flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <FiEye />
                  <span className="hidden sm:inline">PREVIEW</span>
                  <span>({selectedComponents.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Sticky Row 2: Category Navigation Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 mt-1 border-t border-card-border/60 scroll-smooth">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 text-[11px] font-mono whitespace-nowrap transition-all flex-shrink-0 ${
                  activeCategory === cat.id
                    ? "bg-foreground text-background font-bold shadow-sm"
                    : "border border-card-border text-muted hover:text-foreground hover:border-foreground bg-card"
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          {/* Sticky Row 3: Aesthetic Universes & Theme Palettes Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 border-t border-card-border/40 scroll-smooth text-xs">
            <span className="text-[10px] font-mono text-muted uppercase font-bold flex-shrink-0 mr-1 hidden sm:inline">
              VIBE:
            </span>
            {AESTHETIC_VIBES.map((vibe) => (
              <button
                key={vibe.id}
                onClick={() => setSelectedVibe(vibe.id)}
                className={`px-2 py-0.5 text-[10px] font-mono whitespace-nowrap transition-all rounded flex-shrink-0 flex items-center gap-1.5 ${
                  selectedVibe === vibe.id
                    ? "bg-foreground text-background font-bold shadow-sm ring-1 ring-foreground"
                    : "border border-card-border text-muted hover:text-foreground hover:border-foreground bg-card"
                }`}
              >
                {vibe.dotColor && (
                  <span 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: vibe.dotColor }}
                  />
                )}
                <span>{vibe.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Palette Swatch Drawer */}
        {paletteGuideOpen && (
          <div className="border-t-2 border-foreground bg-card p-4 sm:p-6 max-h-[70vh] overflow-y-auto font-mono text-xs animate-in slide-in-from-top-2 duration-200">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-card-border">
                <div>
                  <h3 className="font-heading font-black text-sm sm:text-base uppercase tracking-tight text-foreground">
                    THE 19 THEME PALETTES &amp; SWATCH VAULT
                  </h3>
                  <p className="text-muted text-[11px] mt-0.5">
                    Click any palette to instantly filter components for that aesthetic universe.
                  </p>
                </div>
                <button
                  onClick={() => setPaletteGuideOpen(false)}
                  className="p-1 text-muted hover:text-foreground text-sm"
                >
                  <FiX />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {THEME_PALETTES.map((pal) => (
                  <div
                    key={pal.name}
                    onClick={() => {
                      setSelectedVibe(pal.id);
                      setPaletteGuideOpen(false);
                    }}
                    className={`p-3 border cursor-pointer transition-all ${
                      selectedVibe === pal.id
                        ? "border-foreground ring-2 ring-foreground bg-foreground/5 shadow-md"
                        : "border-card-border hover:border-foreground/60 bg-card hover:shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-foreground text-xs block">{pal.name}</span>
                        <span className="text-[10px] text-muted">{pal.subtitle}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 bg-foreground/10 text-foreground font-bold uppercase rounded">
                        {selectedVibe === pal.id ? "ACTIVE" : "FILTER"}
                      </span>
                    </div>

                    {/* 5-Color Swatch Bar */}
                    <div className="flex h-5 w-full rounded overflow-hidden border border-black/10 my-2">
                      <div className="flex-1" style={{ backgroundColor: pal.bgHex }} title={`Background: ${pal.bgHex}`} />
                      <div className="flex-1" style={{ backgroundColor: pal.cardHex }} title={`Card: ${pal.cardHex}`} />
                      <div className="flex-1" style={{ backgroundColor: pal.accentHex }} title={`Accent: ${pal.accentHex}`} />
                      <div className="flex-1" style={{ backgroundColor: pal.borderHex }} title={`Border: ${pal.borderHex}`} />
                      <div className="flex-1" style={{ backgroundColor: pal.textHex }} title={`Text: ${pal.textHex}`} />
                    </div>

                    <div className="text-[10px] space-y-0.5 pt-1 text-muted border-t border-card-border/40">
                      <div><strong className="text-foreground">Best for:</strong> {pal.bestFor}</div>
                      <div className="italic text-[9px]">{pal.mood}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Curated Assembled Live Showcases Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mt-5 mb-8">
        <div className="p-4 sm:p-5 border-2 border-foreground bg-card shadow-sm font-mono text-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-card-border">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">
                ● LIVE SHOWCASES READY
              </span>
              <h2 className="font-heading font-black text-base sm:text-lg uppercase text-foreground">
                2 Curated Websites Assembled Directly From This Vault
              </h2>
            </div>
            <span className="text-[11px] text-muted">
              Built with fluid deceleration, visual treatment selectors, and instant booking slips
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            <Link
              href="/preview/nails"
              className="p-4 border border-card-border hover:border-foreground bg-background hover:shadow-xs transition-all group rounded-none"
            >
              <div className="flex items-center justify-between text-sm font-bold text-foreground">
                <span>💅 1. Atelier Klō Studio Nails</span>
                <span className="text-muted group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
              <span className="text-xs text-muted block mt-1">
                Scandinavian Natural BIAB Atelier · Visual Treatment Booking &amp; Frogner Studio
              </span>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[9px] px-2 py-0.5 bg-foreground/10 text-foreground font-mono inline-block">
                  CLEAN NAIL ATELIER
                </span>
                <span className="text-[9px] text-muted font-mono">
                  From 550 kr · Quiet Chair Option
                </span>
              </div>
            </Link>

            <Link
              href="/preview/cakes"
              className="p-4 border border-card-border hover:border-foreground bg-background hover:shadow-xs transition-all group rounded-none"
            >
              <div className="flex items-center justify-between text-sm font-bold text-foreground">
                <span>🍰 2. Maison Choux Patisserie</span>
                <span className="text-muted group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
              <span className="text-xs text-muted block mt-1">
                Artisan Celebration Cakes · Auto-Scroll Gallery, Slice Graphics &amp; Fondant Script
              </span>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[9px] px-2 py-0.5 bg-foreground/10 text-foreground font-mono inline-block">
                  CELEBRATION CAKES
                </span>
                <span className="text-[9px] text-muted font-mono">
                  From 650 kr · Fresh in Grünerløkka
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Extracted Inspo Components Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mb-8">
        <div className="p-4 sm:p-5 border border-card-border bg-card font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-card-border">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#C86D51] tracking-wider block">
                EXTRACTED FROM INSPO VAULT
              </span>
              <h2 className="font-heading font-black text-base sm:text-lg uppercase text-foreground">
                4 Signature Components Pulled From Pinterest References
              </h2>
            </div>
            <Link
              href="/inspo"
              className="text-[11px] text-muted hover:text-foreground underline underline-offset-2"
            >
              Browse all 61 references →
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Weekly Availability Ticker */}
            <div className="border border-card-border bg-background flex flex-col justify-between overflow-hidden">
              <div className="p-3.5 border-b border-card-border bg-card/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 bg-foreground/10 text-foreground font-mono font-bold uppercase">
                    BOOKING
                  </span>
                  <h3 className="text-xs font-bold text-foreground font-mono">Weekly Availability Ticker</h3>
                </div>
                <Link
                  href="/inspo?pin=704461566760527104_sp0_b0.jpg"
                  className="text-[10px] text-muted hover:text-foreground font-mono underline underline-offset-2"
                >
                  Pin Reference ↗
                </Link>
              </div>
              <div className="p-4 bg-card/30 flex-1 flex items-center justify-center overflow-hidden">
                <div className="w-full">
                  <WeeklyAvailabilityTicker />
                </div>
              </div>
              <div className="px-3.5 py-2 border-t border-card-border/60 bg-muted/5 flex items-center justify-between text-[10px] text-muted font-mono">
                <span>Retro Newspaper · Continuous Marquee</span>
                <span className="font-bold text-foreground">Status Pills (Open / Last / Closed)</span>
              </div>
            </div>

            {/* 2. Editorial Grid Booking */}
            <div className="border border-card-border bg-background flex flex-col justify-between overflow-hidden">
              <div className="p-3.5 border-b border-card-border bg-card/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 bg-foreground/10 text-foreground font-mono font-bold uppercase">
                    BOOKING
                  </span>
                  <h3 className="text-xs font-bold text-foreground font-mono">Editorial Grid Booking</h3>
                </div>
                <Link
                  href="/inspo?pin=704461566760527113_sp0_b0.jpg"
                  className="text-[10px] text-muted hover:text-foreground font-mono underline underline-offset-2"
                >
                  Pin Reference ↗
                </Link>
              </div>
              <div className="p-4 bg-card/30 flex-1 flex items-center justify-center">
                <div className="w-full max-w-sm">
                  <EditorialGridBooking />
                </div>
              </div>
              <div className="px-3.5 py-2 border-t border-card-border/60 bg-muted/5 flex items-center justify-between text-[10px] text-muted font-mono">
                <span>Luxury Editorial · Hairline Borders</span>
                <span className="font-bold text-foreground">Interactive Date &amp; Slot Picker</span>
              </div>
            </div>

            {/* 3. Artist Profile Card */}
            <div className="border border-card-border bg-background flex flex-col justify-between overflow-hidden">
              <div className="p-3.5 border-b border-card-border bg-card/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 bg-foreground/10 text-foreground font-mono font-bold uppercase">
                    BIO
                  </span>
                  <h3 className="text-xs font-bold text-foreground font-mono">Artist Profile Card</h3>
                </div>
                <Link
                  href="/inspo?pin=704461566760527119.jpg"
                  className="text-[10px] text-muted hover:text-foreground font-mono underline underline-offset-2"
                >
                  Pin Reference ↗
                </Link>
              </div>
              <div className="p-4 bg-card/30 flex-1 flex items-center justify-center">
                <div className="w-full max-w-sm">
                  <ArtistProfileCard />
                </div>
              </div>
              <div className="px-3.5 py-2 border-t border-card-border/60 bg-muted/5 flex items-center justify-between text-[10px] text-muted font-mono">
                <span>Acuity Template · Bio &amp; Hours</span>
                <span className="font-bold text-foreground">4-Service Photo Category Pills</span>
              </div>
            </div>

            {/* 4. Newspaper Policy Grid */}
            <div className="border border-card-border bg-background flex flex-col justify-between overflow-hidden">
              <div className="p-3.5 border-b border-card-border bg-card/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 bg-foreground/10 text-foreground font-mono font-bold uppercase">
                    POLICIES
                  </span>
                  <h3 className="text-xs font-bold text-foreground font-mono">Newspaper Policy Grid</h3>
                </div>
                <Link
                  href="/inspo?pin=704461566760527122_sp0_b0.jpg"
                  className="text-[10px] text-muted hover:text-foreground font-mono underline underline-offset-2"
                >
                  Pin Reference ↗
                </Link>
              </div>
              <div className="p-4 bg-card/30 flex-1 flex items-center justify-center">
                <div className="w-full max-w-sm">
                  <NewspaperPolicyGrid />
                </div>
              </div>
              <div className="px-3.5 py-2 border-t border-card-border/60 bg-muted/5 flex items-center justify-between text-[10px] text-muted font-mono">
                <span>Grunge Editorial · Bold Hairlines</span>
                <span className="font-bold text-foreground">4-Rule Client Protection Blocks</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Component Display Canvas */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        {filteredItems.length === 0 ? (
          <div className="w-full py-20 text-center border border-dashed border-card-border font-mono text-xs text-muted">
            No UI components match &quot;{searchQuery}&quot; under vibe &quot;{selectedVibe}&quot;.
            <br />
            <button
              onClick={() => {
                setActiveCategory("all");
                setSelectedVibe("All");
                setSearchQuery("");
              }}
              className="mt-4 px-4 py-2 border border-foreground text-foreground font-bold uppercase"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Pinterest Style Balanced Masonry Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
            {filteredItems.map((item, idx) => (
              <ComponentCard
                key={item.id}
                item={item}
                index={idx}
                isSelected={selectedComponents.includes(item.id)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ) : (
          /* Grouped by Section Swimlanes */
          <div className="space-y-16">
            {CATEGORIES.filter((c) => c.id !== "all").map((cat) => {
              const catItems = filteredItems.filter((i) => i.category === cat.id);
              if (catItems.length === 0) return null;

              return (
                <div key={cat.id} id={cat.id} className="scroll-mt-36">
                  <div className="flex items-center justify-between pb-3 mb-6 border-b-2 border-foreground font-mono">
                    <div className="flex items-center gap-3">
                      <span className="font-heading font-black text-xl sm:text-2xl uppercase tracking-tight text-foreground">
                        {cat.label}
                      </span>
                      <span className="px-2 py-0.5 bg-foreground text-background text-[10px] font-bold">
                        {catItems.length} STYLES
                      </span>
                    </div>
                    <span className="text-xs text-muted hidden sm:inline uppercase">
                      SECTION #{cat.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
                    {catItems.map((item, idx) => (
                      <ComponentCard
                        key={item.id}
                        item={item}
                        index={idx}
                        isSelected={selectedComponents.includes(item.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Template Formula Tray */}
      {selectedComponents.length > 0 && (
        <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:right-8 z-40 max-w-lg w-full bg-card border-2 border-foreground p-4 shadow-2xl font-mono text-xs animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-card-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-foreground uppercase tracking-tight">
                CUSTOM 2,000 KR SITE FORMULA
              </span>
            </div>
            <span className="bg-foreground text-background px-2 py-0.5 text-[10px] font-bold">
              {selectedComponents.length} COMPONENTS
            </span>
          </div>

          <div className="max-h-32 overflow-y-auto space-y-1 mb-3 pr-1 text-[11px] text-muted">
            {assembledItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-1 border-b border-card-border/40">
                <div className="truncate pr-2">
                  <span className="px-1.5 py-0.2 rounded bg-foreground/10 text-foreground text-[9px] uppercase font-bold mr-1.5">
                    {item.category}
                  </span>
                  <span className="text-foreground font-semibold">{item.name}</span>
                </div>
                <button
                  onClick={() => handleSelect(item.id)}
                  className="text-muted hover:text-foreground text-[10px] px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPreviewSiteOpen(true)}
              className="flex-1 py-2.5 bg-foreground text-background font-bold text-xs uppercase hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              <FiEye className="text-sm" />
              <span>PREVIEW ASSEMBLED SITE</span>
            </button>
            <button
              onClick={copyComposition}
              className="px-3 py-2.5 border border-foreground text-foreground font-bold text-xs uppercase hover:bg-muted/10 transition-colors"
              title="Copy blueprint specification text"
            >
              {copySuccess ? <FiCheck className="text-emerald-500" /> : <FiCode />}
            </button>
            <button
              onClick={() => setSelectedComponents([])}
              className="px-3 py-2.5 border border-card-border text-muted hover:text-foreground text-xs uppercase"
            >
              CLEAR
            </button>
          </div>
        </div>
      )}

      {/* Live Assembled 1-Page Site Preview Modal */}
      {previewSiteOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewSiteOpen(false)}
        >
          <div 
            className="w-full max-w-4xl h-[92vh] bg-card border-2 border-foreground flex flex-col shadow-2xl overflow-hidden font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Browser Frame Bar */}
            <div className="p-3 border-b border-card-border bg-muted/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="font-bold text-foreground text-xs ml-2">
                  LIVE 1-PAGE PREVIEW // ASSEMBLED COMPOSITION ({assembledItems.length} SECTIONS)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyComposition}
                  className="px-3 py-1 bg-foreground text-background font-bold text-xs uppercase"
                >
                  {copySuccess ? "COPIED BLUEPRINT!" : "EXPORT BLUEPRINT"}
                </button>
                <button
                  onClick={() => setPreviewSiteOpen(false)}
                  className="p-1 hover:bg-muted/20 text-muted hover:text-foreground"
                >
                  <FiX className="text-base" />
                </button>
              </div>
            </div>

            {/* Scrollable Live 1-Page Website Flow */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-12 bg-neutral-100 dark:bg-neutral-950">
              {assembledItems.map((item, idx) => {
                const ItemComponent = item.component;
                return (
                  <div key={item.id} className="relative group">
                    <div className="absolute -top-3 left-4 px-2 py-0.5 bg-black text-white text-[9px] font-mono uppercase font-bold z-10">
                      STEP {idx + 1}: {item.category.toUpperCase()} — {item.name}
                    </div>
                    <div className="shadow-lg border border-black/10">
                      <ItemComponent />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
