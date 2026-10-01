"use client";

import React, { useState, useEffect } from "react";
import { Stepper } from "./Stepper";
import { SelectionBar } from "./SelectionBar";
import { Step1Services, type ServiceRow } from "./Step1Services";
import { Step2DateTime } from "./Step2DateTime";
import { Step3Details, type CustomerDetails } from "./Step3Details";
import { Step4Confirmed } from "./Step4Confirmed";
import type { TenantConfig } from "@/config/tenants/types";
import { GANGINA_CONFIG } from "@/config/tenants/gangina";

interface BookingWidgetProps {
  tenantSlug?: string;
  tenantConfig?: TenantConfig;
  initialServices?: ServiceRow[];
}

export function BookingWidget({
  tenantSlug = "atelier",
  tenantConfig = GANGINA_CONFIG,
  initialServices = [],
}: BookingWidgetProps) {
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

  // Fetch tenant services if not provided initially
  useEffect(() => {
    if (initialServices.length > 0) return;

    let isCancelled = false;
    setServicesLoading(true);

    fetch(`/api/v1/t/${tenantSlug}/availability?from=${new Date().toISOString().split("T")[0]}&to=${new Date().toISOString().split("T")[0]}&service_id=1`)
      .catch(() => null);

    // Fetch active services directly
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

  // Fallback fallback mock if database services table has no rows
  useEffect(() => {
    if (!servicesLoading && services.length === 0) {
      const fallback: ServiceRow[] = [
        {
          id: 1,
          tenant_id: tenantSlug,
          name: "Signature Pleie & Form",
          duration_min: 60,
          price_nok: 750,
          buffer_min: 10,
          active: true,
          sort: 0,
        },
        {
          id: 2,
          tenant_id: tenantSlug,
          name: "Ekspress Touch-up",
          duration_min: 30,
          price_nok: 450,
          buffer_min: 10,
          active: true,
          sort: 1,
        },
        {
          id: 3,
          tenant_id: tenantSlug,
          name: "Deluxe Studio Ritual",
          duration_min: 90,
          price_nok: 1100,
          buffer_min: 15,
          active: true,
          sort: 2,
        },
      ];
      setServices(fallback);
      setSelectedServiceIds([fallback[0].id]);
    }
  }, [servicesLoading, services.length, tenantSlug]);

  const handleToggleService = (service: ServiceRow) => {
    if (tenantConfig.allowMultiSelect) {
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

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotIso || selectedServices.length === 0) return;

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
          customer_name: customerDetails.name,
          customer_email: customerDetails.email,
          customer_phone: customerDetails.phone,
          notes: customerDetails.notes,
          custom_fields: customerDetails.customFields,
          consent: true,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setSubmitError(
          "Beklager, dette tidspunktet ble akkurat reservert av en annen kunde. Vennligst gå tilbake og velg et annet tidspunkt."
        );
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || "Kunne ikke opprette timebestilling.");
      }

      setBookingRef(data.ref);
      setCurrentStep(4);
    } catch (err: unknown) {
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

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border border-border bg-surface p-4 sm:p-8 space-y-6 shadow-sm">
      {/* Stepper Wizard Header */}
      <Stepper currentStep={currentStep} />

      {/* Floating Summary Bar (Steps 1, 2, 3) */}
      {currentStep < 4 && selectedServices.length > 0 && (
        <SelectionBar
          selectedNames={selectedServices.map((s) => s.name)}
          totalPriceNok={totalPriceNok}
          currency={tenantConfig.currency}
        />
      )}

      {/* Step 1: Services */}
      {currentStep === 1 && (
        <Step1Services
          services={services}
          selectedServiceIds={selectedServiceIds}
          allowMultiSelect={tenantConfig.allowMultiSelect}
          currency={tenantConfig.currency}
          onToggleService={handleToggleService}
          onContinue={() => setCurrentStep(2)}
        />
      )}

      {/* Step 2: Date & Time */}
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
          currency={tenantConfig.currency}
          selectedDate={selectedDate}
          selectedSlotIso={selectedSlotIso}
          onSelectDate={setSelectedDate}
          onSelectSlot={setSelectedSlotIso}
          onBack={() => setCurrentStep(1)}
          onContinue={() => setCurrentStep(3)}
        />
      )}

      {/* Step 3: Details & Custom Intake */}
      {currentStep === 3 && (
        <Step3Details
          customFields={tenantConfig.customFields}
          cancellationPolicyText={tenantConfig.cancellationPolicyText}
          details={customerDetails}
          selectedSlotIso={selectedSlotIso}
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

      {/* Step 4: Confirmed */}
      {currentStep === 4 && (
        <Step4Confirmed
          bookingRef={bookingRef}
          selectedServices={selectedServices}
          selectedSlotIso={selectedSlotIso}
          customerName={customerDetails.name}
          customerEmail={customerDetails.email}
          tenantName={tenantConfig.name}
          currency={tenantConfig.currency}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
