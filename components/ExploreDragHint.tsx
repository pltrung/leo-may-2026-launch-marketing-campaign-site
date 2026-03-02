"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const HINT_FADE_IN_DELAY_MS = 800;
const HINT_FADE_OUT_MS = 300;
const BOB_AMPLITUDE_PX = 2.5;
const BOB_DURATION_S = 3.2;

interface ExploreDragHintProps {
  text: string;
  visible: boolean;
}

/** Curved arrow SVG: elegant line, points toward cloud area (up-right). */
function CurvedArrowSvg() {
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
        filter: "drop-shadow(0 0 6px rgba(255,255,255,0.15))",
      }}
    >
      <defs>
        <linearGradient id="explore-hint-arrow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.85)" />
        </linearGradient>
      </defs>
      <motion.path
        d="M 4 48 Q 42 24 78 10"
        stroke="url(#explore-hint-arrow)"
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0.6 }}
        animate={{
          pathLength: 1,
          opacity: [0.6, 0.78, 0.6],
        }}
        transition={{
          pathLength: { duration: 0.6, delay: HINT_FADE_IN_DELAY_MS / 1000 + 0.2 },
          opacity: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
        }}
      />
      <g transform="rotate(-38 78 10)">
        <motion.polygon
          points="78,10 72,7 72,13"
          stroke="rgba(255,255,255,0.82)"
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.65, 0.9, 0.65] }}
          transition={{
            opacity: { duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
          }}
        />
      </g>
    </svg>
  );
}

export default function ExploreDragHint({ text, visible }: ExploreDragHintProps) {
  const [hasFadedIn, setHasFadedIn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHasFadedIn(true), HINT_FADE_IN_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

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
        zIndex: 8,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "6px",
      }}
    >
      <motion.div
        animate={{ y: [0, -BOB_AMPLITUDE_PX, 0] }}
        transition={{
          duration: BOB_DURATION_S,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}
      >
        <CurvedArrowSvg />
        <span
          style={{
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
            fontSize: "clamp(11px, 2.5vw, 13px)",
            fontWeight: 400,
            color: "rgba(255,255,255,0.72)",
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
