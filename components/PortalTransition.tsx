"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import ExploreButton from "@/components/ExploreButton";
import type { ExploreOrigin } from "@/components/ExploreButton";
import CloudPlayground from "@/components/CloudPlayground";
import ExploreDragHint from "@/components/ExploreDragHint";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";
import SafeImg, { isValidImgSrc } from "@/components/SafeImg";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";

const EXPLORE_HINT_DISMISSED_KEY = "leo-explore-drag-hint-dismissed";

const EXPLORE_LOGO_SRC = "/logo-white.svg";

export type PortalState = "loadingSky" | "exploreIdle" | "transitioning" | "hero";

/** Portal circle expansion: longer duration so it feels cinematic, not rushed. */
const PORTAL_DURATION_MS = 1280;
const REDUCED_MOTION_FADE_MS = 200;
/** Fade overlay to 0 before unmount to avoid iOS mask/compositor white flash */
const OVERLAY_FADEOUT_MS = 220;
/** After portal expands: hold full-screen starfield so audio breathes before hero enters. */
const HERO_HOLD_MS = 1000;
const HERO_HOLD_MS_REDUCED = 400;
/** Small circle so hero is visible inside the window immediately (18–30px equivalent in vmax) */
const PORTAL_START_VMAX = 2.5;
const PORTAL_END_VMAX = 160;

/** Smooth ease-out so the circle expands deliberately; not the snappy expo that made it feel fast. */
function easeOutCubic(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
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
  const [overlayFadeOut, setOverlayFadeOut] = useState(false);
  const [holdStarfield, setHoldStarfield] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params = useParams();
  const locale = (params?.locale as Locale) ?? "en";

  const [hintTarget, setHintTarget] = useState<{ x: number; y: number } | null>(null);
  const [hintOrigin, setHintOrigin] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setHintOrigin({ x: w * 0.12 + 45, y: h * 0.8 - 50 });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* Do not restore hintDismissed from sessionStorage so the "touch the clouds" arrow shows every time on explore page until user drags. */

  const handleFirstDrag = useCallback(() => {
    setHintDismissed(true);
    try {
      window.sessionStorage.setItem(EXPLORE_HINT_DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const portalCx =
    exploreOrigin?.x ?? (typeof window !== "undefined" ? window.innerWidth / 2 : 0);
  const portalCy =
    exploreOrigin?.y ?? (typeof window !== "undefined" ? window.innerHeight / 2 : 0);

  // Animate portal radius and rim; then hold full starfield before completing (or reduced-motion: short delay)
  useEffect(() => {
    if (state !== "transitioning") return;

    if (reduceMotion) {
      const t = setTimeout(onTransitionComplete, REDUCED_MOTION_FADE_MS + HERO_HOLD_MS_REDUCED);
      return () => clearTimeout(t);
    }

    const duration = PORTAL_DURATION_MS / 1000;
    startRef.current = performance.now() / 1000;

    const tick = (now: number) => {
      const elapsed = (now / 1000 - startRef.current) / duration;
      const t = Math.min(1, elapsed);
      const eased = easeOutCubic(t);
      const rVmax = PORTAL_START_VMAX + (PORTAL_END_VMAX - PORTAL_START_VMAX) * eased;
      setPortalR(rVmax);
      setRimOpacity(t < 0.65 ? 1 : Math.max(0, 1 - (t - 0.65) / 0.35));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setHoldStarfield(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, reduceMotion]);

  // After hold: complete transition (hero enters)
  useEffect(() => {
    if (!holdStarfield || reduceMotion) return;
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setOverlayFadeOut(true);
      doneTimerRef.current = setTimeout(onTransitionComplete, OVERLAY_FADEOUT_MS);
    }, HERO_HOLD_MS);
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (doneTimerRef.current) {
        clearTimeout(doneTimerRef.current);
        doneTimerRef.current = null;
      }
    };
  }, [holdStarfield, reduceMotion, onTransitionComplete]);

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
    state === "transitioning" && !holdStarfield
      ? `radial-gradient(circle at ${portalCx}px ${portalCy}px, transparent 0, transparent ${rVmax}vmax, black ${rVmax}vmax)`
      : undefined;

  const overlayOpacity = fadeOut || overlayFadeOut ? 0 : 1;
  const overlayFadeDuration =
    reduceMotion ? REDUCED_MOTION_FADE_MS / 1000 : overlayFadeOut ? OVERLAY_FADEOUT_MS / 1000 : 0;

  return (
    <motion.div
      className="portal-overlay"
      aria-hidden={false}
      initial={false}
      animate={{ opacity: overlayOpacity }}
      transition={{ duration: overlayFadeDuration }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100dvh",
        minHeight: "100dvh",
        maxWidth: "100%",
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
      {/* Sky area: transparent so we see the single persistent starfield from LandingFlow (no second world). */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          minWidth: "100%",
          minHeight: "100%",
          background: "transparent",
        }}
      />

      {/* Cloud playground: exploreIdle only; freezes when transitioning. During starfield hold we hide clouds so only stars show. */}
      {(state === "exploreIdle" || (state === "transitioning" && !holdStarfield)) && (
        <ClientErrorBoundary fallback={null}>
          <CloudPlayground
            freeze={state === "transitioning"}
            reduceMotion={!!reduceMotion}
            onFirstDrag={handleFirstDrag}
            onHintTarget={(x, y) => setHintTarget({ x, y })}
            hintOrigin={hintOrigin}
          />
        </ClientErrorBoundary>
      )}

      {/* Subtle drag hint: curved arrow + text, fades out after first cloud drag */}
      {showExplore && (
        <ExploreDragHint
          text={getMessages(locale).explorePage.dragHint}
          visible={!hintDismissed}
          target={hintTarget}
        />
      )}

      {/* Faint radial vignette when Explore is visible: center stays clear so the pill is the focal point */}
      {showExplore && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 5,
            background:
              "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 28%, rgba(0,0,0,0.08) 55%, rgba(0,0,0,0.2) 100%)",
          }}
        />
      )}

      {/* Thick rim at portal edge: gradient ring + blur so the opening is clearly visible on mobile and desktop */}
      {state === "transitioning" && !reduceMotion && rimOpacity > 0 && (
        <>
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              background: `radial-gradient(circle at ${portalCx}px ${portalCy}px, transparent calc(${rVmax}vmax - max(0.8vmin, 8px)), rgba(180,220,255,0.92) ${rVmax}vmax, transparent calc(${rVmax}vmax + max(0.8vmin, 8px)))`,
              filter: "blur(12px)",
              opacity: rimOpacity,
            }}
          />
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              background: `radial-gradient(circle at ${portalCx}px ${portalCy}px, transparent calc(${rVmax}vmax - max(0.35vmin, 4px)), rgba(255,255,255,0.5) ${rVmax}vmax, transparent calc(${rVmax}vmax + max(0.35vmin, 4px)))`,
              opacity: rimOpacity,
            }}
          />
        </>
      )}

      {showExplore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(20px, 4vw, 28px)",
            zIndex: 10,
          }}
        >
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "inherit" }}>
          {/* Very subtle radial ambient behind logo — low opacity, does not overpower stars */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "28px",
              transform: "translate(-50%, -50%)",
              width: "min(280px, 70vw)",
              height: "140px",
              background:
                "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(180,200,255,0.06) 0%, rgba(120,160,220,0.03) 50%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          {/* Centered white logo above button: fade in 600ms, slight upward motion, subtle glow */}
          {isValidImgSrc(EXPLORE_LOGO_SRC) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                filter: "drop-shadow(0 0 24px rgba(140,180,255,0.2)) drop-shadow(0 0 48px rgba(100,140,220,0.12))",
              }}
            >
              <SafeImg
                src={EXPLORE_LOGO_SRC}
                alt="Leo Mây"
                className="h-auto w-[clamp(240px,56vw,320px)] max-w-[320px] object-contain"
                style={{ display: "block" }}
              />
            </motion.div>
          )}
          <ExploreButton onExplore={onExplore} disabled={isTransitioning} label={exploreLabel} />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
