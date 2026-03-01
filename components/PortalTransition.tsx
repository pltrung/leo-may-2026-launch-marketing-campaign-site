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
/** Portal starts at pill (center); small vmax ≈ pill-sized so it feels like it opens from the button into the world */
const PORTAL_START_VMAX = 3;

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

    // Start at pill (center 50% 50%) — small circle so portal feels like it opens from the pill
    setMaskStyle(
      `radial-gradient(circle at 50% 50%, transparent 0, transparent ${PORTAL_START_VMAX}vmax, black ${PORTAL_START_VMAX}vmax)`
    );

    const tick = (now: number) => {
      const elapsed = (now / 1000 - startRef.current) / duration;
      const t = Math.min(1, elapsed);
      const eased = easeOutExpo(t);
      // Expand from pill (small vmax) to full world (160vmax) — rim is the opening edge
      const rVmax = PORTAL_START_VMAX + (160 - PORTAL_START_VMAX) * eased;
      setMaskStyle(
        `radial-gradient(circle at 50% 50%, transparent 0, transparent ${rVmax}vmax, black ${rVmax}vmax)`
      );
      skyOpacity.set(1 - 0.5 * eased);
      setRimRadius(rVmax);
      setRimOpacity(elapsed < 0.92 ? 1 : Math.max(0, 1 - (elapsed - 0.92) / 0.08));
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

  const isTransitioningState = state === "transitioning";
  const overlayMask =
    isTransitioningState && maskStyle
      ? maskStyle
      : isTransitioningState
        ? `radial-gradient(circle at 50% 50%, transparent 0, transparent ${PORTAL_START_VMAX}vmax, black ${PORTAL_START_VMAX}vmax)`
        : undefined;

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
        WebkitMaskImage: overlayMask,
        maskImage: overlayMask,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "50% 50%",
        maskPosition: "50% 50%",
      }}
    >
      {/* Base: Sky (stars + shooting lights) — always running when overlay visible */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: HERO_BG,
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

      {/* Rim: solid ring at the opening edge — grows from pill (center) into the new world */}
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
            stroke="rgba(220, 235, 255, 0.9)"
            strokeWidth="5"
            style={{ opacity: rimOpacity }}
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
