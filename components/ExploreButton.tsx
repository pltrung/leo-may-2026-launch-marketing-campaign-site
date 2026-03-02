"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";

export type ExploreOrigin = { x: number; y: number };

/** Premium activation-switch: white pill, layered blue halo. Idle = gentle breathing glow. */
const GLOW_IDLE_A =
  "0 0 0 1px rgba(120,160,255,0.2), 0 0 24px rgba(80,140,255,0.35), 0 0 56px rgba(60,120,240,0.4), 0 0 120px rgba(50,100,220,0.25)";
const GLOW_IDLE_B =
  "0 0 0 1px rgba(140,180,255,0.28), 0 0 28px rgba(90,150,255,0.42), 0 0 64px rgba(70,130,245,0.48), 0 0 140px rgba(55,110,230,0.32)";
/** Hover: energy building, glow intensifies slightly. */
const GLOW_HOVER =
  "0 0 0 1px rgba(150,190,255,0.35), 0 0 32px rgba(100,160,255,0.5), 0 0 72px rgba(80,140,250,0.55), 0 0 160px rgba(60,120,235,0.38)";
/** Tap: activation moment, strong but controlled. */
const GLOW_TAP =
  "0 0 0 1px rgba(180,220,255,0.45), 0 0 36px rgba(120,180,255,0.6), 0 0 80px rgba(90,150,255,0.55), 0 0 180px rgba(70,130,240,0.4)";

interface ExploreButtonProps {
  /** Called with button center (px) on click, or no arg on keyboard — for portal origin */
  onExplore: (origin?: ExploreOrigin) => void;
  disabled?: boolean;
  /** Button label, e.g. "EXPLORE!" / "KHÁM PHÁ!" */
  label?: string;
}

export default function ExploreButton({ onExplore, disabled = false, label = "EXPLORE!" }: ExploreButtonProps) {
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
        scale: pressing ? 1.04 : [1, 1.02, 1],
        boxShadow: pressing ? GLOW_TAP : [GLOW_IDLE_A, GLOW_IDLE_B, GLOW_IDLE_A],
      }}
      transition={
        pressing
          ? { duration: 0.12, ease: [0.22, 1, 0.36, 1] }
          : { scale: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }, boxShadow: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } }
      }
      whileHover={
        disabled
          ? undefined
          : {
              boxShadow: GLOW_HOVER,
              transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
            }
      }
      style={{
        border: "1px solid rgba(200,220,255,0.25)",
        background: "rgba(255,255,255,0.98)",
        color: "rgba(18,18,24,0.95)",
        fontFamily: "var(--font-bold), MiSans-Bold, sans-serif",
        fontWeight: 700,
        letterSpacing: "0.03em",
        borderRadius: "9999px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        outline: "none",
        outlineOffset: "2px",
        boxShadow: GLOW_IDLE_A,
      }}
      onFocus={(e) => {
        if (disabled) return;
        e.currentTarget.style.outline = "2px solid rgba(100, 160, 255, 0.5)";
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
