"use client";

import React, { useState, useEffect, useRef } from "react";
import { Step1Services, type ServiceRow } from "./Step1Services";
import { Step2DateTime } from "./Step2DateTime";
import { Step3Details, type CustomerDetails } from "./Step3Details";
import { Step4Confirmed } from "./Step4Confirmed";
import {
  getTenantConfig,
  DEFAULT_TENANT_SLUG,
  type TenantConfig,
} from "@/config/tenant.config";

interface BookingWidgetProps {
  tenantSlug?: string;
  tenantConfig?: TenantConfig;
  initialServices?: ServiceRow[];
  studioName?: string;
  studioPhone?: string;
}

// Local testing mode: lets you preview the full flow (including the
// confirmation receipt) without typing customer details or needing a working
// backend. Automatically disabled in production builds.
const DEMO_BOOKING = process.env.NODE_ENV !== "production";

function makeDemoBookingRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `DEMO-${out}`;
}

function formatDockSlot(slotIso: string): string {
  if (!slotIso) return "";
  const d = new Date(slotIso);
  if (isNaN(d.getTime())) return "";
  const weekday = d.toLocaleDateString("no-NO", {
    timeZone: "Europe/Oslo",
    weekday: "short",
  });
  const time = d.toLocaleTimeString("no-NO", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${weekday} ${time}`;
}

export function BookingWidget({
  tenantSlug = DEFAULT_TENANT_SLUG,
  tenantConfig = getTenantConfig(tenantSlug),
  initialServices = [],
  studioName,
  studioPhone,
}: BookingWidgetProps) {
  // All display defaults resolve from the active tenant config; callers may
  // still override explicitly (e.g. with a live DB tenant name).
  const resolvedStudioName = studioName ?? tenantConfig.name;
  const resolvedStudioPhone = studioPhone ?? tenantConfig.contact.phone;

  // Expose the active accent to the booking stylesheet (booking.css reads
  // var(--brand-accent)) so the trigger bar and drawer re-skin per tenant.
  const themeVars = {
    "--brand-accent": tenantConfig.theme.colors.accent,
    "--studio-accent": tenantConfig.theme.colors.accent,
  } as React.CSSProperties;

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const [servicesLoading, setServicesLoading] = useState(initialServices.length === 0);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlotIso, setSelectedSlotIso] = useState<string>("");

  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: "",
    email: "",
    phone: "",
    notes: "",
    customFields: {},
    cancellationConsent: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState<string>("");

  // Touch drag swipe-to-dismiss states
  const touchStartYRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);

  // Intercept any click to a[href="#book"] or #book in hash to open drawer
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a[href="#book"]');
      if (target) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    const handleHash = () => {
      if (window.location.hash === "#book") {
        setIsOpen(true);
      }
    };

    document.addEventListener("click", handleAnchorClick);
    window.addEventListener("hashchange", handleHash);
    if (typeof window !== "undefined" && window.location.hash === "#book") {
      setIsOpen(true);
    }

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      window.removeEventListener("hashchange", handleHash);
    };
  }, []);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Fetch tenant services if not provided initially
  useEffect(() => {
    if (initialServices.length > 0) {
      setServices(initialServices);
      if (initialServices.length > 0 && selectedServiceIds.length === 0) {
        setSelectedServiceIds([initialServices[0].id]);
      }
      return;
    }

    let isCancelled = false;
    setServicesLoading(true);

    const loadServices = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        if (supabase) {
          const { data } = await supabase
            .from("services")
            .select("*")
            .eq("tenant_id", tenantSlug)
            .eq("active", true)
            .order("sort", { ascending: true });

          if (!isCancelled && data && data.length > 0) {
            setServices(data);
            setSelectedServiceIds([data[0].id]);
          }
        }
      } catch (err) {
        console.error("Failed to load services:", err);
      } finally {
        if (!isCancelled) setServicesLoading(false);
      }
    };

    loadServices();

    return () => {
      isCancelled = true;
    };
  }, [tenantSlug, initialServices]);

  // Fallback defaults pulled from the active tenant config if the DB table is empty
  useEffect(() => {
    if (!servicesLoading && services.length === 0) {
      const fallback: ServiceRow[] = tenantConfig.services.map((service, index) => ({
        id: typeof service.id === "number" ? service.id : Number(service.id) || index + 1,
        tenant_id: tenantSlug,
        name: service.name,
        duration_min: service.durationMin,
        price_nok: service.priceNok,
        buffer_min: service.bufferMin ?? null,
        active: service.active ?? true,
        sort: service.sort ?? index,
      }));

      if (fallback.length > 0) {
        setServices(fallback);
        setSelectedServiceIds([fallback[0].id]);
      }
    }
  }, [servicesLoading, services.length, tenantSlug, tenantConfig]);

  const handleToggleService = (service: ServiceRow) => {
    if (tenantConfig.rules.allowMultiSelect) {
      if (selectedServiceIds.includes(service.id)) {
        if (selectedServiceIds.length > 1) {
          setSelectedServiceIds(selectedServiceIds.filter((id) => id !== service.id));
        }
      } else {
        setSelectedServiceIds([...selectedServiceIds, service.id]);
      }
    } else {
      setSelectedServiceIds([service.id]);
    }
  };

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const primaryService = selectedServices[0] || services[0];
  const totalPriceNok = selectedServices.reduce((acc, s) => acc + s.price_nok, 0);
  const totalDurationMin = selectedServices.reduce((acc, s) => acc + s.duration_min, 0);

  const handleSubmitBooking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSlotIso || selectedServices.length === 0) return;

    // In demo/testing mode, allow submitting with placeholder details so the
    // confirmation step can be previewed without typing anything.
    const effectiveDetails: CustomerDetails = DEMO_BOOKING
      ? {
          ...customerDetails,
          name: customerDetails.name || "Testkunde",
          email: customerDetails.email || "test@example.com",
          phone: customerDetails.phone || "+4700000000",
          cancellationConsent: true,
        }
      : customerDetails;

    if (!DEMO_BOOKING) {
      if (!customerDetails.name || !customerDetails.email || !customerDetails.phone) {
        setSubmitError("Vennligst fyll ut alle obligatoriske felt.");
        return;
      }
      if (!customerDetails.cancellationConsent) {
        setSubmitError("Vennligst godkjenn avbestillingsbetingelsene.");
        return;
      }
    } else if (effectiveDetails !== customerDetails) {
      // Reflect the placeholders so Step 4 shows something meaningful.
      setCustomerDetails(effectiveDetails);
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const startUtc = Math.floor(new Date(selectedSlotIso).getTime() / 1000);
      const serviceSummary =
        selectedServices.length > 1
          ? selectedServices.map((s) => s.name).join(" + ")
          : primaryService.name;

      const res = await fetch(`/api/v1/t/${tenantSlug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: primaryService.id,
          service_ids: selectedServiceIds,
          service_summary: serviceSummary,
          start_utc: startUtc,
          customer_name: effectiveDetails.name,
          customer_email: effectiveDetails.email,
          customer_phone: effectiveDetails.phone,
          notes: effectiveDetails.notes,
          custom_fields: effectiveDetails.customFields,
          consent: true,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        if (DEMO_BOOKING) {
          setBookingRef(makeDemoBookingRef());
          setCurrentStep(4);
          return;
        }
        setSubmitError(
          "Beklager, dette tidspunktet ble akkurat reservert av en annen kunde. Vennligst gå tilbake og velg et annet tidspunkt."
        );
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || "Kunne ikke opprette timebestilling.");
      }

      setBookingRef(data.ref || makeDemoBookingRef());
      setCurrentStep(4);
    } catch (err: unknown) {
      if (DEMO_BOOKING) {
        // Live API unavailable / date closed: simulate a confirmation so the
        // receipt step can still be tested locally.
        console.warn("Demo booking fallback:", err);
        setBookingRef(makeDemoBookingRef());
        setCurrentStep(4);
        return;
      }
      console.error("Booking submission error:", err);
      const msg =
        err instanceof Error ? err.message : "Det oppstod en feil ved registrering.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedSlotIso("");
    setBookingRef("");
    setSubmitError(null);
  };

  // Touch handlers for swipe to dismiss (threshold: 70px)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartYRef.current;
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffset > 70) {
      setIsOpen(false);
    }
    setDragOffset(0);
    touchStartYRef.current = null;
  };

  // Step Titles
  const stepTitles: Record<number, string> = {
    1: "Velg Behandling",
    2: "Velg Tidspunkt",
    3: "Dine Opplysninger",
    4: "Kvittering",
  };

  return (
    <>
      {/* 1. Pre-footer Floating Trigger Bar */}
      <aside
        id="bookingTriggerBar"
        aria-label="Booking hurtighandling"
        className={`booking-trigger-bar ${isOpen ? "hidden-dock" : ""}`}
        style={themeVars}
      >
        <div className="trigger-studio-info">
          <span className="trigger-studio-name">{resolvedStudioName}</span>
          <div className="trigger-status-badge">
            <span className="trigger-status-dot" aria-hidden="true" />
            <span>Åpen for booking</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="trigger-cta-btn"
        >
          <span>Bestill time</span>
          <span aria-hidden="true">→</span>
        </button>
      </aside>

      {/* 2. Sliding Bottom Sheet Drawer Modal */}
      <div
        id="bookingDrawerOverlay"
        className={`booking-drawer-overlay ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Bestillingsskjema"
        style={themeVars}
        onClick={() => setIsOpen(false)}
      >
        <div
          id="bookingDrawerSheet"
          className="booking-drawer-sheet"
          onClick={(e) => e.stopPropagation()}
          style={
            dragOffset > 0
              ? { transform: `translateY(${dragOffset}px)`, transition: "none" }
              : undefined
          }
        >
          {/* Tactile Drag Handle (Swipe to dismiss) */}
          <div
            className="drawer-drag-wrap"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="drawer-drag-pill" />
          </div>

          {/* Minimalist Header */}
          <header className="drawer-header">
            {currentStep > 1 && currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="drawer-back-btn"
              >
                ← Tilbake
              </button>
            ) : (
              <div className="min-w-[60px]" />
            )}

            <h2 className="drawer-step-title">{stepTitles[currentStep]}</h2>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="drawer-close-btn"
              aria-label="Lukk bestillingsvindu"
            >
              ✕
            </button>
          </header>

          {/* 4-Step Hairline Progress Bar */}
          <div className="drawer-progress-track">
            <div
              className="drawer-progress-fill"
              style={{ width: `${currentStep * 25}%` }}
            />
          </div>

          {/* Scrollable Drawer Content */}
          <div className="drawer-content-scroll">
            {currentStep === 1 && (
              <Step1Services
                services={services}
                selectedServiceIds={selectedServiceIds}
                allowMultiSelect={tenantConfig.rules.allowMultiSelect}
                currency={tenantConfig.rules.currency}
                onToggleService={handleToggleService}
                onContinue={() => setCurrentStep(2)}
              />
            )}

            {currentStep === 2 && primaryService && (
              <Step2DateTime
                tenantSlug={tenantSlug}
                primaryServiceId={primaryService.id}
                totalDurationMin={totalDurationMin}
                totalPriceNok={totalPriceNok}
                serviceSummary={
                  selectedServices.length > 1
                    ? selectedServices.map((s) => s.name).join(" + ")
                    : primaryService.name
                }
                currency={tenantConfig.rules.currency}
                selectedDate={selectedDate}
                selectedSlotIso={selectedSlotIso}
                onSelectDate={setSelectedDate}
                onSelectSlot={setSelectedSlotIso}
                onBack={() => setCurrentStep(1)}
                onContinue={() => setCurrentStep(3)}
              />
            )}

            {currentStep === 3 && (
              <Step3Details
                customFields={tenantConfig.rules.customFields}
                cancellationPolicyText={tenantConfig.rules.cancellationPolicyText}
                details={customerDetails}
                selectedSlotIso={selectedSlotIso}
                selectedServices={selectedServices}
                currency={tenantConfig.rules.currency}
                serviceSummary={
                  selectedServices.length > 1
                    ? selectedServices.map((s) => s.name).join(" + ")
                    : primaryService.name
                }
                onChangeDetails={setCustomerDetails}
                onSubmit={handleSubmitBooking}
                onBack={() => setCurrentStep(2)}
                submitting={submitting}
                submitError={submitError}
              />
            )}

            {currentStep === 4 && (
              <Step4Confirmed
                bookingRef={bookingRef}
                selectedServices={selectedServices}
                selectedSlotIso={selectedSlotIso}
                customerName={customerDetails.name}
                customerEmail={customerDetails.email}
                customerPhone={customerDetails.phone}
                tenantName={resolvedStudioName}
                studioPhone={resolvedStudioPhone}
                currency={tenantConfig.rules.currency}
                onReset={handleReset}
                onClose={() => setIsOpen(false)}
              />
            )}
          </div>

          {/* Pinned Bottom Action Dock (Steps 1, 2, 3) */}
          {currentStep < 4 && (
            <div id="drawerPinnedDock" className="drawer-pinned-dock">
              <div className="dock-summary-col">
                <span className="dock-services-count" title={selectedServices.map((s) => s.name).join(" + ")}>
                  {selectedServices.length === 0
                    ? "Ingen behandling valgt"
                    : selectedServices.length === 1
                    ? selectedServices[0].name
                    : `${selectedServices[0].name} +${selectedServices.length - 1}`}
                </span>
                <span className="dock-total-price">
                  {selectedSlotIso ? `${formatDockSlot(selectedSlotIso)} · ` : ""}
                  {totalPriceNok} {tenantConfig.rules.currency || "kr"}
                </span>
              </div>

              {currentStep === 1 && (
                <button
                  type="button"
                  disabled={selectedServices.length === 0}
                  onClick={() => setCurrentStep(2)}
                  className="dock-submit-btn"
                >
                  <span>Neste</span>
                  <span aria-hidden="true">→</span>
                </button>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  disabled={!selectedSlotIso}
                  onClick={() => setCurrentStep(3)}
                  className="dock-submit-btn"
                >
                  <span>Neste</span>
                  <span aria-hidden="true">→</span>
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmitBooking()}
                  className="dock-submit-btn"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Sender...</span>
                    </span>
                  ) : (
                    <span>Bekreft Bestilling</span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
