"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { HERO_BG } from "@/lib/heroConstants";

const HOLDS_DURATION_MS = 700;
const TEXT_DELAY_MS = 400;
const TEXT_STAGGER_MS = 380;
const HOLD_AFTER_TEXT_MS = 600;
/** Total: holds + text delay + (words * stagger) + hold ≈ 2.2s */
const TOTAL_MS = HOLDS_DURATION_MS + TEXT_DELAY_MS + 3 * TEXT_STAGGER_MS + HOLD_AFTER_TEXT_MS;

export type CountdownTransitionVariant = "return" | "forms";

interface CountdownTransitionProps {
  variant: CountdownTransitionVariant;
  onComplete?: () => void;
}

/**
 * Smooth transition to countdown: holds fade in first, then "YOUR CLOUD RETURNS" / "YOUR CLOUD FORMS".
 * No mist — same-world feel, then navigate to countdown page.
 */
export default function CountdownTransition({ variant, onComplete }: CountdownTransitionProps) {
  const locale = useLocale();
  const lines = getMessages(locale).skyTransition[variant];

  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), TOTAL_MS);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div
      id="countdown-transition"
      className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center"
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
          duration: HOLDS_DURATION_MS / 1000,
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
      <div className="relative z-[1] flex flex-col items-center justify-center gap-1 sm:gap-2 text-center px-4">
        {lines.map((word, i) => (
          <motion.span
            key={word}
            className="font-headline text-2xl sm:text-3xl md:text-4xl tracking-[0.2em] text-white/92"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: (TEXT_DELAY_MS + i * TEXT_STAGGER_MS) / 1000,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {word}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
