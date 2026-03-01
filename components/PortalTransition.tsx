"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import dynamic from "next/dynamic";
import ExploreButton from "@/components/ExploreButton";
import { HERO_BG } from "@/lib/heroConstants";

const HeroStarfield = dynamic(
  () => import("@/components/HeroStarfield").then((m) => m.default),
  { ssr: false }
);

export type PortalState = "loadingSky" | "exploreIdle" | "transitioning" | "hero";

const PORTAL_DURATION_MS = 580;
const REDUCED_MOTION_FADE_MS = 250;

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

interface PortalTransitionProps {
  state: PortalState;
  onExplore: () => void;
  onTransitionComplete: () => void;
  /** When true, skip portal animation and use 250ms fade */
  reduceMotion?: boolean;
}

export default function PortalTransition({
  state,
  onExplore,
  onTransitionComplete,
  reduceMotion = false,
}: PortalTransitionProps) {
  const skyOpacity = useMotionValue(1);
  const [maskStyle, setMaskStyle] = useState<string>("");
  const [rimRadius, setRimRadius] = useState(0);
  const [rimOpacity, setRimOpacity] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  // Animate mask radius when transitioning (or reduced-motion fade)
  useEffect(() => {
    if (state !== "transitioning") return;

    if (reduceMotion) {
      const t = setTimeout(onTransitionComplete, REDUCED_MOTION_FADE_MS);
      return () => clearTimeout(t);
    }

    const duration = PORTAL_DURATION_MS / 1000;
    startRef.current = performance.now() / 1000;

    // Immediate "window" at 24px (spec)
    setMaskStyle(
      "radial-gradient(circle at 50% 50%, transparent 0, transparent 24px, black 24px)"
    );

    const tick = (now: number) => {
      const elapsed = (now / 1000 - startRef.current) / duration;
      const t = Math.min(1, elapsed);
      const eased = easeOutExpo(t);
      // Expand from 24px to 160vmax
      const rVmax = 24 + (160 - 24) * eased;
      const r = t < 0.02 ? "24px" : `${rVmax}vmax`;
      setMaskStyle(
        `radial-gradient(circle at 50% 50%, transparent 0, transparent ${r}, black ${r})`
      );
      skyOpacity.set(1 - 0.3 * eased);
      setRimRadius(t < 0.02 ? 0 : rVmax);
      setRimOpacity(elapsed < 0.85 ? 1 : Math.max(0, 1 - (elapsed - 0.85) / 0.15));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onTransitionComplete();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, reduceMotion, onTransitionComplete, skyOpacity]);

  const [fadeOut, setFadeOut] = useState(false);
  useEffect(() => {
    if (state === "transitioning" && reduceMotion) setFadeOut(true);
  }, [state, reduceMotion]);

  if (state === "hero") return null;

  const showSky = state === "loadingSky" || state === "exploreIdle" || state === "transitioning";
  const showExplore = state === "exploreIdle";
  const isTransitioning = state === "transitioning";

  return (
    <motion.div
      className="portal-overlay"
      aria-hidden={false}
      initial={false}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: reduceMotion ? REDUCED_MOTION_FADE_MS / 1000 : 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999998,
        pointerEvents: "auto",
        overflow: "hidden",
      }}
    >
      {/* Base: Sky (stars + shooting lights) — always running when overlay visible */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: HERO_BG,
          WebkitMaskImage: state === "transitioning" ? maskStyle : undefined,
          maskImage: state === "transitioning" ? maskStyle : undefined,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "50% 50%",
          maskPosition: "50% 50%",
        }}
      >
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            opacity: skyOpacity,
          }}
        >
          {showSky && <HeroStarfield heroTransitioning={isTransitioning} />}
        </motion.div>
      </div>

      {/* Rim glow: ring at portal edge during expansion */}
      {state === "transitioning" && !reduceMotion && rimOpacity > 0 && (
        <svg
          className="portal-rim"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "320vmax",
            height: "320vmax",
            pointerEvents: "none",
          }}
          viewBox="0 0 320 320"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <circle
            cx="160"
            cy="160"
            r={Math.min(160, rimRadius)}
            fill="none"
            stroke="rgba(180, 210, 255, 0.4)"
            strokeWidth="0.5"
            style={{
              filter: "blur(4px)",
              opacity: rimOpacity,
            }}
          />
        </svg>
      )}

      {/* Explore pill — only in exploreIdle */}
      {showExplore && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <ExploreButton onExplore={onExplore} disabled={isTransitioning} />
        </div>
      )}
    </motion.div>
  );
}
