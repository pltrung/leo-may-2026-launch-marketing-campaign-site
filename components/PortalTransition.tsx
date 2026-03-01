"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import ExploreButton from "@/components/ExploreButton";
import type { ExploreOrigin } from "@/components/ExploreButton";
import CloudPlayground from "@/components/CloudPlayground";
import { HERO_BG } from "@/lib/heroConstants";

const HeroStarfield = dynamic(
  () => import("@/components/HeroStarfield").then((m) => m.default),
  { ssr: false }
);

export type PortalState = "loadingSky" | "exploreIdle" | "transitioning" | "hero";

const PORTAL_DURATION_MS = 580;
const REDUCED_MOTION_FADE_MS = 200;
/** Small circle so hero is visible inside the window immediately (18–30px equivalent in vmax) */
const PORTAL_START_VMAX = 2.5;
const PORTAL_END_VMAX = 160;

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

interface PortalTransitionProps {
  state: PortalState;
  onExplore: (origin?: ExploreOrigin) => void;
  onTransitionComplete: () => void;
  reduceMotion?: boolean;
  exploreLabel?: string;
  exploreOrigin: ExploreOrigin | null;
}

export default function PortalTransition({
  state,
  onExplore,
  onTransitionComplete,
  reduceMotion = false,
  exploreLabel = "EXPLORE",
  exploreOrigin,
}: PortalTransitionProps) {
  const [portalR, setPortalR] = useState(PORTAL_START_VMAX);
  const [rimOpacity, setRimOpacity] = useState(1);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const portalCx =
    exploreOrigin?.x ?? (typeof window !== "undefined" ? window.innerWidth / 2 : 0);
  const portalCy =
    exploreOrigin?.y ?? (typeof window !== "undefined" ? window.innerHeight / 2 : 0);

  // Animate portal radius and rim (or reduced-motion fade)
  useEffect(() => {
    if (state !== "transitioning") return;

    if (reduceMotion) {
      const t = setTimeout(onTransitionComplete, REDUCED_MOTION_FADE_MS);
      return () => clearTimeout(t);
    }

    const duration = PORTAL_DURATION_MS / 1000;
    startRef.current = performance.now() / 1000;

    const tick = (now: number) => {
      const elapsed = (now / 1000 - startRef.current) / duration;
      const t = Math.min(1, elapsed);
      const eased = easeOutExpo(t);
      const rVmax = PORTAL_START_VMAX + (PORTAL_END_VMAX - PORTAL_START_VMAX) * eased;
      setPortalR(rVmax);
      setRimOpacity(t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4));
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
  }, [state, reduceMotion, onTransitionComplete]);

  const [fadeOut, setFadeOut] = useState(false);
  useEffect(() => {
    if (state === "transitioning" && reduceMotion) setFadeOut(true);
  }, [state, reduceMotion]);

  if (state === "hero") return null;

  const showSky = state === "loadingSky" || state === "exploreIdle" || state === "transitioning";
  const showExplore = state === "exploreIdle";
  const isTransitioning = state === "transitioning";

  const rVmax = state === "transitioning" ? portalR : PORTAL_START_VMAX;

  const overlayMask =
    state === "transitioning"
      ? `radial-gradient(circle at ${portalCx}px ${portalCy}px, transparent 0, transparent ${rVmax}vmax, black ${rVmax}vmax)`
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
        WebkitMaskPosition: "0 0",
        maskPosition: "0 0",
      }}
    >
      {/* Sky (stars + shooting lights) — runs continuously; mask reveals hero through circle */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: HERO_BG,
        }}
      >
        {showSky && <HeroStarfield heroTransitioning={isTransitioning} />}
      </div>

      {/* Cloud playground: exploreIdle only; freezes and fades when Explore is clicked */}
      {(state === "exploreIdle" || state === "transitioning") && (
        <CloudPlayground
          freeze={state === "transitioning"}
          reduceMotion={!!reduceMotion}
        />
      )}

      {/* Single thin rim at portal edge: gradient ring + blur, fades out by 60% of expansion */}
      {state === "transitioning" && !reduceMotion && rimOpacity > 0 && (
        <>
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              background: `radial-gradient(circle at ${portalCx}px ${portalCy}px, transparent calc(${rVmax}vmax - 2px), rgba(180,220,255,0.95) ${rVmax}vmax, transparent calc(${rVmax}vmax + 2px))`,
              filter: "blur(10px)",
              opacity: rimOpacity,
            }}
          />
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              background: `radial-gradient(circle at ${portalCx}px ${portalCy}px, transparent calc(${rVmax}vmax - 1px), rgba(255,255,255,0.4) ${rVmax}vmax, transparent calc(${rVmax}vmax + 1px))`,
              opacity: rimOpacity,
            }}
          />
        </>
      )}

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
          <ExploreButton onExplore={onExplore} disabled={isTransitioning} label={exploreLabel} />
        </div>
      )}
    </motion.div>
  );
}
