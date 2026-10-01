import React from "react";

export type ComponentCategory =
  | "all"
  | "navs"
  | "heroes"
  | "titles"
  | "galleries"
  | "dropdowns"
  | "pricing"
  | "reviews"
  | "booking"
  | "footers";

export type AestheticVibe =
  | "All"
  | "Terracotta / Earthy"
  | "Patisserie / Pastel"
  | "Wabi-Sabi / Sage"
  | "Cyber Chrome / Dark"
  | "Neo-Brutalist / Pop"
  | "Luxury Atelier / Gold"
  | "Editorial / Print"
  | "Modern Magic / Glow"
  | "Artisan / Linen"
  // 10 Brand New Palettes
  | "Nordic Cobalt / Modernist"
  | "Neo-Mint / Digital Sage"
  | "Y2K Acid Chrome / Silver"
  | "Dark Botanical / Moss"
  | "Japanese Indigo / Sashiko"
  | "Espresso & Oat / Specialty"
  | "Retro Sunset / Lilac"
  | "Swiss Utilitarian / Grid"
  | "Peach Cloud / K-Beauty"
  | "Solar Amber / Industrial";

export interface ThemePaletteInfo {
  id: AestheticVibe;
  name: string;
  subtitle: string;
  bgHex: string;
  cardHex: string;
  accentHex: string;
  textHex: string;
  borderHex: string;
  bestFor: string;
  mood: string;
}

export interface UIComponentItem {
  id: string;
  category: ComponentCategory;
  name: string;
  styleTag: string;
  aestheticVibe: AestheticVibe;
  description: string;
  component: React.ComponentType;
  codeSnippet: string;
  badge?: string;
}
