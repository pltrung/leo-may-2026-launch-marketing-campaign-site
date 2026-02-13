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
        "text-dark": "#1a1d21",
      },
      fontFamily: {
        leo: ["var(--font-leo)", "Leo May", "system-ui", "sans-serif"],
      },
      animation: {
        "cloud-float": "cloudFloat 7s ease-in-out infinite",
        "logo-reveal": "logoReveal 1.8s ease-out forwards",
      },
      keyframes: {
        logoReveal: {
          "0%": { opacity: "0", filter: "blur(14px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },
        cloudFloat: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg) scale(1)" },
          "50%": { transform: "translateY(-12px) rotate(2deg) scale(1.02)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
