import { cinzel, syne } from "@/lib/adminFonts";
import "./admin-system.css";

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
      className={`${cinzel.variable} ${syne.variable} admin-app-root`}
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
