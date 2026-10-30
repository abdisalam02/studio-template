import { cinzel, syne } from "@/lib/adminFonts";
import "../admin/admin-system.css";

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
      className={`${cinzel.variable} ${syne.variable} platform-app-root`}
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
