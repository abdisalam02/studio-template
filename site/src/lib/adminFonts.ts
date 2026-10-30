import localFont from "next/font/local";

/**
 * Admin/platform display fonts are self-hosted.
 *
 * Fetching them through `next/font/google` made the Vercel build depend on
 * fonts.googleapis.com; when Google answered with a non-CSS response the
 * loader threw `Cannot read properties of null (reading '1')` and the deploy
 * failed. The woff2 files are repo assets now.
 *
 * Montserrat is not declared here: the root layout already self-hosts it and
 * exposes `--font-montserrat`, which these nested layouts inherit.
 */
export const cinzel = localFont({
  src: "../app/fonts/cinzel-latin.woff2",
  weight: "500 700",
  style: "normal",
  variable: "--font-cinzel",
  display: "swap",
  preload: true,
});

export const syne = localFont({
  src: "../app/fonts/syne-latin.woff2",
  weight: "700 800",
  style: "normal",
  variable: "--font-syne",
  display: "swap",
  preload: true,
});
