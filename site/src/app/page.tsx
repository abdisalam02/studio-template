import type { CSSProperties } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getTenantConfig,
  DEFAULT_TENANT_SLUG,
  TENANTS,
  type TenantConfig,
  type TenantService,
} from "@/config/tenant.config";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { EditorialImage } from "@/components/ui/EditorialImage";
import { FiMapPin, FiClock, FiInstagram, FiShield, FiCheckCircle } from "react-icons/fi";
import type { ServiceRow } from "@/components/booking/Step1Services";

interface StudioData {
  id: string;
  name: string;
  tagline: string;
  niche: string;
  location: string;
  transit: string;
  hours: string;
  phone: string;
  email: string;
  orgNumber: string;
  mvaStatus: string;
  instagram: string;
  services: ServiceRow[];
}

const DEFAULT_SERVICE_IMAGE = "/demo/nails/pin-biab.jpg";

/**
 * Maps a central TenantService into the DB `services` row shape that the
 * booking drawer components consume. This lets the page render from config
 * even when Supabase is unavailable.
 */
function serviceToRow(
  service: TenantService,
  tenantId: string,
  index: number
): ServiceRow {
  return {
    id: typeof service.id === "number" ? service.id : Number(service.id) || index + 1,
    tenant_id: tenantId,
    name: service.name,
    duration_min: service.durationMin,
    price_nok: service.priceNok,
    buffer_min: service.bufferMin ?? null,
    active: service.active ?? true,
    sort: service.sort ?? index,
  };
}

/** Builds the page's studio view entirely from the central tenant config. */
function configToStudioData(config: TenantConfig): StudioData {
  return {
    id: config.id,
    name: config.name,
    tagline: config.tagline,
    niche: config.niche,
    location: config.contact.address,
    transit: config.contact.transit,
    hours: config.contact.hours,
    phone: config.contact.phone,
    email: config.contact.email,
    orgNumber: config.contact.orgNumber,
    mvaStatus: config.contact.mvaStatus,
    instagram: config.contact.instagram,
    services: config.services.map((service, index) =>
      serviceToRow(service, config.id, index)
    ),
  };
}

/**
 * Overlays live Supabase data (tenant name, owner email and active services)
 * on top of the config-derived defaults. Falls back cleanly when the DB is
 * unreachable or a studio has not been seeded yet.
 */
async function getStudioData(config: TenantConfig): Promise<StudioData> {
  const base = configToStudioData(config);
  if (!supabaseAdmin) return base;

  try {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", config.id)
      .maybeSingle();

    const { data: services } = await supabaseAdmin
      .from("services")
      .select("*")
      .eq("tenant_id", config.id)
      .eq("active", true)
      .order("sort", { ascending: true });

    return {
      ...base,
      name: tenant?.name || base.name,
      email: tenant?.owner_email || base.email,
      services:
        services && services.length > 0 ? (services as ServiceRow[]) : base.services,
    };
  } catch (err) {
    console.error("Error fetching studio data:", err);
    return base;
  }
}

interface PageProps {
  searchParams?: Promise<{ tenant?: string }>;
}

export default async function StudioHomePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const activeSlug = searchParams?.tenant || DEFAULT_TENANT_SLUG;
  const config = getTenantConfig(activeSlug);
  const studio = await getStudioData(config);
  const c = config.theme.colors;

  // Optional per-service artwork comes straight from the tenant config.
  const serviceImages: Record<string, string> = {};
  for (const service of config.services) {
    if (service.photo) serviceImages[service.name] = service.photo;
  }

  // Expose the active palette to any CSS that reads the brand variables
  // (e.g. booking.css trigger bar) so the whole page re-skins per tenant.
  const themeVars = {
    "--brand-bg": c.canvas,
    "--brand-surface": c.card,
    "--brand-text": c.value,
    "--brand-muted": c.label,
    "--brand-border": c.border,
    "--brand-accent": c.accent,
    "--studio-bg": c.canvas,
    "--studio-text": c.value,
    "--studio-card": c.card,
    "--studio-border": c.border,
    "--studio-muted": c.label,
    "--studio-accent": c.accent,
  } as CSSProperties;

  return (
    <div
      className="min-h-dvh relative"
      data-tenant={config.id}
      style={{ backgroundColor: c.canvas, color: c.value, ...themeVars }}
    >
      {/* Background Subtle Watermark */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
        aria-hidden="true"
      >
        <span
          className="text-[25vw] font-black uppercase tracking-tighter opacity-[0.05]"
          style={{ color: c.watermark }}
        >
          {config.theme.watermarkText || config.name}
        </span>
      </div>

      <div className="relative z-10">
        {/* 1. Top Editorial Navigation */}
        <nav
          className="border-b sticky top-0 z-30 backdrop-blur"
          style={{ borderColor: c.border, backgroundColor: c.band }}
        >
          <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold tracking-tight uppercase text-sm" style={{ color: c.value }}>
                {studio.name}
              </span>
              <span
                className="hidden sm:inline-block text-[11px] border-l pl-3"
                style={{ borderColor: c.border, color: c.soft }}
              >
                {studio.location}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Tenant switcher, driven by the central registry */}
              <div
                className="flex items-center border rounded-full overflow-hidden text-[10px] font-semibold"
                style={{ borderColor: c.border, backgroundColor: c.recessed }}
              >
                {Object.values(TENANTS).map((tenant) => {
                  const isActive = tenant.id === config.id;
                  return (
                    <a
                      key={tenant.id}
                      href={`/?tenant=${tenant.id}`}
                      className="px-2 py-0.5 transition-colors"
                      style={{
                        backgroundColor: isActive ? tenant.theme.colors.accent : "transparent",
                        color: isActive ? tenant.theme.colors.valueText : c.label,
                      }}
                    >
                      {tenant.shortName}
                    </a>
                  );
                })}
              </div>

              <a
                href={`https://instagram.com/${studio.instagram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="hover:opacity-80 transition-opacity text-xs flex items-center gap-1"
                style={{ color: c.label }}
              >
                <FiInstagram />
                <span className="hidden sm:inline">{studio.instagram}</span>
              </a>
              <a
                href="#book"
                className="py-1.5 px-3.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: c.accent, color: c.valueText }}
              >
                Bestill time
              </a>
            </div>
          </div>
        </nav>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-16">
          {/* 2. Hero Presentation */}
          <section className="space-y-5">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs"
              style={{ borderColor: c.border, backgroundColor: c.recessed, color: c.label }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: c.green }}
              />
              <span className="font-medium">Neste ledige time: I dag 16:30</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl font-black tracking-tight uppercase leading-[0.95]"
              style={{ color: c.value }}
            >
              {studio.name}
            </h1>

            <p className="text-base leading-relaxed max-w-lg" style={{ color: c.label }}>
              {studio.tagline}
            </p>

            <div className="pt-2">
              <a
                href="#book"
                className="inline-block py-3 px-6 rounded-full text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity"
                style={{ backgroundColor: c.accent, color: c.valueText }}
              >
                Se ledige timer
              </a>
            </div>
          </section>

          {/* 3. Editorial Visual Showcase / Treatment Menu */}
          <section className="space-y-6">
            <div
              className="border-b pb-3 flex justify-between items-end"
              style={{ borderColor: c.border }}
            >
              <div>
                <span
                  className="text-[10px] uppercase font-bold tracking-widest block"
                  style={{ color: c.soft }}
                >
                  Meny & Priser
                </span>
                <h2 className="text-xl font-bold tracking-tight" style={{ color: c.value }}>
                  Behandlinger
                </h2>
              </div>
              <span className="text-xs" style={{ color: c.soft }}>
                {studio.services.length} tilgjengelige valg
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {studio.services.map((item) => {
                const imageSrc = serviceImages[item.name] || DEFAULT_SERVICE_IMAGE;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border overflow-hidden flex flex-col justify-between"
                    style={{ borderColor: c.border, backgroundColor: c.card }}
                  >
                    <EditorialImage
                      src={imageSrc}
                      alt={item.name}
                      aspectRatio="16/10"
                      className="w-full"
                    />

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-sm" style={{ color: c.value }}>
                            {item.name}
                          </h3>
                          <span className="font-bold text-sm shrink-0" style={{ color: c.accent }}>
                            {item.price_nok > 0
                              ? `${item.price_nok} ${config.rules.currency}`
                              : "Gratis"}
                          </span>
                        </div>
                        <div className="text-xs pt-1" style={{ color: c.soft }}>
                          Varighet: {item.duration_min} minutter
                        </div>
                      </div>

                      <a
                        href="#book"
                        className="w-full text-center py-2 px-3 rounded-xl border text-xs font-semibold transition-colors"
                        style={{ borderColor: c.borderStrong, color: c.value }}
                      >
                        Velg i timebestilling
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. Studio Standards & Hygiene Guarantee */}
          <section
            className="rounded-2xl border p-6 space-y-5"
            style={{ borderColor: c.border, backgroundColor: c.card }}
          >
            <div className="flex items-center gap-2">
              <FiShield className="text-lg" style={{ color: c.accent }} />
              <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: c.value }}>
                Studio Standard & Trygghet
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: c.value }}>
                  <FiCheckCircle style={{ color: c.green }} />
                  Sertifiserte produkter
                </div>
                <p className="text-xs leading-relaxed" style={{ color: c.label }}>
                  Høyeste standard for materialer og holdbarhet.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: c.value }}>
                  <FiCheckCircle style={{ color: c.green }} />
                  Presisjonsarbeid
                </div>
                <p className="text-xs leading-relaxed" style={{ color: c.label }}>
                  Nøye tilpasset anatomi for optimalt resultat.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: c.value }}>
                  <FiCheckCircle style={{ color: c.green }} />
                  Enkel avbestilling
                </div>
                <p className="text-xs leading-relaxed" style={{ color: c.label }}>
                  Avbestill selv inntil 24 timer før oppmøte med ett klikk.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Sliding Booking Bottom Sheet Engine & Trigger Bar */}
          <div id="book" className="sr-only" aria-hidden="true" />
          <BookingWidget
            tenantSlug={config.id}
            tenantConfig={config}
            initialServices={studio.services}
            studioName={studio.name}
            studioPhone={studio.phone}
          />

          {/* 6. Location & Contact Details */}
          <section
            className="p-5 rounded-2xl border space-y-3 text-xs"
            style={{ borderColor: c.border, backgroundColor: c.card }}
          >
            <div className="flex items-start gap-3">
              <FiMapPin className="mt-0.5 shrink-0" style={{ color: c.accent }} />
              <div>
                <div className="font-bold" style={{ color: c.value }}>
                  {studio.location}
                </div>
                <div className="text-[11px]" style={{ color: c.label }}>
                  {studio.transit}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FiClock className="mt-0.5 shrink-0" style={{ color: c.accent }} />
              <div>
                <div className="font-bold" style={{ color: c.value }}>
                  {studio.hours}
                </div>
                <div className="text-[11px]" style={{ color: c.label }}>
                  Drop-in etter avtale · {studio.email}
                </div>
              </div>
            </div>
          </section>

          {/* 7. Editorial Footer */}
          <footer
            className="pt-8 border-t text-xs space-y-2 text-center pb-12"
            style={{ borderColor: c.border, color: c.soft }}
          >
            <div>
              {studio.name} · Org.nr. {studio.orgNumber} · {studio.mvaStatus}
            </div>
            <div>
              {studio.location} · {studio.email}
            </div>
            <div className="pt-2 flex items-center justify-center gap-3 text-[11px]">
              <a href={`/admin?tenant=${config.id}`} className="hover:underline">
                Admin Portal
              </a>
              <span>·</span>
              <a href="/library" className="hover:underline">
                UI Library
              </a>
              <span>·</span>
              <a href="/inspo" className="hover:underline">
                Inspo Gallery
              </a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
