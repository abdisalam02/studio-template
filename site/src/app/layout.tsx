import type { Metadata } from "next";
import localFont from "next/font/local";
import { CLIENT_CONFIG } from "@/config/client";
import "./globals.css";
import "./booking.css";

/**
 * Montserrat is self-hosted instead of loaded through `next/font/google`.
 *
 * Fetching fonts from fonts.googleapis.com at build time made every deploy
 * depend on a third party: when Google answered with a non-CSS response the
 * loader threw `Cannot read properties of null (reading '1')` and the build
 * failed, blocking unrelated releases. The variable font (latin subset,
 * weights 300–700, includes æøå) is now a repo asset, so builds are hermetic.
 */
const montserrat = localFont({
  src: "./fonts/montserrat-latin.woff2",
  weight: "300 700",
  style: "normal",
  variable: "--font-montserrat",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: `${CLIENT_CONFIG.name} · ${CLIENT_CONFIG.niche}`,
  description: CLIENT_CONFIG.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nb" className={montserrat.variable}>
      <body className="antialiased min-h-dvh flex flex-col justify-between font-sans">
        {children}
      </body>
    </html>
  );
}
