import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--brand-bg)",
        foreground: "var(--brand-text)",
        surface: "var(--brand-surface)",
        muted: "var(--brand-muted)",
        border: "var(--brand-border)",
        accent: "var(--brand-accent)",
        card: "var(--brand-surface)",
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
