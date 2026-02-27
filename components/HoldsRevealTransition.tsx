"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { HERO_BG } from "@/lib/heroConstants";

interface HoldsRevealTransitionProps {
  onComplete?: () => void;
  /** Duration for holds to fade in (ms). onComplete fires after this. */
  duration?: number;
}

/**
 * Smooth transition into Pick Your Cloud: only HERO_BG + holds layer.
 * Holds fade in first so the next view feels continuous (no abrupt black → content).
 */
export default function HoldsRevealTransition({
  onComplete,
  duration = 1000,
}: HoldsRevealTransitionProps) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), duration);
    return () => clearTimeout(t);
  }, [duration, onComplete]);

  return (
    <div
      id="holds-reveal-transition"
      className="fixed inset-0 z-[100] pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 -z-10"
        style={{ background: HERO_BG }}
        aria-hidden
      />
      <motion.div
        className="absolute inset-0 -z-[1] overflow-hidden pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{
          duration: duration / 1000,
          ease: [0.22, 1, 0.36, 1],
        }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/holds.svg"
          alt=""
          className="w-full h-full object-cover"
          style={{ objectFit: "cover" }}
        />
      </motion.div>
    </div>
  );
}
