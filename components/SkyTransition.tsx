"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { HERO_BG } from "@/lib/heroConstants";

export type SkyTransitionVariant = "discovery" | "return" | "forms";

interface SkyTransitionProps {
  onComplete?: () => void;
  /** discovery = "THE MIST CLEARS", return = "YOUR CLOUD RETURNS", forms = "YOUR CLOUD FORMS" */
  variant?: SkyTransitionVariant;
}

export default function SkyTransition({ onComplete, variant = "discovery" }: SkyTransitionProps) {
  const locale = useLocale();
  const lines = getMessages(locale).skyTransition[variant];
  const containerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      onComplete?.();
      return;
    }

    el.classList.remove("mist-active", "mist-clearing");
    void el.offsetHeight;
    el.classList.add("mist-active");

    const t0 = setTimeout(() => setTextVisible(true), 500);

    // Mist in → text → mist clears → onComplete (tighter for countdown: return/forms)
    const t1 = setTimeout(() => {
      el.classList.add("mist-clearing");
      setTextVisible(false);
    }, 1800);
    const t2 = setTimeout(() => onComplete?.(), 3000);
    const t3 = setTimeout(() => {
      el.classList.remove("mist-active", "mist-clearing");
    }, 3200);
    timersRef.current = [t0, t1, t2, t3];

    return () => timersRef.current.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div id="mist-transition" ref={containerRef} aria-hidden="true">
      {/* Same brand background as hero/countdown so transition matches site */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: HERO_BG }}
        aria-hidden
      />
      <div className="absolute inset-0 -z-[1] opacity-70 overflow-hidden pointer-events-none animate-holds-layer" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/holds.svg" alt="" className="w-full h-full object-cover" style={{ objectFit: "cover" }} />
      </div>
      <div className="mist-layer mist-back" />
      <div className="mist-layer mist-mid" />
      <div className="mist-layer mist-front" />
      <div className="mist-transition-text">
        {lines.map((word, i) => (
          <motion.span
            key={word}
            className="mist-transition-line"
            initial={{ opacity: 0 }}
            animate={textVisible ? { opacity: 1 } : { opacity: 0 }}
            transition={
              textVisible
                ? { duration: 1, delay: i * 0.45, ease: [0.22, 1, 0.36, 1] }
                : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
            }
          >
            {word}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
