# ARCHITECTURE.md (SEED from the brief; run `npm run arch` to replace with the generated map)

Read this before searching. Open files by line range. Never read a "Big file" whole.

## Routes
| URL | Entry | UI lives in |
|---|---|---|
| / | src/app/page.tsx | Hero.tsx, ClientWork.tsx |
| /pricing | src/app/pricing/page.tsx | self-contained |
| /contact | src/app/contact/page.tsx | self-contained (honeypot + privacy notice) |
| /privacy | src/app/privacy/page.tsx | self-contained |
| /studio | src/app/studio/page.tsx | self-contained |
| /demo | src/app/demo/page.tsx | index of demos |
| /demo/nails | src/app/demo/nails/page.tsx (8) | src/components/demo/StudioKloNailsView.tsx (1,143) |
| /preview/nails | src/app/preview/nails/page.tsx | same view, wrapped by src/components/preview/PreviewShell.tsx |
| /demo/cakes, /demo/wedding, /demo/decorations | src/app/demo/*/page.tsx | self-contained |
| /preview/cakes | src/app/preview/cakes/page.tsx (1,857) | self-contained, plus PreviewShell |
| /library | src/app/library/page.tsx | src/components/library/registry.ts (2,234) |
| /customizer | src/app/customizer/page.tsx | src/components/library/palettes.ts |
| /api/send-email | src/app/api/send-email/route.ts | Resend to hello@agure.space |
| /api/auth-pin | src/app/api/auth-pin/route.ts | access gate |

## Shared
- Header.tsx, Footer.tsx, LegalFooter.tsx in src/components/. Legal data in src/config/legal.ts.
- Library: registry.ts (197 components), palettes.ts (19 palettes), HeroComponents.tsx.

## Big files (never read whole; use line ranges from `npm run arch`)
- src/components/library/registry.ts (2,234)
- src/app/preview/cakes/page.tsx (1,857)
- src/components/demo/StudioKloNailsView.tsx (1,143)

## Sources of truth
legal: src/config/legal.ts | design: docs/DESIGN.md | prices: docs/PRICING.md | assets: docs/ASSETS.md | state: docs/STATE.md

## Gotchas
- `/demo/nails` and `/preview/nails` share one view. Edit `StudioKloNailsView.tsx`, not the page files.
- Dev tools (PreviewShell dock, customizer) only render when `NEXT_PUBLIC_DEMO === '1'`.
- Scripts live in `scripts/` at the repo root, not in `src/`.
