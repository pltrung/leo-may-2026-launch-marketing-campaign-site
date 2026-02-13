import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cloud: "#F5F7FA",
        mist: "#DDE2E6",
        storm: "#1E2A38",
        sage: "#9BAF9D",
        accent: "#F4A261",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        fog: "fogDrift 45s ease-in-out infinite",
      },
      keyframes: {
        fogDrift: {
          "0%, 100%": { opacity: "1", transform: "translate(0, 0) scale(1)" },
          "33%": { opacity: "0.95", transform: "translate(1%, -0.5%) scale(1.01)" },
          "66%": { opacity: "0.98", transform: "translate(-0.5%, 0.5%) scale(0.99)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
