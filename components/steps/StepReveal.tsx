"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface StepRevealProps {
  onEnter: () => void;
}

const spring = { type: "spring" as const, stiffness: 280, damping: 26 };

/**
 * In-Dinner style: fixed full-screen, content centered with max-w-2xl.
 * Enter button: motion + whileHover/whileTap so it feels alive.
 */
export default function StepReveal({ onEnter }: StepRevealProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#e4e9f2] via-[#eef1f7] to-[#f2f5fa]"
      style={{ top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh" }}
    >
      <div className="fog-layer fog-dense" />
      <div className="fog-layer fog-billows" />
      <div className="fog-layer fog-wisps" />
      <div className="grain-overlay" />

      {/* In-Dinner-style centering: single column, max-w-2xl, padded */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 py-20 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, filter: "blur(14px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex justify-center"
        >
          <div
            className="relative inline-flex items-center justify-center"
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
          transition={{ ...spring, delay: 0.6 }}
          className="font-leo mt-6 text-lg font-light tracking-wide text-[#0242FF]/90 sm:text-xl"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          Climb the Clouds. Build a Culture.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 1 }}
          className="mt-10 flex justify-center"
        >
          <motion.button
            type="button"
            onClick={onEnter}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="leo-btn-enter font-leo min-w-[160px] px-10 py-4 text-base font-semibold text-[#0242FF] sm:text-lg"
            style={{ fontFamily: "var(--font-leo)" }}
          >
            Enter
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
