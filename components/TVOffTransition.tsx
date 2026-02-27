"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { HERO_BG } from "@/lib/heroConstants";

const DURATION_S = 0.6;
/** Ease-in so collapse accelerates at the end (CRT power-down feel). */
const EASE = [0.55, 0, 1, 1] as const;

interface TVOffTransitionProps {
  onComplete?: () => void;
}

/**
 * Full-screen "TV off" transition: current view collapses to a horizontal line
 * (like an old CRT turning off). Use for Hero→Pick Your Cloud and any → Countdown.
 */
export default function TVOffTransition({ onComplete }: TVOffTransitionProps) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), DURATION_S * 1000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div
      id="tv-off-transition"
      className="fixed inset-0 z-[100] pointer-events-none"
      aria-hidden="true"
    >
      {/* Top bar: grows down from top */}
      <motion.div
        className="absolute left-0 right-0 top-0 w-full"
        style={{
          height: "50%",
          background: HERO_BG,
          transformOrigin: "top",
        }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: DURATION_S, ease: EASE }}
        aria-hidden
      />
      {/* Bottom bar: grows up from bottom */}
      <motion.div
        className="absolute left-0 right-0 bottom-0 w-full"
        style={{
          height: "50%",
          background: HERO_BG,
          transformOrigin: "bottom",
        }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: DURATION_S, ease: EASE }}
        aria-hidden
      />
    </div>
  );
}
