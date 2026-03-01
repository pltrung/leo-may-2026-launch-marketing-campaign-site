"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";

export type ExploreOrigin = { x: number; y: number };

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
        scale: pressing ? 0.98 : 1,
        boxShadow: pressing
          ? "0 0 48px rgba(140, 200, 255, 0.5), 0 0 80px rgba(120, 180, 255, 0.25)"
          : "0 0 40px rgba(140, 200, 255, 0.35), 0 0 64px rgba(120, 180, 255, 0.2)",
      }}
      transition={{ duration: pressing ? 0.09 : 0.2 }}
      whileHover={
        disabled
          ? undefined
          : {
              borderColor: "rgba(255,255,255,0.5)",
              boxShadow: "0 0 48px rgba(140, 200, 255, 0.45), 0 0 80px rgba(120, 180, 255, 0.25)",
              transition: { duration: 0.15 },
            }
      }
      style={{
        // Pill: glass, border, glow (base). Size in globals.css .explore-pill for responsive.
        border: "1px solid rgba(255,255,255,0.22)",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "#fff",
        fontWeight: 500,
        fontSize: "1rem",
        letterSpacing: "0.02em",
        borderRadius: "9999px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        outline: "none",
        // Focus ring
        outlineOffset: "2px",
      }}
      onFocus={(e) => {
        if (disabled) return;
        e.currentTarget.style.outline = "2px solid rgba(120, 180, 255, 0.6)";
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
