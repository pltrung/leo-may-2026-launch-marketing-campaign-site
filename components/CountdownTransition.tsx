"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { HERO_BG } from "@/lib/heroConstants";

const TEXT_DELAY_MS = 300;
const TEXT_STAGGER_MS = 350;
const HOLD_AFTER_TEXT_MS = 500;
/** Total: text delay + (words * stagger) + hold ≈ 1.85s */
const TOTAL_MS = TEXT_DELAY_MS + 3 * TEXT_STAGGER_MS + HOLD_AFTER_TEXT_MS;

export type CountdownTransitionVariant = "return" | "forms";

interface CountdownTransitionProps {
  variant: CountdownTransitionVariant;
  onComplete?: () => void;
}

/**
 * Transition to countdown: black background + "YOUR CLOUD RETURNS" / "YOUR CLOUD FORMS" only.
 * Matches countdown page’s full black look (no holds).
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
      <div className="relative z-[1] flex flex-col items-center justify-center gap-1 sm:gap-2 text-center px-4">
        {lines.map((word, i) => (
          <motion.span
            key={word}
            className="font-headline text-2xl sm:text-3xl md:text-4xl tracking-[0.2em] text-white"
            style={{ color: "#fff" }}
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
