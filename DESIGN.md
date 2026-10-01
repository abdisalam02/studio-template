# DESIGN.md: Multi-Tenant Beauty & Wellness Design Standard

This document governs all visual styling, layouts, components, and art direction.
Every studio built with this template must feel bespoke, tactile, and editorial — never like a generic SaaS or AI-generated template.

---

## 1. Absolute Banned AI Tropes (Never Generate These)
- **NO Purple/Indigo SaaS Gradients:** Never use `bg-gradient-to-r from-purple-500 to-indigo-600`.
- **NO Glassmorphism & Floating Blobs:** Never use `backdrop-blur-md`, glowing neon orbs, or floating decorative gradient circles.
- **NO Generic Bento Grids:** Do not arrange features in uniform 3-box grids with colored icon circles.
- **NO Centered SaaS Heroes:** Avoid the "Pill Badge ✨ + Gradient Text + 2 Buttons" template.
- **NO Typographic Monotony:** Never use Inter, Arial, or Roboto for display headers. Headers must use intentional editorial typography.
- **NO AI Buzzwords:** Banned words in UI and copy: *elevate, supercharge, seamless, bespoke, unleash, empower, craft, revolutionized, cutting-edge, holistic*.

---

## 2. The 5 Aesthetic Archetypes
When building a new client storefront, select one archetype and adhere strictly to its visual rules:

### Archetype A: Editorial High-Contrast (Gangina, High-End Grillz/Piercing)
- **Palette:** Warm neutral canvas (`#ece8e1`), pitch charcoal (`#1a1a1a`), titanium white (`#ffffff`), hairline borders (`#e2ded7`), chrome/gold accents.
- **Typography:** Montserrat (uppercase spaced headers, geometric sans body).
- **Layout:** Asymmetric magazine layouts, full-bleed macro photography, tactile borders, watermark studio monogram in background.

### Archetype B: Wabi-Sabi Organic (Holistic Nails, Japanese Brow Studio, Spa)
- **Palette:** Linen cream (`#f7f4ee`), matcha sage (`#4a5848`), raw clay (`#c28d75`), warm stone (`#7c7469`).
- **Typography:** Cormorant Garamond or Playfair Display (editorial serif) paired with a clean, low-contrast sans body.
- **Layout:** Generous whitespace, deckle/hairline dividers, organic photo shapes, filmstrip horizontal galleries.

### Archetype C: Nordic Monochrome (Minimalist Barber, Laser Clinic, Medical Dental)
- **Palette:** Clinical chalk white (`#fafafa`), deep ink (`#09090b`), slate border (`#e4e4e7`), cobalt accent (`#1e40af`).
- **Typography:** Instrument Sans, Space Grotesk, or Syne.
- **Layout:** Rigid grid system, high data-density, monospace metadata labels, zero rounded corners (`rounded-none` or `rounded-sm`).

### Archetype D: Soft Patisserie (Lash Tech, Soft Gel Nail Studio, Korean Aesthetics)
- **Palette:** Pale peach (`#fdf6f0`), porcelain blush (`#fae8e0`), warm cocoa (`#4a3e3d`), caramel ribbon (`#d99b74`).
- **Typography:** Fraunces or Serif Display paired with Plus Jakarta Sans.
- **Layout:** Soft pill geometry (`rounded-2xl` / `rounded-full`), polaroid photo cards, soft ticket/voucher elements.

### Archetype E: Dark Botanical (Luxury Tattoo, Boutique Perfumery, Late Night Studio)
- **Palette:** Deep pitch obsidian (`#0d0f0e`), oxidized bronze (`#8a7b63`), muted moss (`#2e3830`), silver foil (`#d1d5db`).
- **Typography:** Serif Display headers with high kerning, dark mode UI with hairline borders.

---

## 3. Mobile Art Direction Rules (375px–412px Viewport)
- **The Thumb Zone Rule:** Primary booking actions and slot selectors must sit in the bottom 60% of the screen.
- **No Overflow:** Absolute `overflow-x-hidden` on main containers. Never use fixed pixel widths (`w-[380px]` is banned; use `w-full max-w-sm`).
- **Dynamic Viewports:** Always use `min-h-dvh` instead of `min-h-screen` to prevent iOS Safari bottom-bar jump bugs.
- **Tactile Inputs:** All inputs and clickable pills must have an active micro-scale (`active:scale-[0.98]`) and minimum 44px touch targets.

---

## 4. Multi-Tenant Customization Contract
Every tenant storefront must inherit its visual identity from `TenantConfig`:
- `colors`: Injected as CSS variables at the root layout (`--brand-bg`, `--brand-text`, `--brand-accent`, `--brand-border`).
- `watermarkText` or `logoUrl`: Subtle background monogram (`opacity-5`) on both the public storefront and the admin dashboard.
- `intakeSchema`: Custom intake dropdowns or inputs relevant strictly to that tenant's trade.
- `cancellationPolicy`: Explicit local Norwegian terms displayed next to a mandatory legal checkbox.
