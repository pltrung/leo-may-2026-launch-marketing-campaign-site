"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";

export type ExploreOrigin = { x: number; y: number };

/** Layered glow: inner highlight, medium, large ambient — for idle breathing pulse */
const GLOW_IDLE_A =
  "0 0 0 1px rgba(180,210,255,0.12), 0 0 20px rgba(140,190,255,0.22), 0 0 48px rgba(100,160,240,0.28), 0 0 100px rgba(60,120,200,0.12)";
const GLOW_IDLE_B =
  "0 0 0 1px rgba(180,210,255,0.14), 0 0 20px rgba(140,190,255,0.28), 0 0 48px rgba(100,160,240,0.35), 0 0 100px rgba(60,120,200,0.18)";
/** Tap: quick glow spike + slight scale bounce (portal activation) */
const GLOW_TAP =
  "0 0 0 1px rgba(200,230,255,0.25), 0 0 28px rgba(160,210,255,0.5), 0 0 64px rgba(120,180,255,0.4), 0 0 140px rgba(80,140,220,0.25)";

interface ExploreButtonProps {
  /** Called with button center (px) on click, or no arg on keyboard — for portal origin */
  onExplore: (origin?: ExploreOrigin) => void;
  disabled?: boolean;
  /** Button label, e.g. "EXPLORE" / "KHÁM PHÁ" */
  label?: string;
}

export default function ExploreButton({ onExplore, disabled = false, label = "EXPLORE" }: ExploreButtonProps) {
  const [pressing, setPressing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    if (disabled) return;
    setPressing(true);
    const rect = buttonRef.current?.getBoundingClientRect();
    const origin: ExploreOrigin | undefined =
      rect != null
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : undefined;
    onExplore(origin);
  }, [disabled, onExplore]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setPressing(true);
        onExplore();
      }
    },
    [disabled, onExplore]
  );

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      className="explore-pill"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={() => !disabled && setPressing(true)}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      disabled={disabled}
      aria-label={label}
      initial={false}
      animate={{
        scale: pressing ? 1.05 : [1, 1.03, 1],
        boxShadow: pressing ? GLOW_TAP : [GLOW_IDLE_A, GLOW_IDLE_B, GLOW_IDLE_A],
      }}
      transition={
        pressing
          ? { duration: 0.12, ease: [0.22, 1, 0.36, 1] }
          : { scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }, boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" } }
      }
      whileHover={
        disabled
          ? undefined
          : {
              borderColor: "rgba(200,220,255,0.4)",
              boxShadow: GLOW_IDLE_B,
              transition: { duration: 0.2 },
            }
      }
      style={{
        border: "1px solid rgba(200,220,255,0.2)",
        background:
          "linear-gradient(165deg, rgba(30,55,95,0.92) 0%, rgba(15,35,65,0.95) 50%, rgba(8,22,45,0.98) 100%)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        color: "rgba(255,255,255,0.98)",
        fontWeight: 600,
        fontSize: "1rem",
        letterSpacing: "0.04em",
        borderRadius: "9999px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        outline: "none",
        outlineOffset: "2px",
        textShadow: "0 0 24px rgba(120,160,220,0.25)",
      }}
      onFocus={(e) => {
        if (disabled) return;
        e.currentTarget.style.outline = "2px solid rgba(120, 180, 255, 0.5)";
        e.currentTarget.style.outlineOffset = "2px";
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = "none";
      }}
    >
      <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
    </motion.button>
  );
}
