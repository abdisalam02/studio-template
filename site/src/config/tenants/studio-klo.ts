import type { TenantConfig } from "./types";

export const STUDIO_KLO_CONFIG: TenantConfig = {
  id: "studio-klo",
  name: "STUDIO KLŌ",
  allowMultiSelect: true,
  currency: "kr",
  cancellationPolicyText:
    "Timer må avbestilles senest 24 timer før oppmøte. Uteblivelse eller for sen avbestilling belastes med 50% av behandlingen.",
  customFields: [
    {
      id: "current_nails",
      label: "Hva har du på neglene nå?",
      type: "select",
      options: [
        "Helt bare negler",
        "Gammel gele (trenger fjerning)",
        "Akryl / Dip",
      ],
      required: true,
    },
  ],
  theme: {
    colors: {
      bg: "#f7f4ee",
      surface: "#ffffff",
      text: "#2c332d",
      muted: "#7c857d",
      border: "#e5e0d8",
      accent: "#4a5848",
    },
    watermarkText: "KLŌ",
  },
};
