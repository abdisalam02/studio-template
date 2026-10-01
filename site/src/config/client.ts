// Central Client Studio Configuration
// Every tenant customization happens here.
// In database-driven multi-tenant setups, this can be synced from Supabase.

export interface ServiceItem {
  id: string;
  name: string;
  duration: string;
  price: number;
  description: string;
  tag?: string;
  photo?: string;
}

export interface ClientStudioConfig {
  tenantId: string;
  name: string;
  tagline: string;
  niche: string;
  location: string;
  address?: string;
  transit: string;
  hours: string;
  phone: string;
  email: string;
  orgNumber: string;
  mvaStatus: string;
  instagram: string;
  cancellationHours: number;
  services: ServiceItem[];
}

export const CLIENT_CONFIG: ClientStudioConfig = {
  tenantId: "atelier",
  name: "Atelier Studio",
  tagline: "Presisjonspleie og håndverk i hjertet av Oslo.",
  niche: "Skjønnhet & Velvære",
  location: "Pilestredet 12, Oslo",
  transit: "Trikk 11, 17, 18 til Dalsbergstien",
  hours: "Tir–Lør 10:00–18:00",
  phone: "+47 400 00 000",
  email: "post@atelier-studio.no",
  orgNumber: "999 888 777",
  mvaStatus: "MVA-registrert",
  instagram: "@atelier.oslo",
  cancellationHours: 24,
  services: [
    {
      id: "signature-treatment",
      name: "Signature Pleie & Form",
      duration: "60 min",
      price: 750,
      description: "Full konsultasjon, skånsom presisjonsforming og nærende finish.",
      tag: "Populær",
    },
    {
      id: "express-maintenance",
      name: "Ekspress Touch-up",
      duration: "30 min",
      price: 450,
      description: "Rask og effektiv vedlikeholdsbehandling mellom fulle timer.",
    },
    {
      id: "deluxe-ritual",
      name: "Deluxe Studio Ritual",
      duration: "90 min",
      price: 1100,
      description: "Dypgående behandling inkludert massasje og personlig tilpassede produkter.",
      tag: "Editorial",
    },
  ],
};
