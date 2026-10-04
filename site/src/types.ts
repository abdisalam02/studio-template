export interface TenantTheme {
  colors: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    accent: string;
    accentHover?: string;
    accentLight?: string;
  };
  logo?: string;
  watermarkText?: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: "select" | "text" | "checkbox";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface TenantConfig {
  id: string;
  name: string;
  allowMultiSelect: boolean;
  customFields: CustomField[];
  cancellationPolicyText: string;
  currency: string;
  theme?: TenantTheme;
}
