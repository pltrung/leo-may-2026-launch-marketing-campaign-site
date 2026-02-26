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
  wrapperVh = 350,
  footerMessages,
}: CinematicHeroScrollProps) {
  const [heroProgress, setHeroProgress] = useState(0);
  const [glbMounted, setGlbMounted] = useState(false);
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const headlines = locale === "vi" ? HEADLINES_VI : HEADLINES_EN;

  useEffect(() => {
    preloadHeroIslandGLB();
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateProgress = () => {
      const rect = wrapper.getBoundingClientRect();
      const vh = window.innerHeight;
      const travel = rect.height - vh;
      if (travel <= 0) {
        pendingRef.current = rect.top <= 0 ? 1 : 0;
      } else {
        const raw = -rect.top / travel;
        pendingRef.current = Math.max(0, Math.min(1, raw));
      }
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const p = pendingRef.current;
        if (p != null) setHeroProgress(p);
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (heroProgress >= 0.5) setGlbMounted(true);
  }, [heroProgress]);

  const p = heroProgress;

  // Only one headline visible at a time; no overlapping fade bands. Step bands: 0–0.25, 0.25–0.5, 0.5–0.75, 0.75–0.9; final 0.9–1 narrative out.
  const h1 = useMemo(() => (p >= 0 && p < 0.25 ? 1 : 0), [p]);
  const h2 = useMemo(() => (p >= 0.25 && p < 0.5 ? 1 : 0), [p]);
  const h3 = useMemo(() => (p >= 0.5 && p < 0.75 ? 1 : 0), [p]);
  const h4 = useMemo(() => (p >= 0.75 && p < 0.9 ? 1 : 0), [p]);
  const narrativeOut = 1 - smoothstep(0.9, 1, p);
  const headlineOpacities = [h1, h2, h3, h4];

  // STEP 1: Mascot. STEP 2 (0.25–0.5): Mascot exits up, wall+holds in.
  const mascotOpacity = useMemo(() => 1 - smoothstep(0.25, 0.5, p), [p]);
  const mascotY = useMemo(() => -80 * smoothstep(0.25, 0.5, p), [p]);
  const wallHoldsOpacity = useMemo(
    () => smoothstep(0.25, 0.5, p) * (1 - smoothstep(0.5, 0.75, p)),
    [p]
  );

  // STEP 3 (0.5–0.75): GLB fades in. STEP 4: GLB slightly larger. FINAL (0.9–1): dolly in, FOV down, GLB dominant.
  const glbOpacity = useMemo(() => smoothstep(0.5, 0.75, p), [p]);
  const zoomT = smoothstep(0.9, 1, p);
  const glbScale = useMemo(() => {
    const base = 0.7 + 0.3 * smoothstep(0.5, 0.75, Math.min(p, 0.9));
    if (p < 0.9) return base;
    return base + zoomT * (4 - base);
  }, [p, zoomT]);
  const cameraDistance = p < 0.9 ? 9 : 9 - zoomT * (9 - 2.4);
  const cameraFov = p < 0.9 ? 45 : 45 - zoomT * (45 - 28);

  const isMobile = useIsMobile();

  return (
    <div
      ref={wrapperRef}
      className="cinematic-hero"
      style={{
        height: `${wrapperVh}vh`,
        background: HERO_BG,
      }}
    >
      <div
        className="sticky w-full overflow-hidden"
        style={{
          top: headerHeight,
          left: 0,
          right: 0,
          height: `calc(100dvh - ${headerHeight}px)`,
          minHeight: `calc(100dvh - ${headerHeight}px)`,
          background: HERO_BG,
        }}
      >
        {/* Single continuous background — no change during hero */}
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

        {/* Wall + holds: STEP 2 in, STEP 3 out */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{ opacity: wallHoldsOpacity }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(160deg, rgba(18,18,24,0.5) 0%, rgba(11,11,15,0.35) 50%, transparent 100%)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/holds.svg"
              alt=""
              className="max-w-[90%] max-h-[70%] object-contain"
              style={{ filter: "blur(2px)" }}
            />
          </div>
        </div>

        {/* GLB: STEP 3 in, FINAL zoom */}
        <div className="absolute inset-0 z-[5] pointer-events-none">
          <HeroIslandCanvas
            opacity={glbOpacity}
            scale={Math.min(glbScale, isMobile ? 3.2 : 4)}
            cameraDistance={cameraDistance}
            fov={cameraFov}
            shouldMount={glbMounted}
          />
        </div>

        {/* One headline — four options, opacity per step; fixed position */}
        <div
          className={`absolute z-10 pointer-events-none top-[18%] ${isMobile ? "left-4 right-4 text-center" : "left-4 sm:left-6 md:left-8 w-[min(42%,420px)]"}`}
          style={{ paddingTop: headerHeight }}
        >
          <div style={{ opacity: narrativeOut }}>
            <h1
              className={`relative font-bold text-white tracking-tight overflow-hidden min-h-[2.8em] leading-[1.2] ${isMobile ? "text-[clamp(32px,10vw,48px)]" : "text-[clamp(28px,5vw,48px)] md:text-[clamp(36px,4vw,56px)] lg:text-[clamp(48px,5vw,72px)]"}`}
              style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
            >
              {headlines.map((line, i) => (
                <span
                  key={i}
                  className="absolute top-0 left-0 right-0 block"
                  style={{ opacity: headlineOpacities[i] ?? 0 }}
                  aria-hidden={(headlineOpacities[i] ?? 0) < 0.01}
                >
                  {line}
                </span>
              ))}
            </h1>
          </div>
        </div>

        {/* CTA: always visible, fixed position, never moves */}
        <div
          className={`absolute z-20 bottom-[120px] ${isMobile ? "left-4 right-4 flex justify-center" : "left-4 sm:left-6 md:left-8"}`}
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

        {/* Mascot: STEP 1 visible, STEP 2 exits up */}
        <div
          className={`absolute left-1/2 top-1/2 z-10 flex items-center justify-center pointer-events-none ${isMobile ? "w-[70%] max-w-[280px]" : "w-[38%] max-w-[320px]"}`}
          style={{
            transform: `translate(-50%, calc(-50% + ${mascotY}px))`,
            opacity: mascotOpacity,
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

        {/* Vertical progress bar — same heroProgress */}
        <div
          className="absolute right-3 top-0 bottom-0 w-px z-20 flex flex-col pointer-events-none"
          style={{
            paddingTop: headerHeight,
            paddingBottom: footerHeight + 16,
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

        {/* Footer overlay — inside stage, bottom anchored, same background */}
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
