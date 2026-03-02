"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

const HINT_FADE_IN_DELAY_MS = 800;
const HINT_FADE_OUT_MS = 300;
const BOB_AMPLITUDE_PX = 2.5;
const BOB_DURATION_S = 3.2;
/** Arrow tail (4,48) to head (78,10): direction ~ -27.4° in SVG coords */
const DEFAULT_ARROW_ANGLE_DEG = -27.4;

interface ExploreDragHintProps {
  text: string;
  visible: boolean;
  /** When set, the arrow rotates to point at this viewport position (e.g. a cloud). */
  target?: { x: number; y: number } | null;
}

/** Curved arrow SVG: white, bold; rotation in degrees applied so it can point at a cloud. */
function CurvedArrowSvg({ rotationDeg = 0 }: { rotationDeg?: number }) {
  return (
    <svg
      width="88"
      height="52"
      viewBox="0 0 88 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{
        display: "block",
        filter: "drop-shadow(0 0 8px rgba(255,255,255,0.25))",
        transformOrigin: "41px 29px",
        transform: `rotate(${rotationDeg}deg)`,
      }}
    >
      <motion.path
        d="M 4 48 Q 42 24 78 10"
        stroke="rgba(255,255,255,0.98)"
        strokeWidth="2.75"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0.7 }}
        animate={{
          pathLength: 1,
          opacity: [0.85, 1, 0.85],
        }}
        transition={{
          pathLength: { duration: 0.6, delay: HINT_FADE_IN_DELAY_MS / 1000 + 0.2 },
          opacity: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
        }}
      />
      <g transform="rotate(-38 78 10)">
        <motion.polygon
          points="78,10 72,7 72,13"
          stroke="rgba(255,255,255,0.98)"
          strokeWidth="2.25"
          fill="none"
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.9, 1, 0.9] }}
          transition={{
            opacity: { duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
          }}
        />
      </g>
    </svg>
  );
}

export default function ExploreDragHint({ text, visible, target }: ExploreDragHintProps) {
  const [hasFadedIn, setHasFadedIn] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const arrowContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setHasFadedIn(true), HINT_FADE_IN_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!target) return;
    const updateRotation = () => {
      const el = arrowContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const arrowCenterX = rect.left + 41;
      const arrowCenterY = rect.top + 29;
      const desiredRad = Math.atan2(target.y - arrowCenterY, target.x - arrowCenterX);
      const desiredDeg = (desiredRad * 180) / Math.PI;
      setRotationDeg(desiredDeg - DEFAULT_ARROW_ANGLE_DEG);
    };
    const id = requestAnimationFrame(updateRotation);
    const t = setTimeout(updateRotation, 100);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
    };
  }, [target, hasFadedIn]);

  const show = visible && hasFadedIn;

  return (
    <motion.div
      aria-hidden
      initial={false}
      animate={{
        opacity: visible ? (show ? 1 : 0) : 0,
      }}
      transition={{
        opacity: {
          duration: show ? 0.5 : HINT_FADE_OUT_MS / 1000,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
      style={{
        position: "absolute",
        left: "14%",
        bottom: "22%",
        maxWidth: "min(160px, 38vw)",
        zIndex: 10,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "6px",
      }}
    >
      <motion.div
        ref={arrowContainerRef}
        animate={{ y: [0, -BOB_AMPLITUDE_PX, 0] }}
        transition={{
          duration: BOB_DURATION_S,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}
      >
        <CurvedArrowSvg rotationDeg={rotationDeg} />
        <span
          style={{
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
            fontSize: "clamp(11px, 2.5vw, 13px)",
            fontWeight: 600,
            color: "rgba(255,255,255,0.95)",
            letterSpacing: "0.02em",
            lineHeight: 1.35,
          }}
        >
          {text}
        </span>
      </motion.div>
    </motion.div>
  );
}
