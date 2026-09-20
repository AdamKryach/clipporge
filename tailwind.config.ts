import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce7fd",
          200: "#c0d3fb",
          300: "#94b4f8",
          400: "#618cf3",
          500: "#3e66ed",
          600: "#2d47e1",
          700: "#2638cf",
          800: "#2430a8",
          900: "#232e85",
          950: "#181f51",
        },
        surface: {
          950: "#0a0f1e",
          900: "#0f1424",
          800: "#12182a",
          700: "#1e293b",
          600: "#334155",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        shimmer: "shimmer 1.6s linear infinite",
        "spin-slow": "spin 2.4s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.3), 0 8px 24px -8px rgba(0,0,0,0.5)",
        glow: "0 0 40px -8px rgba(97,140,243,0.5)",
      },
    },
  },
  plugins: [],
};
export default config;