"use client";

import { motion } from "framer-motion";
import { cloudPersonalities, CloudPersonality } from "@/lib/cloudData";
import { CloudBlob } from "@/components/leo/CloudBlob";

interface CloudFieldViewProps {
  onSelect: (p: CloudPersonality) => void;
}

/** Organic placement — scattered, not grid */
const PLACEMENTS = [
  { x: 18, y: 28 },
  { x: 48, y: 18 },
  { x: 78, y: 32 },
  { x: 22, y: 58 },
  { x: 58, y: 52 },
  { x: 82, y: 68 },
];

export default function CloudFieldView({ onSelect }: CloudFieldViewProps) {
  return (
    <motion.div
      className="relative w-full h-full flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Prompt — minimal */}
      <motion.p
        className="absolute top-[10%] left-0 right-0 text-center text-white/40 text-sm tracking-[0.25em] uppercase z-10"
        style={{ fontFamily: "var(--font-leo)" }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        What type of cloud are you?
      </motion.p>

      {/* Cloud cluster — absolute within this container */}
      <div
        className="relative w-[min(95vw,560px)] h-[min(70vmin,420px)]"
        style={{ minHeight: 320 }}
      >
        {cloudPersonalities.map((p, i) => {
          const pos = PLACEMENTS[i];
          const depth = 0.2 + (i % 3) * 0.25;
          return (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: "28%",
                height: "28%",
                minWidth: 90,
                minHeight: 90,
                transform: "translate(-50%, -50%)",
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.3 + i * 0.12,
                duration: 1.2,
                ease: [0.22, 0.61, 0.36, 1],
              }}
            >
              <CloudBlob
                index={i}
                tint={p.tint}
                depth={depth}
                onClick={() => onSelect(p)}
                showSparkles={p.tint === "yellow"}
              />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
