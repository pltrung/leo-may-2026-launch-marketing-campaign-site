"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export type SkyTransitionVariant = "discovery" | "return";

interface SkyTransitionProps {
  onComplete?: () => void;
  /** discovery = "THE MIST CLEARS", return = "YOUR CLOUD RETURNS" */
  variant?: SkyTransitionVariant;
}

const LINES = {
  discovery: ["THE", "MIST", "CLEARS"],
  return: ["YOUR", "CLOUD", "RETURNS"],
} as const;

export default function SkyTransition({ onComplete, variant = "discovery" }: SkyTransitionProps) {
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

    const t0 = setTimeout(() => setTextVisible(true), 700);

    // Phase 4: Mist clearing starts at 2400ms — text fades out with mist
    const t1 = setTimeout(() => {
      el.classList.add("mist-clearing");
      setTextVisible(false);
    }, 2400);

    // Phase 5: Next page revealed at 4200ms
    const t2 = setTimeout(() => {
      onComplete?.();
    }, 4200);

    const t3 = setTimeout(() => {
      el.classList.remove("mist-active", "mist-clearing");
    }, 4500);

    timersRef.current = [t0, t1, t2, t3];
    return () => timersRef.current.forEach(clearTimeout);
  }, [onComplete]);

  const lines = LINES[variant];

  return (
    <div id="mist-transition" ref={containerRef} aria-hidden="true">
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
