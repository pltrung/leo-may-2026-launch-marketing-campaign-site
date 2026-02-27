"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";
import { preloadHeroIslandGLB } from "@/components/HeroIslandGLB";
import { preloadHeroClimbingHoldGLB } from "@/components/HeroClimbingHoldCanvas";
import { HERO_BG } from "@/lib/heroConstants";
import { getMessages } from "@/lib/messages";
import AscentBar from "@/components/AscentBar";

const HeroIslandCanvas = dynamic(
  () => import("@/components/HeroIslandCanvas").catch(() => ({ default: () => null })),
  { ssr: false }
);
const HeroClimbingHoldCanvas = dynamic(
  () => import("@/components/HeroClimbingHoldCanvas").catch(() => ({ default: () => null })),
  { ssr: false }
);
const HeroStarfield = dynamic(
  () => import("@/components/HeroStarfield").catch(() => ({ default: () => null })),
  { ssr: false }
);

/** Four brand colors for hero anchor words (one per stage) — from globals emphasis/hero palette */
const HERO_HEADLINE_ACCENTS = ["#22c55e", "#3b82f6", "#FACC15", "#ff1744"] as const;

/** Desktop + mobile: every stage has exactly 3 lines; line1 = anchor (brand color), line2/line3 = white */
type HeadlineStage = { line1: string; line2: string; line3: string };

const HEADLINE_STAGES_EN: HeadlineStage[] = [
  { line1: "CLIMB.", line2: "IN YOUR OWN", line3: "SKY." },
  { line1: "CONNECT.", line2: "IN THE SAME", line3: "RHYTHM." },
  { line1: "BE HERE.", line2: "IN EVERY", line3: "MOVEMENT." },
  { line1: "BE FREE", line2: "YOUR", line3: "WAY." },
];
const HEADLINE_STAGES_VI: HeadlineStage[] = [
  { line1: "LEO.", line2: "GIỮA TRỜI", line3: "RIÊNG." },
  { line1: "KẾT NỐI.", line2: "CHUNG MỘT", line3: "NHỊP." },
  { line1: "HIỆN DIỆN.", line2: "TRONG CHUYỂN", line3: "ĐỘNG." },
  { line1: "TỰ DO", line2: "THEO", line3: "CÁCH BẠN." },
];

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export interface CinematicHeroScrollProps {
  partColors: MascotPartColors | null;
  onJoin: () => void;
  locale?: Locale;
  headerHeight?: number;
  footerHeight?: number;
  wrapperVh?: number;
  footerMessages?: { ethos: string; copyright?: string };
  /** When true, entrance sequence (mascot → headline → CTA → arrow → footer) starts. Set by page when loading screen is gone. */
  heroReady?: boolean;
  /** Called once when the center logo has faded out (scroll progress >= ~0.28). Page uses this to show header logo so the logo doesn’t appear twice. */
  onCenterLogoGone?: () => void;
  /** Mobile only: label for About Us CTA that appears at bottom scroll above GLB. */
  aboutUsLabel?: string;
  /** Mobile only: called when About Us CTA is clicked. */
  onAboutUsClick?: () => void;
}

function useIsMobile(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = window.matchMedia("(max-width: 768px)");
    setM(q.matches);
    const f = () => setM(q.matches);
    q.addEventListener("change", f);
    return () => q.removeEventListener("change", f);
  }, []);
  return m;
}

function useIsDesktop(): boolean {
  const [d, setD] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = window.matchMedia("(min-width: 1024px)");
    setD(q.matches);
    const f = () => setD(q.matches);
    q.addEventListener("change", f);
    return () => q.removeEventListener("change", f);
  }, []);
  return d;
}

/**
 * Single cohesive cinematic hero (initial logic).
 * - One wrapper (e.g. 280vh); one sticky stage (top:0, height:100dvh); one heroProgress (0..1).
 * - Background from page / html+body; no background on wrapper or stage here.
 * - Narrative: fade out → hold → fade in (one stack, no simultaneous swap).
 * - Final 10–15%: narrative out, CTA stays, dolly in + FOV + scale, GLB dominates.
 */
/**
 * Locked cinematic hero: scroll-only driver, cross-fade headlines, CTA fixed in place.
 * As you scroll, text crossfades (opacity + translateY); CTA stays in the right place the whole time.
 */
export default function CinematicHeroScroll({
  partColors,
  onJoin,
  locale = "en",
  headerHeight = 64,
  footerHeight = 56,
  wrapperVh = 430,
  footerMessages,
  heroReady = false,
  onCenterLogoGone,
  aboutUsLabel,
  onAboutUsClick,
}: CinematicHeroScrollProps) {
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const [heroProgress, setHeroProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<number | null>(null);
  const centerLogoGoneFiredRef = useRef(false);
  const mountedRef = useRef(true);
  const [glbMounted, setGlbMounted] = useState(false);
  const [loadElapsed, setLoadElapsed] = useState(0);
  const [loadComplete, setLoadComplete] = useState(false);
  const loadStartRef = useRef<number | null>(null);
  const entranceStartedRef = useRef(false);
  const [desktopFinalCameraZ, setDesktopFinalCameraZ] = useState(6);

  useEffect(() => {
    preloadHeroIslandGLB();
    preloadHeroClimbingHoldGLB();
  }, []);

  useEffect(() => {
    if (!heroReady || entranceStartedRef.current) return;
    entranceStartedRef.current = true;
    loadStartRef.current = performance.now();
  }, [heroReady]);

  useEffect(() => {
    if (!heroReady) return;
    let raf = 0;
    const tick = () => {
      const start = loadStartRef.current;
      if (start == null) return;
      const elapsed = (performance.now() - start) / 1000;
      setLoadElapsed(elapsed);
      if (elapsed >= 1.45) {
        setLoadComplete(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [heroReady]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vh = window.innerHeight;
    const wrapperHeight = (vh * wrapperVh) / 100;
    const denom = wrapperHeight - vh;
    const progressEndScroll = denom <= 0 ? 1 : Math.max(denom * 0.95, 1);
    const onScroll = () => {
      try {
        const y = window.scrollY;
        let raw = denom <= 0 ? 0 : y / progressEndScroll;
        if (!Number.isFinite(raw)) raw = 0;
        pendingRef.current = Math.max(0, Math.min(1, raw));
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
          try {
            rafRef.current = 0;
            if (!mountedRef.current) return;
            let v = pendingRef.current;
            if (v == null || Number.isNaN(v)) v = 0;
            v = Math.max(0, Math.min(1, v));
            setHeroProgress(v);
            if (v >= 0.28 && !centerLogoGoneFiredRef.current && onCenterLogoGone) {
              centerLogoGoneFiredRef.current = true;
              onCenterLogoGone();
            }
          } catch {
            // guard so scroll-up / rAF never throws client-side
          }
        });
      } catch {
        // guard so scroll handler never throws
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [wrapperVh, onCenterLogoGone]);

  useEffect(() => {
    if (heroProgress >= 0.2) setGlbMounted(true);
  }, [heroProgress]);

  const p = Number.isFinite(heroProgress) ? Math.max(0, Math.min(1, heroProgress)) : 0;
  const headlineStages = locale === "vi" ? HEADLINE_STAGES_VI : HEADLINE_STAGES_EN;
  const ctaLabel = getMessages(locale as "en" | "vi").hero.ctaFoundingAscent;

  const FADE_Y_PX = 20;
  const HOLD = 0.02;

  // Sequential headlines: fade out old fully → hold → fade in new. Wider windows, smoothstep, translateY during fade.
  const headline1Opacity = useMemo(() => {
    if (p <= 0.12) return 1;
    if (p < 0.23) return 1 - smoothstep(0.12, 0.23, p);
    return 0;
  }, [p]);
  const headline1TranslateY = useMemo(() => {
    if (p <= 0.12) return 0;
    if (p < 0.23) return -FADE_Y_PX * smoothstep(0.12, 0.23, p);
    return -FADE_Y_PX;
  }, [p]);
  const headline2Opacity = useMemo(() => {
    if (p < 0.25) return 0;
    if (p < 0.35) return smoothstep(0.25, 0.35, p);
    if (p < 0.46) return 1;
    if (p < 0.56) return 1 - smoothstep(0.46, 0.56, p);
    return 0;
  }, [p]);
  const headline2TranslateY = useMemo(() => {
    if (p < 0.25) return FADE_Y_PX;
    if (p < 0.35) return FADE_Y_PX * (1 - smoothstep(0.25, 0.35, p));
    if (p < 0.46) return 0;
    if (p < 0.56) return -FADE_Y_PX * smoothstep(0.46, 0.56, p);
    return -FADE_Y_PX;
  }, [p]);
  const headline3Opacity = useMemo(() => {
    if (p < 0.59) return 0;
    if (p < 0.70) return smoothstep(0.59, 0.70, p);
    if (p < 0.76) return 1;
    if (p < 0.86) return 1 - smoothstep(0.76, 0.86, p);
    return 0;
  }, [p]);
  const headline3TranslateY = useMemo(() => {
    if (p < 0.59) return FADE_Y_PX;
    if (p < 0.70) return FADE_Y_PX * (1 - smoothstep(0.59, 0.70, p));
    if (p < 0.76) return 0;
    if (p < 0.86) return -FADE_Y_PX * smoothstep(0.76, 0.86, p);
    return -FADE_Y_PX;
  }, [p]);
  const headline4Opacity = useMemo(() => {
    if (p < 0.88) return 0;
    if (p < 0.96) return smoothstep(0.88, 0.96, p);
    return 1; // Keep "Leo May 2026" visible at final form (no fade away)
  }, [p]);
  const headline4TranslateY = useMemo(() => {
    if (p < 0.88) return FADE_Y_PX;
    if (p < 0.96) return FADE_Y_PX * (1 - smoothstep(0.88, 0.96, p));
    if (p < 1) return -FADE_Y_PX * smoothstep(0.96, 1, p);
    return -FADE_Y_PX;
  }, [p]);

  const headlineOpacities = [headline1Opacity, headline2Opacity, headline3Opacity, headline4Opacity];
  const headlineTranslateYs = [headline1TranslateY, headline2TranslateY, headline3TranslateY, headline4TranslateY];

  // Zoom to final; on mobile start slightly earlier (0.78) so final form lasts longer in scroll.
  // Ease-out so zoom slows near end (monument feel).
  const pZoom = Math.min(p, 0.95);
  const zoomStartP = isDesktop ? 0.82 : 0.78;
  const zoomTLinear = smoothstep(zoomStartP, 0.95, pZoom);
  const zoomT = 1 - (1 - zoomTLinear) * (1 - zoomTLinear);
  // Keep "Leo May 2026" visible while sculpture zooms in (no narrative fade at end).
  const narrativeStackOpacity = 1;

  // Initial sequence (0–0.15): Headline → Mascot → CTA staggered. Wider fade, smoothstep, small translateY.
  const mascotOpacity = useMemo(() => {
    if (p <= 0.14) return 1;
    return 1 - smoothstep(0.14, 0.28, p);
  }, [p]);
  const mascotLift = smoothstep(0.14, 0.28, p);
  const mascotTranslateY = -75 * mascotLift;

  const ctaOpacity = 1;
  const ctaTranslateY = 0;

  const glbOpacity = smoothstep(0.38, 0.62, p);
  const glbScaleBase = 0.7 + 0.3 * smoothstep(0.4, 0.65, Math.min(p, 0.82));
  const glbScale = isMobile ? Math.min(glbScaleBase, 0.99) : glbScaleBase;
  const cameraZStart = 9;
  const cameraDistanceEnd = isDesktop ? desktopFinalCameraZ : 5.8;
  const framingClampZ = isDesktop ? desktopFinalCameraZ * 0.9 : 5.2;
  let cameraDistance = p < zoomStartP
    ? cameraZStart
    : Math.max(framingClampZ, cameraZStart - zoomT * (cameraZStart - cameraDistanceEnd));
  const CAMERA_Z_MIN = 1;
  if (!Number.isFinite(cameraDistance) || cameraDistance < CAMERA_Z_MIN) cameraDistance = CAMERA_Z_MIN;
  const cameraFov = 45;
  const glbRotationSpeed = p >= 0.95 ? 0.6 : 1;
  /** On mobile, keep GLB lower so it doesn’t touch the anchor text; desktop unchanged */
  const modelOffsetYFinal = isMobile ? 0.22 + 0.05 * smoothstep(0.85, 1, p) : 0;
  const narrativeTranslateYBase = -FADE_Y_PX * smoothstep(0.82, 0.98, p);
  const narrativeTranslateY =
    isMobile ? narrativeTranslateYBase + 56 * smoothstep(0.88, 1, p) : narrativeTranslateYBase;
  const heroFooterOpacity = 1 - smoothstep(0.86, 0.98, p);
  const heroFooterTranslateY = -16 * smoothstep(0.86, 0.98, p);

  const metaOpacity = smoothstep(0.06, 0.2, p) * narrativeStackOpacity;
  const headlineLetterSpacing = isMobile && p >= 0.58 && p < 0.86 ? "0.02em" : "0.03em";
  const particleIntensity = p >= 0.92 ? 0.72 : 1;

  /** Mobile: when we removed the sculpture box, the overlay became a single centered block. After first scroll the island GLB appears in the center and the text/CTA/meta (also centered) sit on top of it. Shift the block up once the island is visible so they don’t overlay. */
  const loadT = Math.min(loadElapsed, 1.5);
  const loadMascotOpacity = smoothstep(0.35, 0.65, loadT);
  const loadMascotY = 32 * (1 - smoothstep(0.35, 0.65, loadT));
  const loadHeadlineOpacity = smoothstep(0.5, 0.8, loadT);
  const loadHeadlineY = 18 * (1 - smoothstep(0.5, 0.8, loadT));
  const loadCTAOpacity = smoothstep(0.65, 0.95, loadT);
  const loadCTAY = 16 * (1 - smoothstep(0.65, 0.95, loadT));
  const loadArrowOpacity = smoothstep(0.85, 1.15, loadT);
  const loadFooterOpacity = smoothstep(1.0, 1.35, loadT);

  const mascotOpacityFinal = loadComplete ? mascotOpacity : loadMascotOpacity;
  const mascotTranslateYFinal = loadComplete ? mascotTranslateY : loadMascotY;
  const narrativeOpacityFinal = loadComplete ? narrativeStackOpacity : loadHeadlineOpacity;
  /** On mobile, zero vertical translate so layout stays fixed; only opacity animates (no jump/collision). */
  const narrativeTranslateYFinal = loadComplete ? (isMobile ? 0 : narrativeTranslateY) : loadHeadlineY;
  const headlineOpacitiesFinal = loadComplete ? headlineOpacities : [1, 0, 0, 0];
  const headlineTranslateYsFinal = loadComplete ? (isMobile ? [0, 0, 0, 0] : headlineTranslateYs) : [loadHeadlineY, 0, 0, 0];
  const ctaOpacityFinal = loadComplete ? 1 : loadCTAOpacity;
  const ctaTranslateYFinal = loadComplete ? 0 : loadCTAY;
  const scrollArrowOpacity =
    loadComplete ? (p <= 0.05 ? 1 : 1 - smoothstep(0.05, 0.12, p)) : loadArrowOpacity;

  return (
    <div
      className="cinematic-hero relative"
      style={{ height: `${wrapperVh}vh` }}
      aria-label="Cinematic hero — scroll drives animation; frame is fixed"
    >
      <div
        className="sticky w-full flex flex-col overflow-hidden"
        style={{
          top: 0,
          height: "100dvh",
          minHeight: "100dvh",
          background: HERO_BG,
        }}
      >
        {/* Subtle starfield behind GLB */}
        <HeroStarfield heroTransitioning={(p >= 0.12 && p <= 0.26) || (p >= 0.74 && p <= 0.92)} />

        {/* Full-viewport climbing-hold GLB layer */}
        <div
          className="absolute inset-0 z-10 flex items-center justify-center"
          style={{
            width: "100vw",
            height: "100dvh",
            opacity: mascotOpacityFinal,
            transform: `translateY(${mascotTranslateYFinal}px)`,
            transition: "opacity 500ms ease-out",
          }}
          aria-hidden
        >
          <HeroClimbingHoldCanvas
            opacity={1}
            isMobile={isMobile}
            allowRotation={heroProgress < 0.18}
            className="w-full h-full"
            style={{ minHeight: "unset", maxHeight: "none" }}
          />
        </div>

        {/* Content area: overlays above GLB (z-20); padding for header/safe-area and breathing room */}
        <div
          className="flex-1 min-h-0 relative flex flex-col items-center justify-center z-20"
          style={{
            paddingTop: `calc(${headerHeight}px + env(safe-area-inset-top, 0px))${isMobile ? " + 1.5rem" : ""}`,
            paddingBottom: isMobile ? "2rem" : undefined,
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 80% 70% at 50% 50%, rgba(18,18,24,0.5) 0%, ${HERO_BG} 70%)`,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: isMobile ? "inset 0 0 15vh 8vh rgba(0,0,0,0.3)" : "inset 0 0 20vh 10vh rgba(0,0,0,0.25)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "rgba(0,0,0,0.04)",
              opacity: smoothstep(0.88, 1, p),
            }}
          />

          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: zoomT > 0.05 ? 25 : 5 }}
          >
            <HeroIslandCanvas
              opacity={glbOpacity}
              scale={glbScale}
              cameraDistance={cameraDistance}
              fov={cameraFov}
              rotationSpeedMultiplier={glbRotationSpeed}
              onFramingReady={setDesktopFinalCameraZ}
              shouldMount={glbMounted}
              modelOffsetY={modelOffsetYFinal}
            />
          </div>

          {/* Mobile: full-viewport GLB is in layer above; overlay = headline → CTA → arrow. Same top spacing as with box so layout/animation unchanged when GLB fades into next scenes. */}
          {isMobile && (
            <div
              className="absolute inset-0 z-30 flex flex-col items-center justify-start overflow-auto pointer-events-none"
              style={{
                paddingTop: `calc(${headerHeight}px + env(safe-area-inset-top, 0px) + 1rem + 42vh)`,
                paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 1rem)`,
                paddingLeft: "1rem",
                paddingRight: "1rem",
              }}
            >
              {/* Headline (was Zone 2) */}
              <div
                className="flex shrink-0 flex-col items-center text-center w-full max-w-[90vw] pointer-events-none"
                style={{
                  opacity: narrativeOpacityFinal,
                  transform: `translateY(${narrativeTranslateYFinal}px)`,
                }}
              >
                <h1
                  className="relative flex flex-col items-center w-full max-w-[95vw] font-bold text-center"
                  style={{
                    minHeight: "5em",
                    marginBottom: 0,
                    fontFamily: "var(--font-bold), MiSans-Bold, sans-serif",
                    letterSpacing: headlineLetterSpacing,
                  }}
                >
                  {headlineStages.map((stage, i) => (
                    <span
                      key={i}
                      className="absolute top-0 left-1/2 flex flex-col items-center justify-center w-full max-w-[95vw] text-center"
                      style={{
                        minHeight: "5em",
                        transform: `translate(-50%, ${headlineTranslateYsFinal[i] ?? 0}px)`,
                        opacity: headlineOpacitiesFinal[i] ?? 0,
                        transformOrigin: "center center",
                      }}
                      aria-hidden={(headlineOpacitiesFinal[i] ?? 0) < 0.01}
                    >
                      <span
                        className="block"
                        style={{
                          color: HERO_HEADLINE_ACCENTS[i] ?? HERO_HEADLINE_ACCENTS[0],
                          fontSize: "clamp(18px, 5.5vw, 32px)",
                          lineHeight: 1.2,
                          marginBottom: "6px",
                        }}
                      >
                        {stage.line1}
                      </span>
                      <span
                        className="block whitespace-nowrap text-white"
                        style={{
                          fontSize: "clamp(11px, 3.2vw, 18px)",
                          fontWeight: 600,
                          letterSpacing: headlineLetterSpacing,
                          lineHeight: 1.25,
                        }}
                      >
                        {stage.line2} {stage.line3}
                      </span>
                    </span>
                  ))}
                </h1>
              </div>
              {/* Zone 3: CTA first, then Premium Climbing Experience right below (small gap) */}
              <div
                className="flex shrink-0 flex-col items-center justify-center pointer-events-auto"
                style={{
                  marginTop: "24px",
                  marginBottom: "48px",
                  opacity: ctaOpacityFinal,
                  transform: `translateY(${ctaTranslateYFinal}px)`,
                }}
              >
                <motion.button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoin();
                  }}
                  className="px-6 py-3 rounded-full border border-white/70 text-white text-xs font-medium tracking-wider uppercase bg-transparent"
                  style={{ letterSpacing: "0.08em", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 1.02 }}
                >
                  {ctaLabel}
                </motion.button>
                <p
                  className="text-white/80 leading-snug text-center shrink-0 pointer-events-none"
                  style={{
                    fontSize: "13px",
                    marginTop: "12px",
                    marginBottom: 0,
                    opacity: metaOpacity,
                    fontFamily: "MiSans-Regular, sans-serif",
                  }}
                >
                  Premium Climbing Experience · HCMC · 2026
                </p>
              </div>
              {/* Arrow down — below CTA on initial scroll; margin so footer doesn't overlap */}
              <div
                className="flex shrink-0 justify-center hero-scroll-arrow-bounce"
                style={{ marginTop: "12px", marginBottom: "28px", opacity: scrollArrowOpacity }}
                aria-hidden
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/arrow-up.svg"
                  alt=""
                  className="w-6 h-6 object-contain opacity-80"
                  style={{ transform: "rotate(180deg)" }}
                />
              </div>
            </div>
          )}

          {/* Mobile: About Us CTA — pill sized to surround the label (not same as Join CTA); top 20%, above logo/GLB; fades in at end of scroll (0.88–0.98), centered. */}
          {isMobile && aboutUsLabel && onAboutUsClick && (() => {
            const mobileAboutOpacity = glbOpacity * smoothstep(0.88, 0.98, heroProgress);
            return (
            <div
              className="absolute left-1/2 z-[35] pointer-events-none"
              style={{
                top: "20%",
                transform: "translateX(-50%)",
                opacity: mobileAboutOpacity,
              }}
              aria-hidden
            >
              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAboutUsClick();
                }}
                className="rounded-full border border-white/70 text-white text-xs font-medium tracking-wider uppercase bg-transparent about-btn-breathe px-5 py-2.5"
                style={{
                  letterSpacing: "0.08em",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  pointerEvents: mobileAboutOpacity > 0.01 ? "auto" : "none",
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 1.02 }}
                aria-label={aboutUsLabel}
              >
                {aboutUsLabel}
              </motion.button>
            </div>
            );
          })()}

          {/* Desktop: narrative, CTA, logo — z-30 so above GLB layer (z-25) for CTA clicks */}
          {!isMobile && (
            <>
              <div
                className="absolute z-30 pointer-events-none left-4 sm:left-6 md:left-8 w-[min(42%,420px)]"
                style={{
                  top: `calc(${headerHeight}px + env(safe-area-inset-top, 0px) + 5rem)`,
                }}
              >
                <div
                  style={{
                    opacity: narrativeOpacityFinal,
                    transform: `translateY(${narrativeTranslateYFinal}px)`,
                  }}
                  className="pointer-events-none"
                >
                  <h1
                    className="relative font-bold text-white tracking-tight leading-[1.2] text-[clamp(28px,5vw,48px)] md:text-[clamp(36px,4vw,56px)] lg:text-[clamp(48px,5vw,72px)] min-h-[4.5em]"
                    style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
                  >
                    {headlineStages.map((stage, i) => (
                      <span
                        key={i}
                        className="absolute top-0 block w-full left-0 right-0"
                        style={{
                          opacity: headlineOpacitiesFinal[i] ?? 0,
                          transform: `translateY(${headlineTranslateYsFinal[i] ?? 0}px)`,
                        }}
                        aria-hidden={(headlineOpacitiesFinal[i] ?? 0) < 0.01}
                      >
                        <span className="block whitespace-nowrap" style={{ color: HERO_HEADLINE_ACCENTS[i] ?? HERO_HEADLINE_ACCENTS[0] }}>{stage.line1}</span>
                        <span className="block text-white mt-0.5 whitespace-nowrap">{stage.line2}</span>
                        <span className="block text-white mt-0.5 whitespace-nowrap">{stage.line3}</span>
                      </span>
                    ))}
                  </h1>
                </div>
              </div>
              {/* CTA first, then Premium Climbing Experience right below (same position as before, meta pushed up) */}
              <div
                className="absolute z-30 pointer-events-auto left-4 sm:left-6 md:left-8 bottom-[120px] flex flex-col items-start"
                style={{
                  opacity: ctaOpacityFinal,
                  transform: `translateY(${ctaTranslateYFinal}px)`,
                }}
              >
                <motion.button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoin();
                  }}
                  className="px-6 py-3 sm:px-8 sm:py-3.5 rounded-full border border-white/70 text-white text-xs sm:text-sm font-medium tracking-wider uppercase bg-transparent"
                  style={{ letterSpacing: "0.05em", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 1.02 }}
                >
                  {ctaLabel}
                </motion.button>
                <p
                  className="text-white/80 mt-3 leading-snug text-[clamp(13px,1.2vw,16px)] pointer-events-none"
                  style={{ opacity: metaOpacity, fontFamily: "MiSans-Regular, sans-serif" }}
                >
                  Premium Climbing Experience · HCMC · 2026
                </p>
              </div>
              {/* About Us CTA — desktop: below GLB with clear gap, centered; not touching GLB */}
              {aboutUsLabel && onAboutUsClick && (
                <div
                  className="absolute left-1/2 z-30 pointer-events-auto flex flex-col items-center justify-center"
                  style={{
                    top: "68%",
                    transform: "translateX(-50%)",
                    opacity: smoothstep(0.78, 0.92, heroProgress),
                  }}
                >
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAboutUsClick();
                    }}
                    className="px-6 py-3 sm:px-8 sm:py-3.5 rounded-full border border-white/70 text-white text-xs sm:text-sm font-medium tracking-wider uppercase bg-transparent about-btn-breathe"
                    style={{ letterSpacing: "0.05em", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 1.02 }}
                    aria-label={aboutUsLabel}
                  >
                    {aboutUsLabel}
                  </motion.button>
                </div>
              )}
            </>
          )}

          {/* Vertical scroll bar (legacy AscentBar driven by hero progress) */}
          <AscentBar progress={heroProgress} intensity={particleIntensity} />
        </div>

        {/* Scroll arrow: desktop only (bottom center above footer); mobile uses two arrows around logo */}
        {!isMobile && (
          <div
            className="absolute left-1/2 z-10 pointer-events-none hero-scroll-arrow-bounce"
            style={{
              bottom: `calc(${footerHeight}px + 20px + env(safe-area-inset-bottom, 0px))`,
              opacity: scrollArrowOpacity,
            }}
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/arrow-up.svg"
              alt=""
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain opacity-80"
              style={{ transform: "rotate(180deg)" }}
            />
          </div>
        )}

        {footerMessages && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center justify-center gap-0.5 py-3 px-4 text-center pointer-events-none"
            style={{
              height: footerHeight,
              minHeight: footerHeight,
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
              background: HERO_BG,
              opacity: loadComplete ? heroFooterOpacity : loadFooterOpacity,
              transform: loadComplete ? `translateY(${heroFooterTranslateY}px)` : "none",
            }}
          >
            <p className="text-white/80 text-xs tracking-wide" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
              {footerMessages.ethos}
            </p>
            <p className="text-white/50 text-[10px] tracking-wide" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
              {footerMessages.copyright ?? "© Leo Mây Climbing Gym — 2026"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
