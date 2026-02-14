"use client";

import { motion } from "framer-motion";

interface HoldButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "default";
  accent?: "blue" | "green";
}

export default function HoldButton({
  children,
  onClick,
  variant = "primary",
  accent = "blue",
}: HoldButtonProps) {
  const bg = accent === "blue" ? "#0242FF" : "#00CB4D";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center justify-center px-12 py-5 max-w-[90vw] w-[min(260px,90vw)] cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-storm/30 focus:ring-offset-2"
      style={{
        background: bg,
        clipPath:
          "polygon(4% 0%, 96% 2%, 100% 22%, 98% 48%, 100% 78%, 94% 98%, 6% 100%, 0% 78%, 2% 48%, 0% 22%)",
        boxShadow:
          "inset 0 2px 4px rgba(255,255,255,0.12), inset 0 -1px 2px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.1)",
      }}
      whileHover={{
        y: -3,
        boxShadow:
          "inset 0 2px 4px rgba(255,255,255,0.12), inset 0 -1px 2px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.14)",
      }}
      whileTap={{
        y: 1,
        boxShadow:
          "inset 0 3px 6px rgba(0,0,0,0.1), inset 0 -1px 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.08)",
      }}
      transition={{ duration: 0.2 }}
    >
      <span className="text-white font-medium tracking-wide text-lg relative z-10">{children}</span>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(255,255,255,0.15) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute w-2.5 h-2.5 rounded-full opacity-20"
        style={{ left: "16%", top: "32%", background: "rgba(0,0,0,0.3)", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.2)" }}
      />
      <div
        className="absolute w-2.5 h-2.5 rounded-full opacity-20"
        style={{ right: "20%", top: "38%", background: "rgba(0,0,0,0.3)", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.2)" }}
      />
      <div
        className="absolute w-2 h-2 rounded-full opacity-15"
        style={{
          left: "50%",
          bottom: "30%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.3)",
          boxShadow: "inset 0 1px 1px rgba(0,0,0,0.2)",
        }}
      />
    </motion.button>
  );
}
