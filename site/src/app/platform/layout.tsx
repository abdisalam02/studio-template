import { Cinzel, Montserrat, Syne } from "next/font/google";
import "../admin/admin-system.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata = {
  title: "A.Gure Platform Control · Agency Multi-Tenant Control Center",
  description: "Executive platform control center and studio workbench for managing multi-tenant booking platforms.",
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${cinzel.variable} ${montserrat.variable} ${syne.variable} platform-app-root`}
      style={{
        width: "100%",
        minHeight: "100dvh",
        backgroundColor: "#FAFAFA",
        color: "#111113",
      }}
    >
      {children}
    </div>
  );
}
