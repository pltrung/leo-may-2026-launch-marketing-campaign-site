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
        "leo-blue": "#0242FF",
        "leo-green": "#00CB4D",
        "leo-yellow": "#FDFF52",
        "fog": "#f5f6f8",
        "mist": "#e8eaed",
        "text-dark": "#1a1d21",
      },
      fontFamily: {
        leo: ["var(--font-leo)", "system-ui", "sans-serif"],
      },
      animation: {
        "fog-drift": "fogDrift 25s ease-in-out infinite",
        "logo-reveal": "logoReveal 1.5s ease-out forwards",
        "cloud-float": "cloudFloat 8s ease-in-out infinite",
        "count-up": "countUp 1s ease-out forwards",
      },
      keyframes: {
        fogDrift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(2%, 1%) scale(1.02)" },
          "66%": { transform: "translate(-1%, 2%) scale(0.98)" },
        },
        logoReveal: {
          "0%": { opacity: "0", filter: "blur(8px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },
        cloudFloat: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(1.5deg)" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
