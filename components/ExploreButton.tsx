"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";

export type ExploreOrigin = { x: number; y: number };

/** Base layers: inner soft shadow + depth (never animated). */
const BASE_SHADOW =
  "inset 0 1px 2px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.15)";
/** Controlled glow — reduced blur, premium feel. Idle breathing. */
const GLOW_IDLE_A =
  "0 0 25px rgba(79,163,255,0.35), 0 0 60px rgba(79,163,255,0.15)";
const GLOW_IDLE_B =
  "0 0 28px rgba(79,163,255,0.4), 0 0 65px rgba(79,163,255,0.2)";
/** Hover: glow intensifies slightly. */
const GLOW_HOVER =
  "0 0 32px rgba(79,163,255,0.45), 0 0 70px rgba(79,163,255,0.25)";
/** Tap: activation moment, controlled. */
const GLOW_TAP =
  "0 0 36px rgba(79,163,255,0.5), 0 0 75px rgba(79,163,255,0.3)";

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
        boxShadow: pressing
          ? `${BASE_SHADOW}, ${GLOW_TAP}`
          : [`${BASE_SHADOW}, ${GLOW_IDLE_A}`, `${BASE_SHADOW}, ${GLOW_IDLE_B}`, `${BASE_SHADOW}, ${GLOW_IDLE_A}`],
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
              boxShadow: `${BASE_SHADOW}, ${GLOW_HOVER}`,
              transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
            }
      }
      style={{
        fontFamily: "var(--font-bold), MiSans-Bold, sans-serif",
        fontWeight: 800,
        color: "#111111",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        outline: "none",
        outlineOffset: "2px",
        boxShadow: `${BASE_SHADOW}, ${GLOW_IDLE_A}`,
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
