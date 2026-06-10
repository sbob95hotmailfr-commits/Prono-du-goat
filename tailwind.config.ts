import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F8F9FA",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#16A34A",
          dark: "#15803D",
        },
        gold: {
          DEFAULT: "#D97706",
          light: "#FEF3C7",
        },
        dark: "#111827",
        muted: "#6B7280",
        border: "#E5E7EB",
        danger: "#DC2626",
        locked: "#374151",
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
