import UILibraryPage from "../library/page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "UI Component Library & Customizer",
  description: "Browse 74 distinct, non-AI UI components for studio booking sites. Spaced evenly and filterable.",
};

export default function CustomizerPage() {
  return <UILibraryPage />;
}
