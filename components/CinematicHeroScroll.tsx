"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";
import { preloadHeroIslandGLB } from "@/components/HeroIslandGLB";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";
import SafeImg, { isValidImgSrc } from "@/components/SafeImg";
import { HERO_BG } from "@/lib/heroConstants";
import { getMessages } from "@/lib/messages";
import { SOCIAL_LINKS } from "@/lib/announcementConfig";
import AscentBar from "@/components/AscentBar";
import { useTransitionOverlay } from "@/context/TransitionOverlayContext";

const HeroIslandCanvas = dynamic(
  () => import("@/components/HeroIslandCanvas").catch(() => ({ default: () => null })),
  { ssr: false }
);
const HeroStarfield = dynamic(
  () => import("@/components/HeroStarfield").catch(() => ({ default: () => null })),
  { ssr: false }
);

/** Arrow asset — single source so img never renders with empty/undefined src. */
const HERO_SCROLL_ARROW_SRC = "/brand/arrow-up.svg";

/** Four brand colors for hero anchor words (one per stage) — from globals emphasis/hero palette */
const HERO_HEADLINE_ACCENTS = ["#22c55e", "#3b82f6", "#FACC15", "#ff1744"] as const;

/** Desktop + mobile: every stage has exactly 3 lines; line1 = anchor (brand color), line2/line3 = white */
type HeadlineStage = { line1: string; line2: string; line3: string };

const HEADLINE_STAGES_EN: HeadlineStage[] = [
  { line1: "CLIMB.", line2: "YOUR OWN", line3: "SKY." },
  { line1: "CONNECT.", line2: "IN THE SAME", line3: "RHYTHM." },
  { line1: "BE HERE.", line2: "FOR EVERY", line3: "MOVEMENT." },
  { line1: "BE FREE.", line2: "YOUR", line3: "WAY." },
];
const HEADLINE_STAGES_VI: HeadlineStage[] = [
  { line1: "LEO.", line2: "GIỮA TRỜI", line3: "RIÊNG." },
  { line1: "KẾT NỐI.", line2: "CHUNG MỘT", line3: "NHỊP." },
  { line1: "HIỆN DIỆN.", line2: "TRONG CHUYỂN", line3: "ĐỘNG." },
  { line1: "TỰ DO.", line2: "THEO", line3: "CÁCH BẠN." },
];

function smoothstep(a: number, b: number, x: number): number {
  if (b === a || !Number.isFinite(a) || !Number.isFinite(b)) return Number.isFinite(x) && x >= b ? 1 : 0;
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
  const { phase: overlayPhase } = useTransitionOverlay();
  const overlayPhaseRef = useRef(overlayPhase);
  overlayPhaseRef.current = overlayPhase;
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
  /** When tab is hidden (app switch), canvases lose WebGL/context; remount on visible so GLBs show again with fresh context. */
  const [tabVisible, setTabVisible] = useState(true);
  /** On mobile, after tab has been hidden once we skip GLB until visible again; then we remount (glbRemountKey) so WebGL is recreated and GLBs render. */
  const mobileSkipGlbAfterHiddenRef = useRef(false);
  /** Increment when returning from background on mobile so climbing-hold and island canvases remount and get a fresh WebGL context. */
  const [glbRemountKey, setGlbRemountKey] = useState(0);
  /** On mobile, defer GLB mount so hero shell (starfield, content) paints first after return from clouds — avoids slow/frozen feel. */
  const [glbDeferredReady, setGlbDeferredReady] = useState(false);
  /** True when video has entered the last second of its first run; gates first headline + arrow reveal. */
  const [videoRevealDone, setVideoRevealDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRevealFiredRef = useRef(false);
  const videoHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** When locale changes (e.g. EN/VN switch), reset skip-GLB ref so GLBs show again after language change or refresh. */
  useEffect(() => {
    mobileSkipGlbAfterHiddenRef.current = false;
  }, [locale]);

  /** On mobile: short defer when tab is visible (e.g. after language switch) so GLBs show faster; longer defer when tab was hidden to avoid slow first paint after app switch. */
  useEffect(() => {
    if (!isMobile) {
      setGlbDeferredReady(true);
      return;
    }
    const visible = typeof document !== "undefined" && document.visibilityState === "visible";
    const delayMs = visible ? 120 : 380;
    const t = setTimeout(() => setGlbDeferredReady(true), delayMs);
    return () => clearTimeout(t);
  }, [isMobile]);

  useEffect(() => {
    preloadHeroIslandGLB();
  }, []);

  /** Fallback: only if video never loads (e.g. missing file); 15s so a ~5s video always triggers reveal from playback first. */
  useEffect(() => {
    if (videoRevealDone) return;
    const t = setTimeout(() => setVideoRevealDone(true), 15000);
    return () => clearTimeout(t);
  }, [videoRevealDone]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      try {
        const visible = document.visibilityState !== "hidden";
        const mobile = typeof window !== "undefined" && window.innerWidth <= 768;
        // Only skip GLB when tab actually went hidden (e.g. app switch), not during route transition (TV off to clouds).
        if (!visible && mobile && overlayPhaseRef.current === "idle") {
          mobileSkipGlbAfterHiddenRef.current = true;
        }
        // When returning from background on mobile, allow GLBs again and remount so WebGL context is recreated (fixes GLB disappearing after app switch).
        if (visible && mobile && mobileSkipGlbAfterHiddenRef.current) {
          mobileSkipGlbAfterHiddenRef.current = false;
          setGlbRemountKey((k) => k + 1);
        }
        setTabVisible(visible);
      } catch {
        setTabVisible(true);
      }
    };
    // Only react to visibilitychange; do not sync on mount so we don't hide GLBs when tab reports "hidden" on load (e.g. desktop with unfocused window).
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
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
    return () => {
      if (videoHoldTimeoutRef.current) {
        clearTimeout(videoHoldTimeoutRef.current);
        videoHoldTimeoutRef.current = null;
      }
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
    // Defer first scroll read to next frame so we don't run during fragile init (avoids client error on refresh with restored scroll).
    const rafId = requestAnimationFrame(() => {
      try {
        onScroll();
      } catch {
        // no-op
      }
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [wrapperVh, onCenterLogoGone]);

  useEffect(() => {
    if (heroProgress >= 0.2) setGlbMounted(true);
  }, [heroProgress]);

  /** Mobile only: once defer passed, allow island to mount without waiting for scroll to 0.2 (helps after language switch). Desktop unchanged — island still mounts only when heroProgress >= 0.2. */
  useEffect(() => {
    if (isMobile && glbDeferredReady) setGlbMounted(true);
  }, [isMobile, glbDeferredReady]);

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
  /** Same timing as About Us: mobile end-of-scroll (0.88–0.98), desktop (0.78–0.92). */
  const mobileSocialOpacity = glbOpacity * smoothstep(0.88, 0.98, p);
  const desktopAboutAndSocialOpacity = smoothstep(0.78, 0.92, p);
  const headlineLetterSpacing = isMobile && p >= 0.58 && p < 0.86 ? "0.02em" : "0.03em";
  const particleIntensity = p >= 0.92 ? 0.72 : 1;

  /** Mobile: when we removed the sculpture box, the overlay became a single centered block. After first scroll the island GLB appears in the center and the text/CTA/meta (also centered) sit on top of it. Shift the block up once the island is visible so they don’t overlay. */
  const loadT = Math.min(loadElapsed, 1.5);
  /** Initial GLB (climbing hold) fades in over load sequence, like the 2nd GLB (island) fades in on scroll. */
  const loadMascotOpacity = smoothstep(0.15, 0.7, loadT);
  const loadMascotY = 32 * (1 - smoothstep(0.35, 0.65, loadT));
  const loadHeadlineOpacity = smoothstep(0.5, 0.8, loadT);
  const loadHeadlineY = 18 * (1 - smoothstep(0.5, 0.8, loadT));
  const loadCTAOpacity = smoothstep(0.65, 0.95, loadT);
  const loadCTAY = 16 * (1 - smoothstep(0.65, 0.95, loadT));
  const loadArrowOpacity = smoothstep(0.85, 1.15, loadT);
  const loadFooterOpacity = smoothstep(1.0, 1.35, loadT);

  const mascotOpacityFinal = loadComplete ? mascotOpacity : loadMascotOpacity;
  const mascotTranslateYFinal = loadComplete ? mascotTranslateY : loadMascotY;
  /** All hero content (narrative, headlines, CTA, arrow, footer) only appears after last second of first video run. */
  const narrativeOpacityFinal = videoRevealDone
    ? (loadComplete ? narrativeStackOpacity : loadHeadlineOpacity)
    : 0;
  /** On mobile, zero vertical translate so layout stays fixed; only opacity animates (no jump/collision). */
  const narrativeTranslateYFinal = loadComplete ? (isMobile ? 0 : narrativeTranslateY) : loadHeadlineY;
  const headlineOpacitiesFinal = [
    videoRevealDone ? (loadComplete ? (headlineOpacities[0] ?? 0) : 1) : 0,
    videoRevealDone ? (loadComplete ? (headlineOpacities[1] ?? 0) : 0) : 0,
    videoRevealDone ? (loadComplete ? (headlineOpacities[2] ?? 0) : 0) : 0,
    videoRevealDone ? (loadComplete ? (headlineOpacities[3] ?? 0) : 0) : 0,
  ];
  const headlineTranslateYsFinal = loadComplete ? (isMobile ? [0, 0, 0, 0] : headlineTranslateYs) : [loadHeadlineY, 0, 0, 0];
  const ctaOpacityFinal = videoRevealDone ? (loadComplete ? 1 : loadCTAOpacity) : 0;
  const ctaTranslateYFinal = loadComplete ? 0 : loadCTAY;
  const scrollArrowOpacity = videoRevealDone
    ? (loadComplete ? (p <= 0.05 ? 1 : 1 - smoothstep(0.05, 0.18, p)) : 1)
    : 0;
  const footerOpacityFinal = videoRevealDone
    ? (loadComplete ? heroFooterOpacity : loadFooterOpacity)
    : 0;

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
        {/* Subtle starfield behind GLB; inner boundary so a throw here doesn't take down the whole hero (e.g. after clouds→back on mobile). */}
        {tabVisible && (
          <ClientErrorBoundary fallback={null}>
            <HeroStarfield heroTransitioning={(p >= 0.12 && p <= 0.26) || (p >= 0.74 && p <= 0.92)} />
          </ClientErrorBoundary>
        )}

        {/* Looping background video (replaces climbing-hold GLB); same fade in/out as GLB: load sequence then scroll 0.14→0.28. Mobile: same defer as GLB so timing matches. */}
        {tabVisible && !(isMobile && mobileSkipGlbAfterHiddenRef.current) && (glbDeferredReady || !isMobile) && (
          <>
            <div
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{
                zIndex: 0,
                opacity: mascotOpacityFinal * 0.85,
                transition: "opacity 500ms ease-out, transform 500ms ease-out",
                transform: isMobile
                  ? `translateY(${mascotTranslateYFinal}px) scale(0.5)`
                  : `translateY(${mascotTranslateYFinal}px)`,
                transformOrigin: "center center",
              }}
              aria-hidden
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: isMobile ? "100%" : "88%",
                  height: isMobile ? "100%" : "88%",
                  transform: "translate(-50%, -50%)",
                  objectFit: "cover",
                  objectPosition: "center center",
                }}
                onTimeUpdate={() => {
                  if (videoRevealFiredRef.current) return;
                  const el = videoRef.current;
                  if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
                  if (el.currentTime >= el.duration - 1) {
                    videoRevealFiredRef.current = true;
                    setVideoRevealDone(true);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRevealFiredRef.current) return;
                  const el = videoRef.current;
                  if (!el || !Number.isFinite(el.duration)) return;
                  if (el.duration <= 1 || el.currentTime >= el.duration - 1) {
                    videoRevealFiredRef.current = true;
                    setVideoRevealDone(true);
                  }
                }}
                onEnded={() => {
                  const el = videoRef.current;
                  if (!el) return;
                  el.pause();
                  videoHoldTimeoutRef.current = setTimeout(() => {
                    videoHoldTimeoutRef.current = null;
                    el.currentTime = 0;
                    el.play();
                  }, 5000);
                }}
                aria-hidden
              >
                {/* Place video-1-trial.mp4 in public/ (e.g. copy from downloads/leo may ip folder); keep under 3–5MB, optimized mp4 for performance. */}
                <source src="/video-1-trial.mp4" type="video/mp4" />
              </video>
            </div>
            <div
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                zIndex: 1,
                background: "linear-gradient(to bottom, rgba(255,255,255,0.25), rgba(255,255,255,0.45))",
                opacity: mascotOpacityFinal * 0.85,
                transition: "opacity 500ms ease-out",
              }}
              aria-hidden
            />
          </>
        )}

        {/* Content area: above video + overlay (z-2); padding for header/safe-area and breathing room */}
        <div
          className="flex-1 min-h-0 relative flex flex-col items-center justify-center z-[2]"
          style={{
            paddingTop: `calc(${headerHeight}px + env(safe-area-inset-top, 0px))${isMobile ? " + 1.5rem" : ""}`,
            paddingBottom: isMobile ? "2rem" : undefined,
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 80% 70% at 50% 50%, rgba(18,18,24,0.5) 0%, ${HERO_BG} 70%)`,
              opacity: videoRevealDone ? 1 : 0,
              transition: "opacity 0.6s ease-out",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: isMobile ? "inset 0 0 15vh 8vh rgba(0,0,0,0.3)" : "inset 0 0 20vh 10vh rgba(0,0,0,0.25)",
              opacity: videoRevealDone ? 1 : 0,
              transition: "opacity 0.6s ease-out",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "rgba(0,0,0,0.04)",
              opacity: videoRevealDone ? smoothstep(0.88, 1, p) : 0,
              transition: "opacity 0.6s ease-out",
            }}
          />

          {tabVisible && !(isMobile && mobileSkipGlbAfterHiddenRef.current) && (glbDeferredReady || !isMobile) && (
            <ClientErrorBoundary fallback={null}>
              <div
                key={glbRemountKey}
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
            </ClientErrorBoundary>
          )}

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
                        transition: "opacity 0.6s ease-out",
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
              {/* Social links — same timing as About Us (0.88–0.98), below Premium Climbing Experience line */}
              <div
                className="flex shrink-0 flex-wrap justify-center items-center gap-4 pointer-events-auto"
                style={{
                  marginTop: "14px",
                  marginBottom: "48px",
                  opacity: mobileSocialOpacity,
                }}
                aria-label="Social links"
              >
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 rounded-full border border-white/25 text-white/90 transition-colors hover:text-white hover:opacity-90"
                  aria-label="Instagram"
                >
                  <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href={SOCIAL_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 rounded-full border border-white/25 text-white/90 transition-colors hover:text-white hover:opacity-90"
                  aria-label="Facebook"
                >
                  <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href={SOCIAL_LINKS.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 rounded-full border border-white/25 text-white/90 transition-colors hover:text-white hover:opacity-90"
                  aria-label="TikTok"
                >
                  <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>
              </div>
              {/* Arrow: same content container as headline/CTA; scroll opacity on wrapper so it fades; drift animation on inner */}
              <div
                className="absolute left-1/2 z-20 pointer-events-none"
                style={{
                  bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
                  marginLeft: 3,
                  transform: "translateX(-50%)",
                  opacity: scrollArrowOpacity * 0.88,
                  filter: "drop-shadow(0 0 6px rgba(255,255,255,0.25))",
                  transition: "opacity 0.6s ease-out",
                }}
                aria-hidden
              >
                <div className="hero-scroll-arrow-drift">
                  {isValidImgSrc(HERO_SCROLL_ARROW_SRC) ? (
                    <SafeImg
                      src={HERO_SCROLL_ARROW_SRC}
                      alt=""
                      className="w-7 h-7 object-contain"
                      style={{ transform: "rotate(180deg)" }}
                    />
                  ) : null}
                </div>
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
                          transition: "opacity 0.6s ease-out",
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
              {/* About Us CTA + social links — desktop: below GLB, centered; same fade (0.78–0.92) */}
              {aboutUsLabel && onAboutUsClick && (
                <div
                  className="absolute left-1/2 z-30 pointer-events-auto flex flex-col items-center justify-center"
                  style={{
                    top: "68%",
                    transform: "translateX(-50%)",
                    opacity: desktopAboutAndSocialOpacity,
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
                  <div
                    className="flex items-center justify-center gap-4 mt-4"
                    aria-label="Social links"
                  >
                    <motion.a
                      href={SOCIAL_LINKS.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="about-btn-breathe flex items-center justify-center w-12 h-12 rounded-full border border-white/25 text-white/90 transition-colors hover:text-white hover:opacity-90"
                      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 1.02 }}
                      aria-label="Instagram"
                    >
                      <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </motion.a>
                    <motion.a
                      href={SOCIAL_LINKS.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="about-btn-breathe flex items-center justify-center w-12 h-12 rounded-full border border-white/25 text-white/90 transition-colors hover:text-white hover:opacity-90"
                      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 1.02 }}
                      aria-label="Facebook"
                    >
                      <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </motion.a>
                    <motion.a
                      href={SOCIAL_LINKS.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="about-btn-breathe flex items-center justify-center w-12 h-12 rounded-full border border-white/25 text-white/90 transition-colors hover:text-white hover:opacity-90"
                      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 1.02 }}
                      aria-label="TikTok"
                    >
                      <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                    </motion.a>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Vertical scroll bar (legacy AscentBar driven by hero progress) */}
          <AscentBar progress={heroProgress} intensity={particleIntensity} />
        </div>

        {/* Scroll arrow: desktop only (bottom center above footer); scroll opacity on wrapper so it fades; drift on inner */}
        {!isMobile && (
          <div
            className="absolute left-1/2 z-10 pointer-events-none"
            style={{
              bottom: `calc(${footerHeight}px + 20px + env(safe-area-inset-bottom, 0px))`,
              transform: "translateX(-50%)",
              opacity: scrollArrowOpacity,
              filter: "drop-shadow(0 0 6px rgba(255,255,255,0.25))",
              transition: "opacity 0.6s ease-out",
            }}
            aria-hidden
          >
            <div className="hero-scroll-arrow-drift">
              {isValidImgSrc(HERO_SCROLL_ARROW_SRC) ? (
                <SafeImg
                  src={HERO_SCROLL_ARROW_SRC}
                  alt=""
                  className="w-11 h-11 sm:w-14 sm:h-14 object-contain"
                  style={{ transform: "rotate(180deg)" }}
                />
              ) : null}
            </div>
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
              opacity: footerOpacityFinal,
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
