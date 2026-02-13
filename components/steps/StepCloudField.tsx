"use client";

import { motion } from "framer-motion";
import { cloudPersonalities, CloudPersonality } from "@/lib/cloudData";

interface StepCloudFieldProps {
  onCloudClick: (personality: CloudPersonality) => void;
}

/* Organic blob shapes — reference: wispy, irregular, non-geometric */
const blobShapes = [
  "42% 58% 55% 45% / 52% 48% 52% 48%",
  "60% 40% 30% 70% / 55% 45% 55% 45%",
  "38% 62% 62% 38% / 48% 52% 48% 52%",
  "55% 45% 40% 60% / 60% 40% 60% 40%",
  "45% 55% 55% 45% / 40% 60% 40% 60%",
  "50% 50% 35% 65% / 58% 42% 58% 42%",
];

const floatDurations = [7, 9, 5.5, 7, 8, 6];
const spring = { type: "spring" as const, stiffness: 260, damping: 28 };

function getTintGlow(tint: CloudPersonality["tint"]) {
  switch (tint) {
    case "blue":
      return "0 0 64px rgba(2,66,255,0.28), 0 0 120px rgba(2,66,255,0.1)";
    case "green":
      return "0 0 64px rgba(0,203,77,0.24), 0 0 100px rgba(0,203,77,0.08)";
    case "yellow":
      return "0 0 56px rgba(253,255,82,0.22), 0 0 90px rgba(253,255,82,0.06)";
    default:
      return "0 0 48px rgba(2,66,255,0.16), 0 0 80px rgba(2,66,255,0.05)";
  }
}

/**
 * Cloud field: In-Dinner-style centered layout; volumetric clouds with hover/tap alive.
 */
export default function StepCloudField({ onCloudClick }: StepCloudFieldProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex min-h-full w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#e4e9f2] via-[#eef1f7] to-[#f2f5fa]"
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="fog-layer fog-dense" />
      <div className="fog-layer fog-billows" />
      <div className="fog-layer fog-wisps" />
      <div className="grain-overlay" />

      {/* Centered grid — max-w-5xl like In-Dinner content width feel */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-wrap items-center justify-center gap-8 sm:gap-10 md:gap-12">
        {cloudPersonalities.map((p, i) => (
          <motion.button
            key={p.id}
            type="button"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 * i }}
            whileHover={{ scale: 1.06, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onCloudClick(p)}
            className="leo-cloud group relative h-32 w-40 cursor-pointer touch-manipulation sm:h-36 sm:w-44 md:h-40 md:w-48 overflow-hidden"
            style={{
              borderRadius: blobShapes[i % blobShapes.length],
              animation: `cloudFloat ${floatDurations[i % floatDurations.length]}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          >
            {/* Hover glow — tint by personality */}
            <span
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                borderRadius: blobShapes[i % blobShapes.length],
                boxShadow: getTintGlow(p.tint),
              }}
              aria-hidden
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
