"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface StepRevealProps {
  onEnter: () => void;
}

const spring = { type: "spring" as const, stiffness: 280, damping: 26 };

export default function StepReveal({ onEnter }: StepRevealProps) {
  return (
    <motion.div
      key="reveal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-50 flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#eef1f7] via-[#f2f5fa] to-[#e8eaed]"
    >
      <div
        className="fog-layer"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 30%, rgba(255,255,255,0.92) 0%, transparent 50%),
            radial-gradient(ellipse 100% 120% at 80% 70%, rgba(230,238,252,0.6) 0%, transparent 45%),
            radial-gradient(ellipse 80% 100% at 50% 50%, rgba(2,66,255,0.02) 0%, transparent 55%)
          `,
          animation: "fogDrift 28s ease-in-out infinite",
        }}
      />
      <div
        className="fog-layer"
        style={{
          background: `radial-gradient(ellipse 110% 90% at 30% 80%, rgba(235,245,255,0.4) 0%, transparent 50%)`,
          animation: "fogDrift 32s ease-in-out infinite reverse",
          animationDelay: "-6s",
        }}
      />
      <div className="grain-overlay" />

      {/* In-Dinner style: max-w-2xl mx-auto, full width flex center (mobile + web) */}
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 py-8 text-center sm:px-6">
        {/* Logo only — no duplicate "Leo Mây" text; logo is the brand */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(14px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex items-center justify-center"
        >
          <div
            className="relative flex items-center justify-center"
            style={{
              padding: "clamp(2rem, 6vw, 4rem)",
              maxWidth: "min(280px, 85vw)",
              filter: "drop-shadow(0 0 32px rgba(2,66,255,0.22)) drop-shadow(0 0 64px rgba(2,66,255,0.1))",
            }}
          >
            <Image
              src="/logo.svg"
              alt="Leo Mây — Climbing Gym"
              width={322}
              height={143}
              className="h-auto w-full object-contain"
              priority
              unoptimized
            />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.7 }}
          className="font-leo mt-6 text-lg font-light tracking-wide text-[#0242FF]/85 sm:text-xl"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          Climb the Clouds. Build a Culture.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 1.1 }}
          className="mt-10 w-full max-w-xs sm:max-w-sm"
        >
          <button
            type="button"
            onClick={() => onEnter()}
            className="leo-btn-primary font-leo w-full rounded-2xl px-8 py-4 text-base font-semibold text-white sm:py-4 sm:text-lg"
            style={{ fontFamily: "var(--font-leo)" }}
          >
            Enter
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
