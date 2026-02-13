"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface StepRevealProps {
  onEnter: () => void;
}

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

export default function StepReveal({ onEnter }: StepRevealProps) {
  return (
    <motion.div
      key="reveal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#f0f2f5] via-[#f5f7fa] to-[#e8eaed]"
    >
      <div
        className="fog-layer"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 30%, rgba(255,255,255,0.9) 0%, transparent 50%),
            radial-gradient(ellipse 100% 120% at 80% 70%, rgba(230,235,245,0.7) 0%, transparent 45%)
          `,
          animation: "fogDrift 28s ease-in-out infinite",
        }}
      />
      <div
        className="fog-layer"
        style={{
          background: `radial-gradient(ellipse 110% 90% at 30% 80%, rgba(235,240,250,0.5) 0%, transparent 50%)`,
          animation: "fogDrift 32s ease-in-out infinite reverse",
          animationDelay: "-6s",
        }}
      />
      <div className="grain-overlay" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          <div className="relative" style={{ padding: "clamp(2rem, 6vw, 4rem)", maxWidth: "min(280px, 80vw)" }}>
            <Image
              src="/logo.svg"
              alt="Leo Mây"
              width={322}
              height={143}
              className="h-auto w-full object-contain"
              priority
            />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.5 }}
          className="mt-6 font-leo text-3xl font-semibold tracking-tight text-[#1a1d21] md:text-5xl"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          Leo Mây
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.7 }}
          className="mt-2 font-light tracking-wide text-[#4a4d52] md:text-lg"
        >
          Climb the Clouds. Build a Culture.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 1.1 }}
          onClick={onEnter}
          className="leo-btn-primary mt-12 rounded-2xl px-10 py-4 text-base"
        >
          Enter
        </motion.button>
      </div>
    </motion.div>
  );
}
