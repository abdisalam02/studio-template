import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { CLIENT_CONFIG } from "@/config/client";
import "./globals.css";
import "./booking.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
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
