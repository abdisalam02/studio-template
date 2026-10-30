import { Cinzel, Montserrat, Syne } from "next/font/google";
import "./admin-system.css";

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
  title: "Studio Manager · Atelier Portal",
  description: "Editorial studio management portal for appointments, scheduling, and clients.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${cinzel.variable} ${montserrat.variable} ${syne.variable} admin-app-root`}
      style={{
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        backgroundColor: "var(--admin-canopy-bg, #121214)",
      }}
    >
      {children}
    </div>
  );
}
