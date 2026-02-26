"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";
import { preloadHeroIslandGLB } from "@/components/HeroIslandGLB";
import { HERO_BG } from "@/lib/heroConstants";

const HeroIslandCanvas = dynamic(() => import("@/components/HeroIslandCanvas"), { ssr: false });

const HEADLINES_EN = [
  "CLIMB WITH INTENTION.",
  "ASCEND TOGETHER.",
  "SHAPE THE STANDARD.",
  "LEO MÂY — 2026.",
];
const HEADLINES_VI = [
  "LEO CÓ CHỦ ĐÍCH.",
  "VƯƠN CAO CÙNG NHAU.",
  "ĐỊNH HÌNH CHUẨN MỰC.",
  "LEO MÂY — 2026.",
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
}

function useIsMobile(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
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
}: CinematicHeroScrollProps) {
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const [heroProgress, setHeroProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<number | null>(null);
  const [glbMounted, setGlbMounted] = useState(false);
  const [loadElapsed, setLoadElapsed] = useState(0);
  const [loadComplete, setLoadComplete] = useState(false);
  const loadStartRef = useRef<number | null>(null);
  const [desktopFinalCameraZ, setDesktopFinalCameraZ] = useState(6);

  useEffect(() => {
    preloadHeroIslandGLB();
  }, []);

  useEffect(() => {
    loadStartRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      const start = loadStartRef.current;
      if (start == null) return;
      const elapsed = (performance.now() - start) / 1000;
      setLoadElapsed(elapsed);
      if (elapsed >= 1.4) {
        setLoadComplete(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 700;
    const wrapperHeight = (vh * wrapperVh) / 100;
    const maxScroll = Math.max(1, wrapperHeight - vh);
    const progressEndScroll = maxScroll * 0.95;
    const onScroll = () => {
      const y = typeof window !== "undefined" ? window.scrollY : 0;
      pendingRef.current = Math.max(0, Math.min(1, y / progressEndScroll));
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const v = pendingRef.current;
        if (v != null) setHeroProgress(v);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [wrapperVh]);

  useEffect(() => {
    if (heroProgress >= 0.2) setGlbMounted(true);
  }, [heroProgress]);

  const p = heroProgress;
  const headlines = locale === "vi" ? HEADLINES_VI : HEADLINES_EN;

  const FADE_Y_PX = 20;
  const HOLD = 0.02;

  // Sequential headlines: fade out old fully → hold → fade in new. Wider windows, smoothstep, translateY during fade.
  const headline1Opacity = useMemo(() => {
    if (p <= 0.12) return 1;
    if (p < 0.22) return 1 - smoothstep(0.12, 0.22, p);
    return 0;
  }, [p]);
  const headline1TranslateY = useMemo(() => {
    if (p <= 0.12) return 0;
    if (p < 0.22) return -FADE_Y_PX * smoothstep(0.12, 0.22, p);
    return -FADE_Y_PX;
  }, [p]);
  const headline2Opacity = useMemo(() => {
    if (p < 0.24) return 0;
    if (p < 0.36) return smoothstep(0.24, 0.36, p);
    if (p < 0.46) return 1;
    if (p < 0.56) return 1 - smoothstep(0.46, 0.56, p);
    return 0;
  }, [p]);
  const headline2TranslateY = useMemo(() => {
    if (p < 0.24) return FADE_Y_PX;
    if (p < 0.36) return FADE_Y_PX * (1 - smoothstep(0.24, 0.36, p));
    if (p < 0.46) return 0;
    if (p < 0.56) return -FADE_Y_PX * smoothstep(0.46, 0.56, p);
    return -FADE_Y_PX;
  }, [p]);
  const headline3Opacity = useMemo(() => {
    if (p < 0.58) return 0;
    if (p < 0.70) return smoothstep(0.58, 0.70, p);
    if (p < 0.76) return 1;
    if (p < 0.86) return 1 - smoothstep(0.76, 0.86, p);
    return 0;
  }, [p]);
  const headline3TranslateY = useMemo(() => {
    if (p < 0.58) return FADE_Y_PX;
    if (p < 0.70) return FADE_Y_PX * (1 - smoothstep(0.58, 0.70, p));
    if (p < 0.76) return 0;
    if (p < 0.86) return -FADE_Y_PX * smoothstep(0.76, 0.86, p);
    return -FADE_Y_PX;
  }, [p]);
  const headline4Opacity = useMemo(() => {
    if (p < 0.88) return 0;
    if (p < 0.96) return smoothstep(0.88, 0.96, p);
    return 1 - smoothstep(0.96, 1, p);
  }, [p]);
  const headline4TranslateY = useMemo(() => {
    if (p < 0.88) return FADE_Y_PX;
    if (p < 0.96) return FADE_Y_PX * (1 - smoothstep(0.88, 0.96, p));
    if (p < 1) return -FADE_Y_PX * smoothstep(0.96, 1, p);
    return -FADE_Y_PX;
  }, [p]);

  const headlineOpacities = [headline1Opacity, headline2Opacity, headline3Opacity, headline4Opacity];
  const headlineTranslateYs = [headline1TranslateY, headline2TranslateY, headline3TranslateY, headline4TranslateY];

  // Zoom 0.82 → 0.95 only; smoothstep easing; lock at 0.95 (no pop). Progress reaches 1 at 95% of scroll.
  const pZoom = Math.min(p, 0.95);
  const zoomT = smoothstep(0.82, 0.95, pZoom);
  const narrativeStackOpacity = 1 - smoothstep(0.82, 0.98, p);

  // Initial sequence (0–0.15): Headline → Mascot → CTA staggered. Wider fade, smoothstep, small translateY.
  const mascotOpacity = useMemo(() => {
    if (p <= 0.14) return 1;
    return 1 - smoothstep(0.14, 0.28, p);
  }, [p]);
  const mascotLift = smoothstep(0.14, 0.28, p);
  const mascotTranslateY = -75 * mascotLift;

  const ctaOpacity = 1;
  const ctaTranslateY = 0;

  const climbsFadeOut = 1 - smoothstep(0.38, 0.62, p);
  const climbsTranslateY = -18 * smoothstep(0.38, 0.62, p);
  const wallOpacityScroll = smoothstep(0.18, 0.38, p) * climbsFadeOut;
  const wallOpacity = p < 0.18 ? 1 : wallOpacityScroll;
  // Desktop: no holds layer — initial scroll → mascot + text → IP and holds invisible → text on left → sculpture appears.
  const holdsOpacityScroll = smoothstep(0.18, 0.38, p) * climbsFadeOut;
  const holdsOpacity = isDesktop ? 0 : (p < 0.18 ? 1 : holdsOpacityScroll);

  const glbOpacity = smoothstep(0.38, 0.62, p);
  const glbScaleBase = 0.7 + 0.3 * smoothstep(0.4, 0.65, Math.min(p, 0.82));
  const glbScale = glbScaleBase;
  const cameraZStart = 9;
  const cameraDistanceEnd = isDesktop ? desktopFinalCameraZ : 7;
  const framingClampZ = isDesktop ? desktopFinalCameraZ * 0.9 : 6.2;
  const cameraDistance = p < 0.82
    ? cameraZStart
    : Math.max(framingClampZ, cameraZStart - zoomT * (cameraZStart - cameraDistanceEnd));
  const cameraFov = 45;
  const glbRotationSpeed = p >= 0.95 ? 0.8 : 1;
  const narrativeTranslateY = -FADE_Y_PX * smoothstep(0.82, 0.98, p);
  const heroFooterOpacity = 1 - smoothstep(0.86, 0.98, p);
  const heroFooterTranslateY = -16 * smoothstep(0.86, 0.98, p);

  const metaOpacity = smoothstep(0.06, 0.2, p) * narrativeStackOpacity;

  const loadT = Math.min(loadElapsed, 1.5);
  const loadSceneOpacity = smoothstep(0.4, 0.7, loadT);
  const loadMascotOpacity = smoothstep(0.6, 0.9, loadT);
  const loadMascotY = 40 * (1 - smoothstep(0.6, 0.9, loadT));
  const loadHeadlineOpacity = smoothstep(0.8, 1.1, loadT);
  const loadHeadlineY = 20 * (1 - smoothstep(0.8, 1.1, loadT));
  const loadCTAOpacity = smoothstep(1.0, 1.3, loadT);
  const loadCTAY = 20 * (1 - smoothstep(1.0, 1.3, loadT));
  const loadArrowOpacity = smoothstep(1.2, 1.5, loadT);

  const sceneOpacity = loadComplete ? 1 : loadSceneOpacity;
  const sceneTranslateY = loadComplete ? climbsTranslateY : 0;
  const mascotOpacityFinal = loadComplete ? mascotOpacity : loadMascotOpacity;
  const mascotTranslateYFinal = loadComplete ? mascotTranslateY : loadMascotY;
  const narrativeOpacityFinal = loadComplete ? narrativeStackOpacity : loadHeadlineOpacity;
  const narrativeTranslateYFinal = loadComplete ? narrativeTranslateY : loadHeadlineY;
  const headlineOpacitiesFinal = loadComplete ? headlineOpacities : [1, 0, 0, 0];
  const headlineTranslateYsFinal = loadComplete ? headlineTranslateYs : [loadHeadlineY, 0, 0, 0];
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
        {/* Content area: top padding = header + safe-area; on mobile add extra vertical padding for breathing room */}
        <div
          className="flex-1 min-h-0 relative flex flex-col items-center justify-center"
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
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            style={{
              opacity: loadComplete ? wallOpacity : loadSceneOpacity,
              transform: `translateY(${sceneTranslateY}px)`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(160deg, rgba(18,18,24,0.5) 0%, rgba(11,11,15,0.35) 50%, transparent 100%)",
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ opacity: loadComplete ? holdsOpacity : 1 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/holds.svg" alt="" className="max-w-[90%] max-h-[70%] object-contain" style={{ filter: "blur(2px)" }} />
            </div>
          </div>

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
            />
          </div>

          {/* Mobile: full-height flex — top third mascot, center headline (one line), lower third CTA; spacious, cinematic */}
          {isMobile && (
            <div
              className="absolute inset-x-0 top-0 bottom-0 z-10 flex flex-col items-center overflow-auto"
              style={{
                paddingTop: `calc(${headerHeight}px + env(safe-area-inset-top, 0px) + 1.5rem)`,
                paddingBottom: `calc(2rem + env(safe-area-inset-bottom, 0px))`,
                paddingLeft: "1rem",
                paddingRight: "1rem",
              }}
            >
              {/* Top third: mascot, clamped height so it doesn't push layout */}
              <div
                className="flex shrink-0 items-center justify-center w-[65%] max-w-[260px] max-h-[28vh] pointer-events-none"
                style={{
                  opacity: mascotOpacityFinal,
                  transform: `translateY(${mascotTranslateYFinal}px)`,
                }}
              >
                <div className={`w-full h-full flex items-center justify-center ${loadComplete ? "hero-mascot-float" : ""}`}>
                  {partColors ? (
                    <object
                      data="/brand/ip-flying.svg"
                      type="image/svg+xml"
                      aria-hidden
                      className="w-full h-full object-contain aspect-square"
                      style={{ color: "#fffef8" }}
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src="/brand/ip-flying.svg" alt="" className="w-full h-full object-contain aspect-square" />
                  )}
                </div>
              </div>
              <div className="h-8 shrink-0" aria-hidden />
              {/* Center: headline — one line only, no wrap, centered, stronger letter-spacing */}
              <div
                className="flex shrink-0 flex-col items-center justify-center text-center w-full max-w-[90vw] pointer-events-none"
                style={{
                  opacity: narrativeOpacityFinal,
                  transform: `translateY(${narrativeTranslateYFinal}px)`,
                }}
              >
                <h1
                  className="relative font-bold text-white text-center min-h-[1.3em] leading-tight w-full max-w-[90vw]"
                  style={{
                    fontFamily: "var(--font-bold), MiSans-Bold, sans-serif",
                    fontSize: "clamp(18px, 5.5vw, 32px)",
                    letterSpacing: "0.03em",
                  }}
                >
                  {headlines.map((line, i) => (
                    <span
                      key={i}
                      className="absolute top-0 left-1/2 -translate-x-1/2 block w-full max-w-[90vw] text-center whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{
                        opacity: headlineOpacitiesFinal[i] ?? 0,
                        transform: `translate(-50%, ${headlineTranslateYsFinal[i] ?? 0}px)`,
                      }}
                      aria-hidden={(headlineOpacitiesFinal[i] ?? 0) < 0.01}
                    >
                      {line}
                    </span>
                  ))}
                </h1>
                <p
                  className="text-white/80 mt-3 leading-snug text-[13px] text-center"
                  style={{ opacity: metaOpacity, fontFamily: "MiSans-Regular, sans-serif" }}
                >
                  Premium Climbing Experience — HCMC — 2026
                </p>
              </div>
              <div className="h-10 shrink-0" aria-hidden />
              {/* Spacer: pushes CTA into lower third */}
              <div className="flex-1 min-h-[2rem]" aria-hidden />
              <div className="h-6 shrink-0" aria-hidden />
              {/* Lower third: CTA */}
              <div
                className="flex shrink-0 justify-center pointer-events-auto"
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
                  className="px-6 py-3 rounded-full border border-white/70 text-white text-xs font-medium tracking-wider uppercase bg-transparent"
                  style={{ letterSpacing: "0.08em", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 1.02 }}
                >
                  JOIN THE FOUNDING ASCENT
                </motion.button>
              </div>
            </div>
          )}

          {/* Desktop: narrative, CTA, mascot in original positions */}
          {!isMobile && (
            <>
              <div
                className="absolute z-10 pointer-events-none left-4 sm:left-6 md:left-8 w-[min(42%,420px)]"
                style={{
                  top: `calc(${headerHeight}px + env(safe-area-inset-top, 0px) + 1rem)`,
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
                    {headlines.map((line, i) => (
                      <span
                        key={i}
                        className="absolute top-0 block w-full left-0 right-0"
                        style={{
                          opacity: headlineOpacitiesFinal[i] ?? 0,
                          transform: `translateY(${headlineTranslateYsFinal[i] ?? 0}px)`,
                        }}
                        aria-hidden={(headlineOpacitiesFinal[i] ?? 0) < 0.01}
                      >
                        {line}
                      </span>
                    ))}
                  </h1>
                  <p
                    className="text-white/80 mt-4 leading-snug text-[clamp(13px,1.2vw,16px)]"
                    style={{ opacity: metaOpacity, fontFamily: "MiSans-Regular, sans-serif" }}
                  >
                    Premium Climbing Experience — HCMC — 2026
                  </p>
                </div>
              </div>
              <div
                className="absolute z-20 pointer-events-auto left-4 sm:left-6 md:left-8 bottom-[120px]"
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
                  JOIN THE FOUNDING ASCENT
                </motion.button>
              </div>
              <div
                className="absolute left-1/2 top-1/2 z-10 flex items-center justify-center pointer-events-none w-[38%] max-w-[320px]"
                style={{
                  opacity: mascotOpacityFinal,
                  transform: `translate(-50%, calc(-50% + ${mascotTranslateYFinal}px))`,
                }}
              >
                <div className={loadComplete ? "hero-mascot-float w-full h-full flex items-center justify-center" : "w-full h-full"}>
                  {partColors ? (
                    <object
                      data="/brand/ip-flying.svg"
                      type="image/svg+xml"
                      aria-hidden
                      className="w-full h-full object-contain aspect-square"
                      style={{ color: "#fffef8" }}
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src="/brand/ip-flying.svg" alt="" className="w-full aspect-square object-contain" />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Vertical progress bar */}
          <div
            className="absolute right-3 top-0 bottom-0 w-px z-20 flex flex-col pointer-events-none"
            style={{
              paddingTop: `calc(${headerHeight}px + env(safe-area-inset-top, 0px))`,
              paddingBottom: `calc(${footerHeight}px + 16px + env(safe-area-inset-bottom, 0px))`,
            }}
          >
            <div className="flex-1 min-h-0 flex flex-col justify-end">
              <div
                className="w-full rounded-full bg-white/50"
                style={{
                  height: `${heroProgress * 100}%`,
                  minHeight: 2,
                }}
              />
            </div>
          </div>
        </div>

        {/* Scroll arrow: bottom center, above footer; fades in at 1.2s, bounce; fades out when heroProgress > 0.05 */}
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

        {footerMessages && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center justify-center gap-0.5 py-3 px-4 text-center pointer-events-none"
            style={{
              height: footerHeight,
              minHeight: footerHeight,
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
              background: HERO_BG,
              opacity: heroFooterOpacity,
              transform: `translateY(${heroFooterTranslateY}px)`,
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
