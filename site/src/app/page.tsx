import { supabaseAdmin } from "@/lib/supabase";
import { getTenantConfig } from "@/config/tenants";
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

const FALLBACK_GANGINA: StudioData = {
  id: "gangina",
  name: "Gangina Gems",
  tagline: "Eksklusiv tannsmykking og grillz i Oslo. Sertifisert bonding og presisjonsplassering.",
  niche: "Tannsmykker & Grillz",
  location: "Bygdøy Allé, Oslo Sentrum",
  transit: "Kollektiv transport rett til døren",
  hours: "Mandag til Lørdag 10:00 - 18:00",
  phone: "+47 400 00 000",
  email: "post@gangina.no",
  orgNumber: "999 888 777",
  mvaStatus: "MVA-registrert",
  instagram: "@gangina.gems",
  services: [
    {
      id: 5,
      tenant_id: "gangina",
      name: "Single Gem",
      duration_min: 20,
      price_nok: 350,
      buffer_min: 10,
      active: true,
      sort: 1,
    },
    {
      id: 6,
      tenant_id: "gangina",
      name: "Iridescent Opal Gem",
      duration_min: 25,
      price_nok: 450,
      buffer_min: 10,
      active: true,
      sort: 2,
    },
    {
      id: 7,
      tenant_id: "gangina",
      name: "Custom Shape (Butterfly, Star)",
      duration_min: 35,
      price_nok: 550,
      buffer_min: 10,
      active: true,
      sort: 3,
    },
    {
      id: 8,
      tenant_id: "gangina",
      name: "Custom Grillz Konsultasjon",
      duration_min: 30,
      price_nok: 0,
      buffer_min: 10,
      active: true,
      sort: 4,
    },
  ],
};

const FALLBACK_STUDIO_KLO: StudioData = {
  id: "studio-klo",
  name: "STUDIO KLŌ",
  tagline: "Japansk strukturgelé & organisk neglekunst i Oslo. Naturlig neglehelse og skånsom pleie.",
  niche: "Japansk Strukturgelé & Neglekunst",
  location: "Frognerveien, Oslo Sentrum",
  transit: "Trikk 12 til Frogner plass",
  hours: "Tirsdag til Lørdag 10:00 - 19:00",
  phone: "+47 411 22 333",
  email: "hello@studioklo.no",
  orgNumber: "998 776 554",
  mvaStatus: "MVA-registrert",
  instagram: "@studio.klo",
  services: [
    {
      id: 101,
      tenant_id: "studio-klo",
      name: "Japansk Strukturgelé - Nytt Sett",
      duration_min: 60,
      price_nok: 750,
      buffer_min: 10,
      active: true,
      sort: 1,
    },
    {
      id: 102,
      tenant_id: "studio-klo",
      name: "Nail Art - Tier 2 (Organisk/Abstrakt)",
      duration_min: 30,
      price_nok: 350,
      buffer_min: 10,
      active: true,
      sort: 2,
    },
    {
      id: 103,
      tenant_id: "studio-klo",
      name: "Skånsom Fjerning av Gammel Gelé",
      duration_min: 20,
      price_nok: 200,
      buffer_min: 10,
      active: true,
      sort: 3,
    },
  ],
};

const SERVICE_IMAGES: Record<string, string> = {
  "Single Gem": "/img/defaults/gem-single.svg",
  "Iridescent Opal Gem": "/img/defaults/gem-opal.svg",
  "Custom Shape (Butterfly, Flower, Star)": "/img/defaults/gem-butterfly.svg",
  "Custom Shape (Butterfly, Star)": "/img/defaults/gem-butterfly.svg",
  "Custom Grillz Consultation & Impression": "/img/defaults/studio-interior.svg",
  "Custom Grillz Konsultasjon": "/img/defaults/studio-interior.svg",
  "Japansk Strukturgelé - Nytt Sett": "/img/defaults/studio-interior.svg",
  "Nail Art - Tier 2 (Organisk/Abstrakt)": "/img/defaults/gem-opal.svg",
  "Skånsom Fjerning av Gammel Gelé": "/img/defaults/gem-single.svg",
};

async function getStudioData(slug: string): Promise<StudioData> {
  const fallback = slug === "studio-klo" ? FALLBACK_STUDIO_KLO : FALLBACK_GANGINA;
  if (!supabaseAdmin) return fallback;

  try {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", slug)
      .single();

    const { data: services } = await supabaseAdmin
      .from("services")
      .select("*")
      .eq("tenant_id", slug)
      .eq("active", true)
      .order("sort", { ascending: true });

    if (!tenant) return fallback;

    return {
      id: tenant.id,
      name: tenant.name || fallback.name,
      tagline: fallback.tagline,
      niche: fallback.niche,
      location: fallback.location,
      transit: fallback.transit,
      hours: fallback.hours,
      phone: fallback.phone,
      email: tenant.owner_email || fallback.email,
      orgNumber: fallback.orgNumber,
      mvaStatus: fallback.mvaStatus,
      instagram: fallback.instagram,
      services: services && services.length > 0 ? services : fallback.services,
    };
  } catch (err) {
    console.error("Error fetching studio data:", err);
    return fallback;
  }
}

interface PageProps {
  searchParams?: Promise<{ tenant?: string }>;
}

export default async function StudioHomePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const slug = searchParams?.tenant || "gangina";
  const tenantConfig = getTenantConfig(slug);
  const studio = await getStudioData(slug);

  const themeColors = tenantConfig.theme?.colors || {
    bg: "#ece8e1",
    surface: "#ffffff",
    text: "#1a1a1a",
    muted: "#8a8a8a",
    border: "#e2ded7",
    accent: "#d4af37",
  };

  return (
    <div
      className="min-h-dvh relative"
      style={{
        backgroundColor: themeColors.bg,
        color: themeColors.text,
      }}
    >
      {/* Background Subtle Watermark */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.03] z-0"
        aria-hidden="true"
      >
        <span className="text-[25vw] font-black uppercase tracking-tighter">
          {tenantConfig.theme?.watermarkText || studio.name}
        </span>
      </div>

      <div className="relative z-10">
        {/* 1. Top Editorial Navigation */}
        <nav
          className="border-b sticky top-0 z-30"
          style={{
            borderColor: themeColors.border,
            backgroundColor: themeColors.bg,
          }}
        >
          <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold tracking-tight uppercase text-sm">
                {studio.name}
              </span>
              <span
                className="hidden sm:inline-block text-[11px] border-l pl-3"
                style={{ borderColor: themeColors.border, color: themeColors.muted }}
              >
                {studio.location}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Tenant switcher for preview */}
              <div
                className="flex items-center border rounded-full bg-white overflow-hidden text-[10px] font-semibold"
                style={{ borderColor: themeColors.border }}
              >
                <a
                  href="/?tenant=gangina"
                  className={`px-2 py-0.5 transition-colors ${
                    slug === "gangina"
                      ? "bg-[#1a1a1a] text-white"
                      : "text-[#8a8a8a] hover:text-[#1a1a1a]"
                  }`}
                >
                  Gangina
                </a>
                <a
                  href="/?tenant=studio-klo"
                  className={`px-2 py-0.5 transition-colors ${
                    slug === "studio-klo"
                      ? "bg-[#4a5848] text-white"
                      : "text-[#8a8a8a] hover:text-[#1a1a1a]"
                  }`}
                >
                  Klō
                </a>
              </div>

              <a
                href={`https://instagram.com/${studio.instagram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="hover:opacity-80 transition-opacity text-xs flex items-center gap-1"
                style={{ color: themeColors.muted }}
              >
                <FiInstagram />
                <span className="hidden sm:inline">{studio.instagram}</span>
              </a>
              <a
                href="#book"
                className="py-1.5 px-3.5 rounded-full text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: themeColors.accent || "#1a1a1a" }}
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
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs bg-white"
              style={{ borderColor: themeColors.border }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="font-medium">
                Neste ledige time: I dag 16:30
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase leading-[0.95]">
              {studio.name}
            </h1>

            <p
              className="text-base leading-relaxed max-w-lg"
              style={{ color: themeColors.muted }}
            >
              {studio.tagline}
            </p>

            <div className="pt-2">
              <a
                href="#book"
                className="inline-block py-3 px-6 rounded-full text-white text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity"
                style={{ backgroundColor: themeColors.accent || "#1a1a1a" }}
              >
                Se ledige timer
              </a>
            </div>
          </section>

          {/* 3. Editorial Visual Showcase / Treatment Menu */}
          <section className="space-y-6">
            <div
              className="border-b pb-3 flex justify-between items-end"
              style={{ borderColor: themeColors.border }}
            >
              <div>
                <span
                  className="text-[10px] uppercase font-bold tracking-widest block"
                  style={{ color: themeColors.muted }}
                >
                  Meny & Priser
                </span>
                <h2 className="text-xl font-bold tracking-tight">
                  Behandlinger
                </h2>
              </div>
              <span className="text-xs" style={{ color: themeColors.muted }}>
                {studio.services.length} tilgjengelige valg
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {studio.services.map((item) => {
                const imageSrc =
                  SERVICE_IMAGES[item.name] || "/img/defaults/studio-interior.svg";

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border bg-white overflow-hidden flex flex-col justify-between shadow-sm hover:border-[#1a1a1a] transition-colors"
                    style={{ borderColor: themeColors.border }}
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
                          <h3 className="font-bold text-sm">
                            {item.name}
                          </h3>
                          <span className="font-bold text-sm shrink-0">
                            {item.price_nok > 0 ? `${item.price_nok} ${tenantConfig.currency}` : "Gratis"}
                          </span>
                        </div>
                        <div
                          className="text-xs pt-1"
                          style={{ color: themeColors.muted }}
                        >
                          Varighet: {item.duration_min} minutter
                        </div>
                      </div>

                      <a
                        href="#book"
                        className="w-full text-center py-2 px-3 rounded-xl border text-xs font-semibold hover:bg-neutral-50 transition-colors"
                        style={{ borderColor: themeColors.border }}
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
            className="rounded-2xl border bg-white p-6 space-y-5"
            style={{ borderColor: themeColors.border }}
          >
            <div className="flex items-center gap-2">
              <FiShield className="text-lg" />
              <h2 className="text-base font-bold uppercase tracking-wide">
                Studio Standard & Trygghet
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <FiCheckCircle className="text-emerald-700" />
                  Sertifiserte produkter
                </div>
                <p className="text-xs leading-relaxed" style={{ color: themeColors.muted }}>
                  Høyeste standard for materialer og holdbarhet.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <FiCheckCircle className="text-emerald-700" />
                  Presisjonsarbeid
                </div>
                <p className="text-xs leading-relaxed" style={{ color: themeColors.muted }}>
                  Nøye tilpasset anatomi for optimalt resultat.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <FiCheckCircle className="text-emerald-700" />
                  Enkel avbestilling
                </div>
                <p className="text-xs leading-relaxed" style={{ color: themeColors.muted }}>
                  Avbestill selv inntil 24 timer før oppmøte med ett klikk.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Booking Engine Section */}
          <section
            id="book"
            className="space-y-4 pt-6 border-t scroll-mt-20"
            style={{ borderColor: themeColors.border }}
          >
            <div className="space-y-1">
              <span
                className="text-[10px] uppercase font-bold tracking-widest block"
                style={{ color: themeColors.muted }}
              >
                Reservasjon
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight">
                Bestill Time
              </h2>
              <p className="text-xs" style={{ color: themeColors.muted }}>
                Velg behandlinger og finn tidspunktet som passer for deg.
              </p>
            </div>

            <BookingWidget
              tenantSlug={studio.id}
              tenantConfig={tenantConfig}
              initialServices={studio.services}
            />
          </section>

          {/* 6. Location & Contact Details */}
          <section
            className="p-5 rounded-2xl border bg-white space-y-3 text-xs"
            style={{ borderColor: themeColors.border }}
          >
            <div className="flex items-start gap-3">
              <FiMapPin className="mt-0.5 shrink-0" style={{ color: themeColors.muted }} />
              <div>
                <div className="font-bold">{studio.location}</div>
                <div className="text-[11px]" style={{ color: themeColors.muted }}>
                  {studio.transit}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FiClock className="mt-0.5 shrink-0" style={{ color: themeColors.muted }} />
              <div>
                <div className="font-bold">{studio.hours}</div>
                <div className="text-[11px]" style={{ color: themeColors.muted }}>
                  Drop-in etter avtale · {studio.email}
                </div>
              </div>
            </div>
          </section>

          {/* 7. Editorial Footer */}
          <footer
            className="pt-8 border-t text-xs space-y-2 text-center pb-12"
            style={{ borderColor: themeColors.border, color: themeColors.muted }}
          >
            <div>
              {studio.name} · Org.nr. {studio.orgNumber} · {studio.mvaStatus}
            </div>
            <div>
              {studio.location} · {studio.email}
            </div>
            <div className="pt-2 flex items-center justify-center gap-3 text-[11px]">
              <a href={`/admin?tenant=${slug}`} className="hover:underline">
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
