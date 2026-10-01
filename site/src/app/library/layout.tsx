import { Metadata } from "next";

export const metadata: Metadata = {
  title: "UI Component Vault & Customizer (74 Styles) | A.GURE",
  description: "Explore 74 distinct, hand-engineered UI components for booking sites and studio templates. Spaced evenly, interactive, zero AI slop.",
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
