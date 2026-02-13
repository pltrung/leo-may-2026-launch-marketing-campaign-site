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
        fog: "#f5f6f8",
        mist: "#e8eaed",
        "text-dark": "#1a1d21",
      },
      fontFamily: {
        leo: ["var(--font-leo)", "Leo May", "system-ui", "sans-serif"],
      },
      animation: {
        "fog-drift": "fogDrift 28s ease-in-out infinite",
        "logo-reveal": "logoReveal 1.8s ease-out forwards",
        "cloud-float": "cloudFloat 7s ease-in-out infinite",
        "cloud-float-slow": "cloudFloat 9s ease-in-out infinite",
        "cloud-float-fast": "cloudFloat 5.5s ease-in-out infinite",
        "cloud-pulse": "cloudPulse 4s ease-in-out infinite",
        "count-up": "countUp 1s ease-out forwards",
      },
      keyframes: {
        fogDrift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(3%, 2%) scale(1.02)" },
          "66%": { transform: "translate(-2%, 3%) scale(0.98)" },
        },
        logoReveal: {
          "0%": { opacity: "0", filter: "blur(14px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },
        cloudFloat: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg) scale(1)" },
          "50%": { transform: "translateY(-12px) rotate(2deg) scale(1.02)" },
        },
        cloudPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.92" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
