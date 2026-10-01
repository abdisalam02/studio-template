import React, { useState } from "react";

export interface BookingModalProps {
  tenantId?: string;
  studioId?: string;
  studioName?: string;
  primaryColor?: string;
}

export function BookingModal({
  tenantId,
  studioId,
  studioName = "Studio",
  primaryColor = "#171717",
}: BookingModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Floating or Inline Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          backgroundColor: primaryColor,
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "9999px",
          border: "none",
          fontWeight: 700,
          fontSize: "13px",
          cursor: "pointer",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        Bestill time · {studioName}
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              color: "#171717",
              width: "100%",
              maxWidth: "420px",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, textTransform: "uppercase" }}>
                {studioName} · Timebestilling
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#737373",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#737373", margin: "0 0 20px 0" }}>
              Velg ønsket behandling og tidspunkt. Reservasjonen bekreftes umiddelbart.
            </p>

            <div style={{ padding: "16px", backgroundColor: "#FAF9F6", borderRadius: "12px", border: "1px solid #E5E5E5", marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#737373" }}>
                1-Tap Booking Engine
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "4px" }}>
                Direkte synkronisert med studioets kalender
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: primaryColor,
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Lukk vindu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
