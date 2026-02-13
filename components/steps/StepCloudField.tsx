"use client";

import { motion } from "framer-motion";
import { cloudPersonalities, CloudPersonality } from "@/lib/cloudData";

interface StepCloudFieldProps {
  onCloudClick: (personality: CloudPersonality) => void;
}

const blobShapes = [
  "42% 58% 55% 45% / 52% 48% 52% 48%",
  "60% 40% 30% 70% / 55% 45% 55% 45%",
  "38% 62% 62% 38% / 48% 52% 48% 52%",
  "55% 45% 40% 60% / 60% 40% 60% 40%",
  "45% 55% 55% 45% / 40% 60% 40% 60%",
  "50% 50% 35% 65% / 58% 42% 58% 42%",
];

const cloudAnimations = [
  "cloudFloat 7s ease-in-out infinite",
  "cloudFloat 9s ease-in-out infinite",
  "cloudFloat 5.5s ease-in-out infinite",
  "cloudFloat 7s ease-in-out infinite",
  "cloudFloat 8s ease-in-out infinite",
  "cloudFloat 6s ease-in-out infinite",
];

const spring = { type: "spring" as const, stiffness: 260, damping: 28 };

export default function StepCloudField({ onCloudClick }: StepCloudFieldProps) {
  return (
    <motion.div
      key="cloudField"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#eef1f7] via-[#f2f5fa] to-[#e8eaed]"
    >
      <div
        className="fog-layer"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 30%, rgba(255,255,255,0.88) 0%, transparent 50%),
            radial-gradient(ellipse 100% 120% at 80% 70%, rgba(230,238,252,0.55) 0%, transparent 45%),
            radial-gradient(ellipse 90% 90% at 50% 50%, rgba(2,66,255,0.03) 0%, transparent 60%),
            radial-gradient(ellipse 70% 70% at 70% 30%, rgba(0,203,77,0.02) 0%, transparent 50%)
          `,
          animation: "fogDrift 26s ease-in-out infinite",
        }}
      />
      <div className="grain-overlay" />

      {/* Centered cloud grid — works on mobile (stack/wrap) and web */}
      <div className="relative z-10 flex min-h-full w-full max-w-5xl flex-wrap items-center justify-center gap-8 p-6 sm:gap-10 md:gap-12 md:p-10">
        {cloudPersonalities.map((p, i) => (
          <motion.button
            key={p.id}
            type="button"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spring, delay: 0.06 * i }}
            onClick={() => onCloudClick(p)}
            className="leo-cloud group relative h-32 w-40 cursor-pointer touch-manipulation sm:h-36 sm:w-44 md:h-40 md:w-48"
            style={{
              borderRadius: blobShapes[i % blobShapes.length],
              animation: cloudAnimations[i % cloudAnimations.length],
              animationDelay: `${i * 0.35}s`,
            }}
          >
            <span
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                borderRadius: blobShapes[i % blobShapes.length],
                boxShadow:
                  p.tint === "blue"
                    ? "0 0 60px rgba(2,66,255,0.25), 0 0 100px rgba(2,66,255,0.1)"
                    : p.tint === "green"
                    ? "0 0 60px rgba(0,203,77,0.22), 0 0 100px rgba(0,203,77,0.08)"
                    : p.tint === "yellow"
                    ? "0 0 50px rgba(253,255,82,0.2), 0 0 80px rgba(253,255,82,0.06)"
                    : "0 0 50px rgba(2,66,255,0.15), 0 0 80px rgba(2,66,255,0.05)",
              }}
            />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
