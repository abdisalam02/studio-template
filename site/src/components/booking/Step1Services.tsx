"use client";

import React, { useState } from "react";
import type { Database } from "@/types/database";

export type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

interface Step1ServicesProps {
  services: ServiceRow[];
  selectedServiceIds: number[];
  allowMultiSelect: boolean;
  currency?: string;
  onToggleService: (service: ServiceRow) => void;
  onContinue: () => void;
}

const CATEGORIES = ["Alle", "BIAB & Gel", "Nail Art & Chrome", "Pedikyr"] as const;
type Category = (typeof CATEGORIES)[number];

const NAIL_IMAGES = [
  "/demo/nails/pin-biab.jpg",
  "/demo/nails/pin-glazed-donut.jpg",
  "/demo/nails/pin-glass-french.jpg",
  "/demo/nails/pin-russian-prep.jpg",
  "/demo/nails/nail-1.jpg",
  "/demo/nails/nail-2.jpg",
  "/demo/nails/nail-3.jpg",
  "/demo/nails/nail-4.jpg",
  "/demo/nails/nail-5.jpg",
];

function getServiceCategory(service: ServiceRow): Category {
  const name = service.name.toLowerCase();
  if (name.includes("pedi") || name.includes("fot") || name.includes("spa")) {
    return "Pedikyr";
  }
  if (
    name.includes("art") ||
    name.includes("chrome") ||
    name.includes("gem") ||
    name.includes("design") ||
    name.includes("opal") ||
    name.includes("shape") ||
    name.includes("glitter")
  ) {
    return "Nail Art & Chrome";
  }
  return "BIAB & Gel";
}

export function getServiceImage(service: ServiceRow, index: number): string {
  const name = service.name.toLowerCase();
  if (name.includes("biab") || name.includes("struktur")) return "/demo/nails/pin-biab.jpg";
  if (name.includes("chrome") || name.includes("glazed")) return "/demo/nails/pin-glazed-donut.jpg";
  if (name.includes("french") || name.includes("glass")) return "/demo/nails/pin-glass-french.jpg";
  if (name.includes("prep") || name.includes("manikyr") || name.includes("fjerning")) {
    return "/demo/nails/pin-russian-prep.jpg";
  }
  if (name.includes("pedi")) return "/demo/nails/nail-3.jpg";
  return NAIL_IMAGES[index % NAIL_IMAGES.length];
}

function getServiceDescription(service: ServiceRow): string {
  const name = service.name.toLowerCase();
  if (name.includes("biab") || name.includes("struktur")) {
    return "Forsterkning og forming med slitesterk gele. Perfekt for naturlig vekst.";
  }
  if (name.includes("art") || name.includes("chrome")) {
    return "Håndmalt design, kromfinish eller detaljer tilpasset din stil.";
  }
  if (name.includes("fjerning")) {
    return "Skånsom avfiling og pleie av naturlige negler.";
  }
  if (name.includes("gem") || name.includes("opal")) {
    return "Sertifisert presisjonsplassering med medisinsk adhesiv.";
  }
  if (name.includes("pedi")) {
    return "Komplett fotbad, forming, lakk og fuktighetsbehandling.";
  }
  return "Klassisk studiobehandling utført med profesjonelle produkter.";
}

export function Step1Services({
  services,
  selectedServiceIds,
  allowMultiSelect,
  currency = "kr",
  onToggleService,
}: Step1ServicesProps) {
  const [activeCategory, setActiveCategory] = useState<Category>("Alle");

  const filteredServices = services.filter((s) => {
    if (activeCategory === "Alle") return true;
    return getServiceCategory(s) === activeCategory;
  });

  return (
    <section aria-labelledby="step1-heading" className="space-y-4">
      {/* 1. Category Chips Reel */}
      <div className="category-chips-reel" role="tablist" aria-label="Kategorier">
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(category)}
              className={`category-chip ${isActive ? "active" : ""}`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* 2. Service Cards Matrix */}
      <div className="space-y-2.5">
        {filteredServices.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-xs">
            Ingen behandlinger tilgjengelig i denne kategorien.
          </div>
        ) : (
          filteredServices.map((service, idx) => {
            const isSelected = selectedServiceIds.includes(service.id);
            const imageSrc = getServiceImage(service, idx);
            const description = getServiceDescription(service);

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onToggleService(service)}
                className={`drawer-service-card ${isSelected ? "selected" : ""}`}
                aria-pressed={isSelected}
              >
                {/* 64x64px thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt={service.name}
                  className="service-card-thumb"
                  width={64}
                  height={64}
                  loading="lazy"
                />

                <div className="service-card-info">
                  <div className="service-card-title">{service.name}</div>
                  <div className="service-card-desc">{description}</div>

                  <div className="service-card-meta">
                    <span className="service-duration-pill">
                      ⏱ {service.duration_min} min
                    </span>
                    <span className="service-price-tag">
                      {service.price_nok > 0 ? `${service.price_nok} ${currency}` : "Gratis"}
                    </span>
                  </div>
                </div>

                {/* Circular Check Indicator Ring */}
                <div
                  className="service-check-indicator"
                  aria-hidden="true"
                >
                  {isSelected && (
                    <svg
                      width="11"
                      height="9"
                      viewBox="0 0 11 9"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 4.5L4 7.5L10 1.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {allowMultiSelect && (
        <p className="text-[11px] text-neutral-400 text-center pt-2">
          Du kan velge flere behandlinger for en samlet time.
        </p>
      )}
    </section>
  );
}
