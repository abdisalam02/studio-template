import type { TenantConfig } from "./types";

export const GANGINA_CONFIG: TenantConfig = {
  id: "gangina",
  name: "Gangina Beauty Studio",
  allowMultiSelect: true,
  currency: "kr",
  cancellationPolicyText:
    "Timer må avbestilles senest 24 timer før oppmøte. Uteblivelse eller for sen avbestilling belastes med 50% av behandlingen.",
  customFields: [
    {
      id: "placement",
      label: "Tannplassering / Tooth Placement",
      type: "select",
      options: [
        "Upper Canine",
        "Central Incisor",
        "Premolar",
        "Custom / Usikker",
      ],
      required: false,
    },
  ],
  theme: {
    colors: {
      bg: "#ece8e1",
      surface: "#ffffff",
      text: "#1a1a1a",
      muted: "#8a8a8a",
      border: "#e2ded7",
      accent: "#d4af37",
    },
    watermarkText: "GANGINA",
  },
};
