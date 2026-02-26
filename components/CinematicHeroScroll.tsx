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
  wrapperVh = 350,
  footerMessages,
}: CinematicHeroScrollProps) {
  const isMobile = useIsMobile();
  const [heroProgress, setHeroProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<number | null>(null);
  const [glbMounted, setGlbMounted] = useState(false);

  useEffect(() => {
    preloadHeroIslandGLB();
  }, []);

  useEffect(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 700;
    const wrapperHeight = (vh * wrapperVh) / 100;
    const maxScroll = Math.max(1, wrapperHeight - vh);
    const onScroll = () => {
      const y = typeof window !== "undefined" ? window.scrollY : 0;
      pendingRef.current = Math.max(0, Math.min(1, y / maxScroll));
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

  // Cross-fade headlines: each has opacity + translateY (slide); overlapping bands so text crossfades as you scroll
  const slidePx = 20;
  const headline1Opacity = useMemo(() => {
    if (p < 0.15) return 1;
    if (p < 0.25) return 1 - smoothstep(0.15, 0.25, p);
    return 0;
  }, [p]);
  const headline1TranslateY = useMemo(() => {
    if (p < 0.15) return 0;
    if (p < 0.25) return -slidePx * smoothstep(0.15, 0.25, p);
    return -slidePx;
  }, [p]);
  const headline2Opacity = useMemo(() => {
    if (p < 0.2) return 0;
    if (p < 0.35) return smoothstep(0.2, 0.35, p);
    if (p < 0.45) return 1;
    if (p < 0.55) return 1 - smoothstep(0.45, 0.55, p);
    return 0;
  }, [p]);
  const headline2TranslateY = useMemo(() => {
    if (p < 0.2) return slidePx;
    if (p < 0.35) return slidePx * (1 - smoothstep(0.2, 0.35, p));
    if (p < 0.45) return 0;
    if (p < 0.55) return -slidePx * smoothstep(0.45, 0.55, p);
    return -slidePx;
  }, [p]);
  const headline3Opacity = useMemo(() => {
    if (p < 0.5) return 0;
    if (p < 0.65) return smoothstep(0.5, 0.65, p);
    if (p < 0.75) return 1;
    if (p < 0.85) return 1 - smoothstep(0.75, 0.85, p);
    return 0;
  }, [p]);
  const headline3TranslateY = useMemo(() => {
    if (p < 0.5) return slidePx;
    if (p < 0.65) return slidePx * (1 - smoothstep(0.5, 0.65, p));
    if (p < 0.75) return 0;
    if (p < 0.85) return -slidePx * smoothstep(0.75, 0.85, p);
    return -slidePx;
  }, [p]);
  const headline4Opacity = useMemo(() => {
    if (p < 0.8) return 0;
    if (p < 0.9) return smoothstep(0.8, 0.9, p);
    return 1 - smoothstep(0.9, 1, p);
  }, [p]);
  const headline4TranslateY = useMemo(() => {
    if (p < 0.8) return slidePx;
    if (p < 0.9) return slidePx * (1 - smoothstep(0.8, 0.9, p));
    if (p < 1) return -slidePx * smoothstep(0.9, 1, p);
    return -slidePx;
  }, [p]);

  // Final window 0.85–1.0: headline/meta fade out fully; zoom has time; GLB dominant at 1
  const zoomT = smoothstep(0.85, 1, p);
  const narrativeStackOpacity = 1 - smoothstep(0.85, 1, p);
  const headlineOpacities = [headline1Opacity, headline2Opacity, headline3Opacity, headline4Opacity];
  const headlineTranslateYs = [headline1TranslateY, headline2TranslateY, headline3TranslateY, headline4TranslateY];

  const mascotOpacity = 1 - smoothstep(0.15, 0.3, p);
  const mascotLift = smoothstep(0.15, 0.3, p);
  const mascotTranslateY = -80 * mascotLift;

  const wallOpacity = smoothstep(0.2, 0.35, p) * (1 - smoothstep(0.75, 0.95, p) * 0.6);
  const holdsOpacity = smoothstep(0.2, 0.35, p) * (1 - smoothstep(0.75, 0.95, p) * 0.7);

  const glbOpacity = smoothstep(0.4, 0.6, p);
  const glbScaleBase = 0.7 + 0.3 * smoothstep(0.4, 0.65, Math.min(p, 0.85));
  const glbScaleFinal = isMobile ? 4 : 4.5;
  const glbScale = p < 0.85 ? glbScaleBase : glbScaleBase + zoomT * (glbScaleFinal - glbScaleBase);
  const cameraDistance = p < 0.85 ? 9 : 9 - zoomT * (9 - 2.2);
  const cameraFov = p < 0.85 ? 45 : 45 - zoomT * (45 - 26);

  const metaOpacity = smoothstep(0.05, 0.2, p) * narrativeStackOpacity;

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
        {/* Content area: top padding = header + safe-area so text never under header; no bottom padding (footer is overlay) */}
        <div
          className="flex-1 min-h-0 relative flex flex-col items-center justify-center"
          style={{
            paddingTop: `calc(${headerHeight}px + env(safe-area-inset-top, 0px))`,
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

          <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ opacity: wallOpacity }}>
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(160deg, rgba(18,18,24,0.5) 0%, rgba(11,11,15,0.35) 50%, transparent 100%)",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: holdsOpacity }}>
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
              scale={Math.min(glbScale, isMobile ? 3.5 : 4.5)}
              cameraDistance={cameraDistance}
              fov={cameraFov}
              shouldMount={glbMounted}
            />
          </div>

          {/* Narrative: below header + safe-area; mobile headline clamped so no overlap with header */}
          <div
            className={`absolute z-10 pointer-events-none ${isMobile ? "left-4 right-4 text-center max-w-[90%]" : "left-4 sm:left-6 md:left-8 w-[min(42%,420px)]"}`}
            style={{
              top: `calc(${headerHeight}px + env(safe-area-inset-top, 0px) + 1rem)`,
            }}
          >
            <div style={{ opacity: narrativeStackOpacity }} className="pointer-events-none">
              <h1
                className={`relative font-bold text-white tracking-tight overflow-hidden ${isMobile ? "text-center min-h-[2.2em] leading-[1.15] text-[clamp(26px,7.5vw,42px)]" : "leading-[1.2] text-[clamp(28px,5vw,48px)] md:text-[clamp(36px,4vw,56px)] lg:text-[clamp(48px,5vw,72px)] min-h-[2.8em]"}`}
                style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
              >
                {headlines.map((line, i) => (
                  <span
                    key={i}
                    className={`absolute top-0 block w-full ${isMobile ? "left-0 right-0 text-center" : "left-0 right-0"}`}
                    style={{
                      opacity: headlineOpacities[i] ?? 0,
                      transform: `translateY(${headlineTranslateYs[i] ?? 0}px)`,
                    }}
                    aria-hidden={(headlineOpacities[i] ?? 0) < 0.01}
                  >
                    {line}
                  </span>
                ))}
              </h1>
              <p
                className={`text-white/80 mt-4 leading-snug ${isMobile ? "text-[15px] text-center" : "text-[clamp(13px,1.2vw,16px)]"}`}
                style={{ opacity: metaOpacity, fontFamily: "MiSans-Regular, sans-serif" }}
              >
                Premium Climbing Experience — HCMC — 2026
              </p>
            </div>
          </div>

          {/* CTA: fixed position for entire hero; does not move; always in the right place */}
          <div
            className={`absolute z-20 pointer-events-auto ${isMobile ? "left-4 right-4 flex justify-center bottom-[130px] sm:bottom-[140px]" : "left-4 sm:left-6 md:left-8 bottom-[120px]"}`}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
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

          {/* Mascot: center, exits up as scroll progresses */}
          <div
            className={`absolute left-1/2 top-1/2 z-10 flex items-center justify-center pointer-events-none ${isMobile ? "w-[70%] max-w-[280px]" : "w-[38%] max-w-[320px]"}`}
            style={{
              opacity: mascotOpacity,
              transform: `translate(-50%, calc(-50% + ${mascotTranslateY}px))`,
            }}
          >
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

        {footerMessages && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center justify-center gap-0.5 py-3 px-4 text-center pointer-events-none"
            style={{
              height: footerHeight,
              minHeight: footerHeight,
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
              background: HERO_BG,
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
