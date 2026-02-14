"use client";

import { motion } from "framer-motion";

interface HoldButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  accent?: "blue" | "green";
}

export default function HoldButton({ children, onClick, accent = "blue" }: HoldButtonProps) {
  const bg = accent === "blue" ? "#0242FF" : "#00CB4D";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center justify-center px-10 py-5 max-w-[90vw] w-[min(280px,90vw)] cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-storm/30 focus:ring-offset-2 rounded-sm"
      style={{
        background: bg,
        clipPath: "polygon(8% 0%, 92% 0%, 100% 15%, 100% 85%, 92% 100%, 8% 100%, 0% 85%, 0% 15%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 14px rgba(0,0,0,0.12)",
      }}
      whileHover={{
        y: -3,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 20px rgba(0,0,0,0.15)",
      }}
      whileTap={{
        y: 1,
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)",
      }}
      transition={{ duration: 0.2 }}
    >
      <span className="text-white font-medium tracking-wide text-lg relative z-10">{children}</span>
      <div
        className="absolute inset-0 pointer-events-none rounded"
        style={{
          background: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 50%)",
        }}
      />
      <div
        className="absolute w-2 h-2 rounded-full opacity-30"
        style={{ left: "18%", top: "35%", background: "rgba(0,0,0,0.2)" }}
      />
      <div
        className="absolute w-2 h-2 rounded-full opacity-30"
        style={{ right: "22%", top: "40%", background: "rgba(0,0,0,0.2)" }}
      />
      <div
        className="absolute w-1.5 h-1.5 rounded-full opacity-25"
        style={{ left: "50%", bottom: "28%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.2)" }}
      />
    </motion.button>
  );
}
