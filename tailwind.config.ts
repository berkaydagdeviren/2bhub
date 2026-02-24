import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Reminder color system — used dynamically in getReminderColor()
    "bg-red-100", "bg-red-50", "bg-orange-50", "bg-amber-50", "bg-lime-50", "bg-emerald-50",
    "text-red-700", "text-red-600", "text-orange-600", "text-amber-600", "text-lime-600", "text-emerald-600",
    "bg-red-500", "bg-orange-400", "bg-amber-400", "bg-lime-400", "bg-emerald-400",
  ],
  theme: {
    extend: {
      colors: {
        hub: {
          bg: "#F7F5F0",
          card: "#FFFFFF",
          primary: "#1A1A1A",
          secondary: "#7A7468",
          accent: "#8B7355",
          "accent-hover": "#6D5A43",
          border: "#E5E0D8",
          error: "#C4464A",
          success: "#5A7C65",
          warning: "#D4A843",
          muted: "#B5AFA6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        hub: "0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "hub-md": "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03)",
        "hub-lg": "0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.03)",
      },
    },
  },
  plugins: [],
};

export default config;