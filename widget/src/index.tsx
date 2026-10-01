import React from "react";
import ReactDOM from "react-dom/client";
import { BookingModal } from "./BookingModal";

export { BookingModal };

// Auto-mount if script is loaded via script tag on a client page
export function init(targetSelector: string = "#studio-booking-widget", props = {}) {
  const container = document.querySelector(targetSelector);
  if (!container) return;

  const root = ReactDOM.createRoot(container);
  root.render(<BookingModal {...props} />);
}

if (typeof window !== "undefined") {
  // Check for auto-mount target element
  const autoTarget = document.querySelector("[data-studio-booking]");
  if (autoTarget) {
    const studioName = autoTarget.getAttribute("data-studio-name") || "Studio";
    const primaryColor = autoTarget.getAttribute("data-primary-color") || "#171717";
    const root = ReactDOM.createRoot(autoTarget);
    root.render(<BookingModal studioName={studioName} primaryColor={primaryColor} />);
  }
}
