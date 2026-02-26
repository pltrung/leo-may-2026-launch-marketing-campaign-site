"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";
import { preloadHeroIslandGLB } from "@/components/HeroIslandGLB";
import { HERO_BG } from "@/lib/heroConstants";

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

const HeroIslandCanvas = dynamic(
  () => import("@/components/HeroIslandCanvas"),
  { ssr: false }
);

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

export default function CinematicHeroScroll({
  partColors,
  onJoin,
  locale = "en",
  headerHeight = 64,
  footerHeight = 56,
  wrapperVh = 300,
  footerMessages,
}: CinematicHeroScrollProps) {
  const [heroProgress, setHeroProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<number | null>(null);

  const isMobile = useIsMobile();
  const headlines = locale === "vi" ? HEADLINES_VI : HEADLINES_EN;
  const stageHeight = `calc(100dvh - ${headerHeight}px - ${footerHeight}px)`;

  useEffect(() => {
    preloadHeroIslandGLB();
  }, []);

  useEffect(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 700;
    const maxScroll = (vh * wrapperVh) / 100;
    const onScroll = () => {
      const y = window.scrollY;
      pendingRef.current = Math.min(1, y / maxScroll);
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const p = pendingRef.current;
        if (p != null) setHeroProgress(p);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [wrapperVh]);

  useEffect(() => {
    if (heroProgress >= 0.2) setMounted(true);
  }, [heroProgress]);

  const p = heroProgress;

  const headline1Opacity = useMemo(() => {
    if (p < 0.15) return 1;
    if (p < 0.25) return 1 - smoothstep(0.15, 0.25, p);
    return 0;
  }, [p]);
  const headline2Opacity = useMemo(() => {
    if (p < 0.2) return 0;
    if (p < 0.35) return smoothstep(0.2, 0.35, p);
    if (p < 0.45) return 1;
    if (p < 0.55) return 1 - smoothstep(0.45, 0.55, p);
    return 0;
  }, [p]);
  const headline3Opacity = useMemo(() => {
    if (p < 0.5) return 0;
    if (p < 0.65) return smoothstep(0.5, 0.65, p);
    if (p < 0.75) return 1;
    if (p < 0.85) return 1 - smoothstep(0.75, 0.85, p);
    return 0;
  }, [p]);
  const headline4Opacity = useMemo(() => {
    if (p < 0.8) return 0;
    if (p < 0.9) return smoothstep(0.8, 0.9, p);
    return 1 - smoothstep(0.85, 1, p);
  }, [p]);

  const narrativeStackOpacity = 1 - smoothstep(0.85, 1, p);
  const headlineOpacities = [headline1Opacity, headline2Opacity, headline3Opacity, headline4Opacity];

  const mascotOpacity = 1 - smoothstep(0.15, 0.3, p);
  const mascotLift = smoothstep(0.15, 0.3, p);
  const mascotTranslateY = -80 * mascotLift;

  const wallOpacity = smoothstep(0.2, 0.35, p) * (1 - smoothstep(0.7, 0.9, p) * 0.5);
  const holdsOpacity = smoothstep(0.2, 0.35, p) * (1 - smoothstep(0.7, 0.9, p) * 0.6);

  const glbOpacity = smoothstep(0.4, 0.6, p);
  const zoomT = smoothstep(0.85, 1, p);
  const glbScaleBase = 0.7 + 0.3 * smoothstep(0.4, 0.65, Math.min(p, 0.85));
  const glbScaleFinal = isMobile ? 3.5 : 4.2;
  const glbScale = p < 0.85 ? glbScaleBase : glbScaleBase + zoomT * (glbScaleFinal - glbScaleBase);
  const cameraDistance = p < 0.85 ? 9 : 9 - zoomT * (9 - 2.4);
  const cameraFov = p < 0.85 ? 45 : 45 - zoomT * (45 - 28);

  const metaOpacity = smoothstep(0.05, 0.2, p) * narrativeStackOpacity;

  return (
    <div
      className="cinematic-hero relative"
      style={{
        height: `${wrapperVh}vh`,
        background: HERO_BG,
      }}
    >
      <div
        className="sticky w-full flex flex-col overflow-hidden"
        style={{
          top: `${headerHeight}px`,
          height: stageHeight,
          minHeight: 280,
          background: HERO_BG,
        }}
      >
        <div className="flex-1 min-h-0 relative flex flex-col items-center justify-center pb-16">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 80% 70% at 50% 50%, rgba(18,18,24,0.5) 0%, ${HERO_BG} 70%)`,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: "inset 0 0 20vh 10vh rgba(0,0,0,0.25)" }}
          />

          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            style={{ opacity: wallOpacity }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(160deg, rgba(18,18,24,0.5) 0%, rgba(11,11,15,0.35) 50%, transparent 100%)",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: holdsOpacity }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/holds.svg"
                alt=""
                className="max-w-[90%] max-h-[70%] object-contain"
                style={{ filter: "blur(2px)" }}
              />
            </div>
          </div>

          <div className="absolute inset-0 z-[5] pointer-events-none">
            <HeroIslandCanvas
              opacity={glbOpacity}
              scale={Math.min(glbScale, isMobile ? 3.5 : 4.5)}
              cameraDistance={cameraDistance}
              fov={cameraFov}
              shouldMount={mounted}
            />
          </div>

          <div
            className={`absolute inset-0 flex px-4 sm:px-6 md:px-8 pt-20 pb-24 z-10 pointer-events-none ${isMobile ? "flex-col items-center justify-center gap-6" : "items-center"}`}
            style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
          >
            <div className={`relative z-10 pointer-events-auto ${isMobile ? "w-full max-w-[85%] order-2 text-center" : "w-full max-w-[min(42%,420px)]"}`}>
              <div style={{ opacity: narrativeStackOpacity }}>
                <h1
                  className={`relative font-bold text-white tracking-tight overflow-hidden min-h-[2.8em] leading-[1.2] ${isMobile ? "text-[clamp(32px,10vw,48px)] text-center min-h-[2.2em]" : "text-[clamp(28px,5vw,48px)] md:text-[clamp(36px,4vw,56px)] lg:text-[clamp(48px,5vw,72px)]"}`}
                  style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
                >
                  {headlines.map((line, i) => (
                    <span
                      key={i}
                      className={`absolute top-0 block w-full ${isMobile ? "left-0 right-0 text-center" : "left-0 right-0"}`}
                      style={{ opacity: headlineOpacities[i] ?? 0 }}
                      aria-hidden={(headlineOpacities[i] ?? 0) < 0.01}
                    >
                      {line}
                    </span>
                  ))}
                </h1>
                <p
                  className={`text-white/80 mt-4 leading-snug ${isMobile ? "text-sm text-center" : "text-[clamp(13px,1.2vw,16px)]"}`}
                  style={{ opacity: metaOpacity, fontFamily: "MiSans-Regular, sans-serif" }}
                >
                  Premium Climbing Experience — HCMC — 2026
                </p>
              </div>
              <div className={`mt-6 md:mt-8 pointer-events-auto ${isMobile ? "flex justify-center" : ""}`}>
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
            </div>

            <motion.div
              className={`flex items-center justify-center pointer-events-none ${isMobile ? "w-[65%] max-w-[280px] order-1" : "absolute w-[38%] max-w-[320px] left-[54%] top-1/2"}`}
              style={
                isMobile
                  ? { opacity: mascotOpacity, transform: `translateY(${mascotTranslateY}px)` }
                  : {
                      opacity: mascotOpacity,
                      transform: `translate(-50%, calc(-50% + ${mascotTranslateY}px))`,
                    }
              }
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
                <img
                  src="/brand/ip-flying.svg"
                  alt=""
                  className="w-full aspect-square object-contain"
                />
              )}
            </motion.div>
          </div>

          <div
            className="absolute right-3 top-0 bottom-0 w-px z-20 flex flex-col pointer-events-none"
            style={{
              paddingTop: `${headerHeight}px`,
              paddingBottom: `${footerHeight + 16}px`,
            }}
            aria-hidden
          >
            <div className="flex-1 min-h-0 flex flex-col justify-end" style={{ height: "100%" }}>
              <div
                className="w-full rounded-full bg-white/50"
                style={{
                  height: `${heroProgress * 100}%`,
                  minHeight: 2,
                  transition: "height 0.08s ease-out",
                }}
              />
            </div>
          </div>
        </div>

        {footerMessages && (
          <div
            className="flex-shrink-0 w-full flex flex-col items-center justify-center gap-0.5 py-3 px-4 text-center z-10 pointer-events-none"
            style={{
              height: footerHeight,
              minHeight: footerHeight,
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
              background: HERO_BG,
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
  );
}
