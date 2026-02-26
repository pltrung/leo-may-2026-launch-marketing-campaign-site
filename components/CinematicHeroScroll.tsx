"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import AscentBar from "@/components/AscentBar";
import type { Locale } from "@/lib/i18n";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";
import { preloadHeroIslandGLB } from "@/components/HeroIslandGLB";
import { HERO_BG } from "@/lib/heroConstants";

const HeroIslandCanvas = dynamic(
  () => import("@/components/HeroIslandCanvas"),
  { ssr: false }
);

/** Four headlines only; all driven by heroProgress. No BUILD YOUR CLOUD. */
const SCROLL_HEADLINES_EN: string[] = [
  "CLIMB WITH INTENTION.",
  "ASCEND TOGETHER.",
  "SHAPE THE STANDARD.",
  "LEO MÂY — 2026.",
];

const SCROLL_HEADLINES_VI: string[] = [
  "LEO CÓ CHỦ ĐÍCH.",
  "VƯƠN CAO CÙNG NHAU.",
  "ĐỊNH HÌNH CHUẨN MỰC.",
  "LEO MÂY — 2026.",
];

const ENABLE_HERO_SOUND = false;

/** Mobile: break headline into 1–2 words per row for larger, less compressed type. */
function mobileHeadlineLines(line: string): string[] {
  const words = line.trim().split(/\s+/);
  if (words.length <= 2) return [line];
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += 2) {
    lines.push(words.slice(i, i + 2).join(" "));
  }
  return lines;
}

const EASE_REVEAL = [0.4, 0, 0.2, 1] as const;
const EASE_AMBIENT = [0.42, 0, 0.58, 1] as const;
const EASE_SCROLL = [0.25, 0.1, 0.25, 1] as const;

/**
 * LAYER 2 — Cinematic hero stage. One heroProgress (0→1) drives all animations.
 * No threshold-based mounts; only opacity/transform/camera.
 *
 * heroProgress timeline:
 *   0.00–0.12   IP visible. Headline "CLIMB WITH INTENTION." Meta + CTA. No GLB/holds.
 *   0.12–0.22   IP lifts + fades out. Wall/holds fade in from ~0.18. Headline unchanged.
 *   0.22–0.30   Headline + meta fade out. No new headline. GLB hidden.
 *   0.30–0.40   GLB fades in. Holds stable. No text.
 *   0.40–0.52   Fade in "ASCEND TOGETHER." GLB subtle. CTA remains.
 *   0.52–0.65   Fade out "ASCEND TOGETHER." GLB slight camera shift. Holds fade back.
 *   0.60–0.72   Fade in "SHAPE THE STANDARD."
 *   0.72–0.85   Fade out previous, fade in "LEO MÂY — 2026." GLB zooms out slightly.
 *   0.85–1.00   Fade out all headline + meta. CTA only. Particles down. Darken bg. Dolly in (z, FOV, scale). GLB dominates.
 */

export interface CinematicHeroScrollProps {
  partColors: MascotPartColors | null;
  onJoin: () => void;
  locale?: Locale;
  /** Layer 1 height (px) so sticky stage sits below it. */
  headerHeight?: number;
  /** Footer overlay height (px); stage height = 100vh - header - footer. */
  footerHeight?: number;
  /** Wrapper scroll height (vh). Must be enough (e.g. 320) so sticky stays active until heroProgress = 1. */
  wrapperVh?: number;
  /** Footer text rendered as overlay at bottom of hero stage (no separate page footer during hero). */
  footerMessages?: { ethos: string; copyright?: string };
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setMobile(mq.matches);
    const on = () => setMobile(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mobile;
}

export default function CinematicHeroScroll({
  partColors,
  onJoin,
  locale = "en",
  headerHeight = 64,
  footerHeight = 56,
  wrapperVh = 320,
  footerMessages,
}: CinematicHeroScrollProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 700);
  const [userInteracted, setUserInteracted] = useState(false);
  const [islandCanvasMounted, setIslandCanvasMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRafRef = useRef<number>(0);
  const scrollPendingRef = useRef<number | null>(null);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function smoothstep(a: number, b: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  const heroProgress = scrollProgress;
  const revealT = heroProgress;

  useEffect(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 700;
    const scrollRange = (vh * wrapperVh) / 100;
    const onScroll = () => {
      const y = window.scrollY;
      scrollPendingRef.current = Math.min(y / scrollRange, 1);
      if (scrollRafRef.current !== 0) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = 0;
        const p = scrollPendingRef.current;
        if (p != null) setScrollProgress(p);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [wrapperVh]);

  useEffect(() => {
    preloadHeroIslandGLB();
  }, []);

  const handleInteraction = useCallback(() => {
    setUserInteracted(true);
    if (ENABLE_HERO_SOUND && audioRef.current) {
      audioRef.current.volume = 0.15;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!ENABLE_HERO_SOUND || !userInteracted) return;
    const audio = new Audio();
    audio.volume = 0;
    audio.loop = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [userInteracted]);

  // IP: visible 0–0.12, lift + fade out 0.12–0.22 (heroProgress only).
  const mascotLiftT = smoothstep(0.12, 0.22, heroProgress);
  const mascotOpacity = heroProgress < 0.12 ? 1 : heroProgress < 0.22 ? 1 - mascotLiftT : 0;
  const mascotLiftPx = isMobile ? viewportHeight * 0.18 : 100;
  const mascotTranslateY = -mascotLiftPx * mascotLiftT;

  // Wall: fade in from ~0.18. Holds: same, then fade further back 0.52–0.65.
  const wallOpacity = useMemo(() => {
    const ramp = smoothstep(0.18, 0.28, heroProgress);
    return Math.min(isMobile ? 0.65 : 0.7, ramp * (isMobile ? 0.65 : 0.7));
  }, [heroProgress, isMobile]);

  const holdsOpacity = useMemo(() => {
    const appear = smoothstep(0.18, 0.28, heroProgress);
    const fadeBack = 1 - smoothstep(0.52, 0.65, heroProgress);
    return appear * fadeBack;
  }, [heroProgress]);

  const holdsBlurPx = isMobile ? Math.max(0, 3 - 3 * smoothstep(0.18, 0.28, heroProgress)) : 2;
  const holdsScaleMobile = isMobile ? 1.4 + 0.2 * smoothstep(0.18, 0.28, heroProgress) : 1;

  // GLB: first appearance 0.30–0.40; then stable until final push-in.
  const islandOpacity = smoothstep(0.30, 0.40, heroProgress);

  // Four headlines: explicit in/out ranges from heroProgress. No overlapping states.
  const SCROLL_HEADLINES: string[] = locale === "vi" ? SCROLL_HEADLINES_VI : SCROLL_HEADLINES_EN;
  const headline1Opacity = heroProgress < 0.22 ? 1 : heroProgress < 0.30 ? 1 - smoothstep(0.22, 0.30, heroProgress) : 0;
  const headline2Opacity = smoothstep(0.40, 0.52, heroProgress) * (1 - smoothstep(0.52, 0.65, heroProgress));
  const headline3Opacity = smoothstep(0.60, 0.72, heroProgress) * (1 - smoothstep(0.72, 0.85, heroProgress));
  const headline4Opacity = smoothstep(0.72, 0.85, heroProgress) * (1 - smoothstep(0.85, 1, heroProgress));

  // Meta: visible 0–0.30 with H1; 0.40–0.52 fade in; 0.52–0.85 visible; 0.85–1 fade out.
  const metaSegment1 = heroProgress < 0.22 ? 1 : heroProgress < 0.30 ? 1 - smoothstep(0.22, 0.30, heroProgress) : 0;
  const metaSegment2 = heroProgress < 0.40 ? 0 : heroProgress < 0.52 ? smoothstep(0.40, 0.52, heroProgress) : heroProgress < 0.85 ? 1 : 1 - smoothstep(0.85, 1, heroProgress);
  const metaLineOpacity = Math.min(1, metaSegment1 + metaSegment2);

  // Final 0.85–1: fade out all headline + meta; CTA stays. Dolly in, FOV down, scale up.
  const dollyInT = smoothstep(0.85, 1, heroProgress);
  const headlineStackOpacity = 1 - dollyInT; // applied to whole stack so all text fades by 1
  const ctaOpacity = 1;

  // Camera: 0–0.72 default; 0.72–0.85 zoom out slightly; 0.85–1 push in strongly.
  const zoomOutSlight = smoothstep(0.72, 0.85, heroProgress);
  const baseDistance = 9.35;
  const zoomedOutDistance = 11;
  const finalDistance = 2.4;
  const cameraDistance =
    heroProgress < 0.72
      ? baseDistance + heroProgress * 0.2
      : heroProgress < 0.85
        ? baseDistance + zoomOutSlight * (zoomedOutDistance - baseDistance)
        : zoomedOutDistance - dollyInT * (zoomedOutDistance - finalDistance);
  const baseFov = 45;
  const zoomedOutFov = 48;
  const finalFov = 28;
  const cameraFov =
    heroProgress < 0.72 ? baseFov : heroProgress < 0.85 ? baseFov + zoomOutSlight * (zoomedOutFov - baseFov) : zoomedOutFov - dollyInT * (zoomedOutFov - finalFov);

  // GLB scale: emerge 0.30–0.45; stable; 0.85–1 scale up to dominate.
  const islandScaleEmerge = 0.7 + 0.3 * smoothstep(0.30, 0.45, heroProgress);
  const islandScaleFinal = isMobile ? 3.4 : 4.2;
  const islandScale = heroProgress < 0.85 ? islandScaleEmerge : islandScaleEmerge + dollyInT * (islandScaleFinal - islandScaleEmerge);

  const finalFocusDarken = dollyInT * 0.35;
  const particleFinalScale = 1 - dollyInT * 0.4;

  useEffect(() => {
    if (heroProgress >= 0.2) setIslandCanvasMounted(true);
  }, [heroProgress]);

  const stageHeight = `calc(100vh - ${headerHeight}px - ${footerHeight}px)`;

  return (
    <div
      ref={containerRef}
      className="cinematic-hero relative"
      style={{ height: `${wrapperVh}vh` }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      onKeyDown={handleInteraction}
      role="button"
      tabIndex={0}
      aria-label="Start experience"
    >
      <AscentBar />
      {/* LAYER 2 — Sticky hero stage (no background; persistent page layer shows through). */}
      <div
        className="sticky w-full flex flex-col overflow-hidden"
        style={{
          top: `${headerHeight}px`,
          height: stageHeight,
          minHeight: 280,
        }}
      >
        <div className="flex-1 min-h-0 w-full relative flex flex-col items-center justify-center pb-16">
        {/* Background layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: `radial-gradient(ellipse 80% 70% at 50% 50%, rgba(18,18,24,0.6) 0%, ${HERO_BG} 70%)`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
          aria-hidden
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            boxShadow: "inset 0 0 25vh 8vh rgba(0,0,0,0.4)",
          }}
        />
        {/* Final 10–15%: darken stage to isolate GLB (same heroProgress as dolly) */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: HERO_BG,
            opacity: finalFocusDarken,
          }}
        />

        {/* Wall + holds — fade in from ~0.18; holds fade back 0.52–0.65 */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{
            opacity: wallOpacity,
            transition: "opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(160deg, rgba(18,18,24,0.5) 0%, rgba(11,11,15,0.35) 50%, transparent 100%)",
              filter: "saturate(0.8)",
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              opacity: holdsOpacity,
              transition: "opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/holds.svg"
              alt=""
              className="max-w-[90%] max-h-[70%] object-contain md:max-w-[90%] md:max-h-[70%]"
              style={{
                filter: isMobile ? `blur(${holdsBlurPx}px) saturate(0.88)` : "blur(2px)",
                transform: isMobile ? `scale(${holdsScaleMobile})` : undefined,
                objectPosition: "center center",
              }}
            />
          </div>
        </div>

        {/* STATE C: GLB island — fades in as holds fade out; same heroProgress driver */}
        <div className="absolute inset-0 z-[5] pointer-events-none" aria-hidden>
          <HeroIslandCanvas
            opacity={islandOpacity}
            scale={islandScale}
            cameraDistance={cameraDistance}
            fov={cameraFov}
            shouldMount={islandCanvasMounted}
          />
        </div>

        {/* Floating particles — scroll-driven; reduce in final 10–15% to isolate GLB */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: isMobile ? 12 : 16 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: 4,
                height: 4,
                left: `${10 + (i * 5) % 80}%`,
                top: `${20 + (i * 7) % 60}%`,
                opacity: Math.min(0.35, 0.08 + revealT * 0.5) * particleFinalScale,
              }}
            />
          ))}
        </div>

        {/* Layout: mobile = stacked (mascot top, headline below); desktop = mascot viewport-centered (absolute), headline left column */}
        <div
          className={
            isMobile
              ? "absolute inset-0 flex flex-col items-center justify-center px-4 pt-20 pb-24 z-10 pointer-events-none gap-8"
              : "absolute inset-0 flex items-center px-4 sm:px-6 md:px-8 pt-20 pb-24 z-10 pointer-events-none"
          }
        >
          <div className={`pointer-events-auto flex flex-col justify-center w-full max-w-[min(100%,520px)] ${isMobile ? "order-2 items-start text-left max-w-[85%]" : "relative z-10 max-w-[min(42%,420px)]"}`}>
            {/* Four headlines stacked; each opacity driven by heroProgress. Final phase (0.85–1) fades headline+meta only; CTA stays. */}
            <div className={`max-w-[min(100%,1100px)] mt-6 sm:mt-8 md:mt-12 ${isMobile ? "text-left w-full" : ""}`}>
              <div style={{ opacity: headlineStackOpacity }}>
              <h1
                className={`relative font-bold text-white tracking-[-0.02em] overflow-hidden ${isMobile ? "text-left text-[clamp(36px,11vw,52px)] leading-[1.2] tracking-tight min-h-[2.5em]" : "text-[clamp(28px,6.5vw,40px)] sm:text-[clamp(32px,5vw,48px)] md:text-[clamp(36px,4vw,56px)] lg:text-[clamp(48px,5vw,96px)] leading-[1.2] min-h-[2.8em] sm:min-h-[3em] md:min-h-[3.2em]"}`}
                style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
              >
                {SCROLL_HEADLINES.map((line, idx) => {
                  const op = [headline1Opacity, headline2Opacity, headline3Opacity, headline4Opacity][idx] ?? 0;
                  return (
                    <span
                      key={idx}
                      className={`absolute top-0 block w-full ${isMobile ? "left-0 right-auto" : "left-0 right-0"}`}
                      style={{ opacity: op }}
                      aria-hidden={op < 0.01}
                    >
                      {isMobile ? mobileHeadlineLines(line).map((ln, j) => <span key={j} className="block">{ln}</span>) : line}
                    </span>
                  );
                })}
              </h1>
              <p
                className={`text-white/80 font-normal leading-snug ${isMobile ? "mt-3 text-[15px] sm:text-base" : "mt-4 sm:mt-4 md:mt-5 text-[clamp(13px,1.4vw,15px)] sm:text-[clamp(13px,1.1vw,16px)] md:text-[clamp(14px,1.2vw,18px)]"}`}
                style={{
                  opacity: metaLineOpacity,
                  fontFamily: "MiSans-Regular, sans-serif",
                }}
              >
                Premium Climbing Experience — HCMC — 2026
              </p>
              </div>
              {isMobile ? (
                <div className="mt-3 pointer-events-auto" style={{ opacity: ctaOpacity }}>
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onJoin();
                    }}
                    className="px-6 py-3 rounded-full border border-white/70 text-white text-xs font-medium tracking-wider uppercase bg-transparent shadow-lg"
                    style={{
                      letterSpacing: "0.05em",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    }}
                    whileTap={{ scale: 1.02 }}
                  >
                    JOIN THE FOUNDING ASCENT
                  </motion.button>
                </div>
              ) : null}
            </div>
              {!isMobile && (
              <div className="mt-6 sm:mt-8 md:mt-10" style={{ opacity: ctaOpacity }}>
                <motion.button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoin();
                  }}
                  className="px-6 py-3 sm:px-7 sm:py-3 md:px-8 md:py-3.5 rounded-full border border-white/70 text-white text-xs sm:text-sm font-medium tracking-wider uppercase bg-transparent shadow-lg"
                  style={{
                    letterSpacing: "0.05em",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  }}
                  whileHover={{
                    scale: 1.05,
                    y: -2,
                    boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
                  }}
                  whileTap={{ scale: 1.02 }}
                >
                  JOIN THE FOUNDING ASCENT
                </motion.button>
              </div>
            )}
          </div>

          {/* Mascot: mobile = order-1, self-center; desktop = viewport-centered, shifted right to balance left-aligned text */}
          <motion.div
            className={
              isMobile
                ? "flex items-center justify-center flex-shrink-0 w-[70%] max-w-[300px] order-1 self-center"
                : "absolute flex items-center justify-center w-[38%] max-w-[320px] md:max-w-[340px] pointer-events-none"
            }
            style={{
              ...(isMobile ? {} : { left: "54%", top: "50%" }),
              opacity: mascotOpacity,
              transform: isMobile
                ? `translateY(${mascotTranslateY}px)`
                : `translate(-50%, calc(-50% + ${mascotTranslateY}px))`,
            }}
          >
            <motion.div
              animate={
                mascotOpacity > 0.5
                  ? {
                      scale: [1, isMobile ? 1.015 : 1.02, 1],
                      transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                    }
                  : undefined
              }
              className="w-full aspect-square"
            >
              {partColors ? (
                <object
                  data="/brand/ip-flying.svg"
                  type="image/svg+xml"
                  aria-hidden
                  className="w-full h-full object-contain"
                  style={{ color: "#fffef8" }}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/brand/ip-flying.svg"
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Right-edge particles — scroll-driven; reduce in final 10–15% to isolate GLB */}
        <div
          className="absolute right-2 sm:right-3 top-0 bottom-0 w-px z-10 pointer-events-none overflow-hidden"
          style={{ opacity: (0.12 + revealT * 0.55) * particleFinalScale }}
          aria-hidden
        >
          <div
            className="absolute left-0 w-full flex flex-col items-center justify-start"
            style={{
              gap: 18,
              transform: `translateY(calc(10vh - ${heroProgress * 70}vh))`,
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-full bg-white flex-shrink-0"
                style={{ width: 2, height: 2, opacity: (0.35 + revealT * 0.4) * particleFinalScale }}
              />
            ))}
          </div>
        </div>

        {/* Scroll hint — heroProgress-driven; fade out 0.4–0.5 */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
          style={{
            opacity: heroProgress < 0.4 ? 0.7 : 0.7 * (1 - smoothstep(0.4, 0.5, heroProgress)),
            fontSize: "clamp(12px, 1vw, 14px)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <span className="uppercase tracking-widest">Scroll</span>
          <span className="text-white/50">↓</span>
        </div>

        {/* Footer overlay inside hero stage (no separate page footer during hero). */}
        {footerMessages && (
          <div
            className="flex-shrink-0 w-full flex flex-col items-center justify-center gap-0.5 py-3 px-4 text-center z-10 pointer-events-none"
            style={{
              height: footerHeight,
              minHeight: footerHeight,
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            }}
            aria-label="Site footer"
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
    </div>
  );
}
