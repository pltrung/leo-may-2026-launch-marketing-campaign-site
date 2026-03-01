"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";

interface ExploreButtonProps {
  onExplore: () => void;
  disabled?: boolean;
}

export default function ExploreButton({ onExplore, disabled = false }: ExploreButtonProps) {
  const [pressing, setPressing] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) return;
    setPressing(true);
    onExplore();
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
      type="button"
      className="explore-pill"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={() => !disabled && setPressing(true)}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      disabled={disabled}
      aria-label="Explore"
      initial={false}
      animate={{
        scale: pressing ? 0.98 : 1,
        boxShadow: pressing
          ? "0 0 32px rgba(120, 180, 255, 0.35)"
          : "0 0 24px rgba(120, 180, 255, 0.18)",
      }}
      transition={{ duration: pressing ? 0.09 : 0.2 }}
      whileHover={
        disabled
          ? undefined
          : {
              borderColor: "rgba(255,255,255,0.4)",
              boxShadow: "0 0 28px rgba(120, 180, 255, 0.28)",
              transition: { duration: 0.15 },
            }
      }
      style={{
        // Pill: glass, border, glow (base)
        height: "clamp(44px, 10vw, 48px)",
        paddingLeft: "clamp(18px, 4vw, 22px)",
        paddingRight: "clamp(18px, 4vw, 22px)",
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
      <span style={{ position: "relative", zIndex: 1 }}>Explore</span>
    </motion.button>
  );
}
