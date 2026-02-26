"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";
import { preloadHeroIslandGLB } from "@/components/HeroIslandGLB";

const HeroIslandCanvas = dynamic(
  () => import("@/components/HeroIslandCanvas"),
  { ssr: false }
);

const HEADLINES_EN = [
  "CLIMB WITH INTENTION.",
  "ASCEND TOGETHER.",
  "SHAPE THE STANDARD.",
];

const HEADLINES_VI = [
  "LEO CÓ CHỦ ĐÍCH.",
  "VƯƠN CAO CÙNG NHAU.",
  "ĐỊNH HÌNH CHUẨN MỰC.",
];

const HERO_BG = "#000000";

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
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

  const headlines = locale === "vi" ? HEADLINES_VI : HEADLINES_EN;

  useEffect(() => {
    preloadHeroIslandGLB();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const vh = typeof window !== "undefined" ? window.innerHeight : 700;
      const wrapperHeight = (vh * wrapperVh) / 100;
      const maxScroll = Math.max(0, wrapperHeight - vh);
      const y = typeof window !== "undefined" ? window.scrollY : 0;
      pendingRef.current = maxScroll <= 0 ? (y > 0 ? 1 : 0) : Math.max(0, Math.min(1, y / maxScroll));
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const p = pendingRef.current;
        if (p != null) setHeroProgress(p);
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
    if (heroProgress >= 0.33) setGlbMounted(true);
  }, [heroProgress]);

  const p = heroProgress;

  // STEP 1 (0–0.33): ip-flying, slight upward. STEP 2 (0.33–0.66): ip-flying exit up + fade, holds in, GLB starts in near end. STEP 3 (0.66–0.90): GLB full, holds out, camera closer. FINAL (0.90–1): headline out, camera push, GLB dominant.
  const ipFlyingOpacity = p < 0.33 ? 1 : 1 - smoothstep(0.33, 0.5, p);
  const ipFlyingY = p < 0.33 ? p * -20 : -20 - smoothstep(0.33, 0.5, p) * 120;
  const holdsOpacity = smoothstep(0.33, 0.5, p) * (1 - smoothstep(0.66, 0.82, p));
  const glbOpacity = smoothstep(0.55, 0.75, p);
  const zoomT = smoothstep(0.9, 1, p);
  const glbScaleBase = 0.7 + 0.3 * smoothstep(0.66, 0.82, Math.min(p, 0.9));
  const glbScale = p < 0.9 ? glbScaleBase : glbScaleBase + zoomT * (4 - glbScaleBase);
  const cameraDistance = p < 0.9 ? 8 : 8 - zoomT * (8 - 2.4);
  const cameraFov = p < 0.9 ? 45 : 45 - zoomT * (45 - 28);

  const h1 = p >= 0 && p < 0.33 ? 1 : 0;
  const h2 = p >= 0.33 && p < 0.66 ? 1 : 0;
  const h3 = p >= 0.66 && p < 0.9 ? 1 : 0;
  const headlineOpacities = [h1, h2, h3];
  const headlineContainerOpacity = 1 - smoothstep(0.9, 1, p);

  const isMobile = useIsMobile();

  return (
    <div className="cinematic-hero" style={{ height: `${wrapperVh}vh` }}>
      <div
        className="sticky w-full overflow-hidden"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: "100dvh",
          minHeight: "100dvh",
          background: HERO_BG,
        }}
      >
        {/* VisualContainer: holds background (STEP 2–3) */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{ opacity: holdsOpacity }}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/holds.svg"
            alt=""
            className="max-w-[90%] max-h-[70%] object-contain opacity-80"
            style={{ filter: "blur(1px)" }}
          />
        </div>

        {/* GLB: STEP 2 end – STEP 3, FINAL zoom */}
        <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center">
          <div className={isMobile ? "w-full h-full max-h-[60vh]" : "w-full h-full"}>
            <HeroIslandCanvas
              opacity={glbOpacity}
              scale={Math.min(glbScale, isMobile ? 2.5 : 4)}
              cameraDistance={cameraDistance}
              fov={cameraFov}
              shouldMount={glbMounted}
            />
          </div>
        </div>

        {/* TextContainer + CTA: desktop absolute, mobile flex column */}
        {isMobile ? (
          <div
            className="absolute inset-0 z-10 flex flex-col pointer-events-none"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex-shrink-0 pt-4 px-4 text-center" style={{ opacity: headlineContainerOpacity }}>
              <h1
                className="relative font-bold text-white tracking-tight overflow-hidden min-h-[2.5em] leading-[1.2] text-[clamp(28px,8vw,44px)]"
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
            <div className="flex-1 min-h-0 flex items-center justify-center max-h-[60vh]">
              <div
                className="w-[70%] max-w-[260px] flex items-center justify-center"
                style={{ transform: `translateY(${ipFlyingY}px)` }}
              >
                <div style={{ opacity: ipFlyingOpacity }} className="w-full">
                  {partColors ? (
                    <object
                      data="/brand/ip-flying.svg"
                      type="image/svg+xml"
                      aria-hidden
                      className="w-full h-auto object-contain aspect-square"
                      style={{ color: "#fff" }}
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src="/brand/ip-flying.svg" alt="" className="w-full aspect-square object-contain" style={{ filter: "brightness(0) invert(1)" }} />
                  )}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 pb-4 pt-2 flex justify-center">
              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin();
                }}
                className="px-6 py-3 rounded-full border border-white/80 text-white text-xs font-medium tracking-wider uppercase bg-transparent pointer-events-auto"
                style={{ letterSpacing: "0.05em" }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 1.02 }}
              >
                JOIN THE FOUNDING ASCENT
              </motion.button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="absolute z-10 pointer-events-none top-[18%] left-4 sm:left-6 md:left-8 w-[min(42%,400px)]"
              style={{ opacity: headlineContainerOpacity }}
            >
              <h1
                className="relative font-bold text-white tracking-tight overflow-hidden min-h-[2.5em] leading-[1.2] text-[clamp(26px,4vw,44px)] md:text-[clamp(32px,3.5vw,52px)] lg:text-[clamp(40px,4vw,60px)]"
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
            <div
              className="absolute left-1/2 top-1/2 z-10 flex items-center justify-center w-[36%] max-w-[300px] pointer-events-none"
              style={{
                transform: `translate(-50%, calc(-50% + ${ipFlyingY}px))`,
                opacity: ipFlyingOpacity,
              }}
            >
              {partColors ? (
                <object
                  data="/brand/ip-flying.svg"
                  type="image/svg+xml"
                  aria-hidden
                  className="w-full h-auto object-contain aspect-square max-h-[60vh]"
                  style={{ color: "#fff" }}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src="/brand/ip-flying.svg" alt="" className="w-full aspect-square object-contain max-h-[60vh]" style={{ filter: "brightness(0) invert(1)" }} />
              )}
            </div>
            <div className="absolute z-20 bottom-[100px] left-4 sm:left-6 md:left-8">
              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin();
                }}
                className="px-6 py-3 sm:px-8 sm:py-3.5 rounded-full border border-white/80 text-white text-xs sm:text-sm font-medium tracking-wider uppercase bg-transparent pointer-events-auto"
                style={{ letterSpacing: "0.05em" }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 1.02 }}
              >
                JOIN THE FOUNDING ASCENT
              </motion.button>
            </div>
          </>
        )}

        {/* Vertical progress bar */}
        <div
          className="absolute right-3 top-0 bottom-0 w-px z-20 flex flex-col pointer-events-none"
          style={{ paddingTop: headerHeight, paddingBottom: footerHeight + 16 }}
        >
          <div className="flex-1 min-h-0 flex flex-col justify-end">
            <div
              className="w-full rounded-full bg-white/60"
              style={{ height: `${heroProgress * 100}%`, minHeight: 2 }}
            />
          </div>
        </div>

        {/* FooterOverlay */}
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
            <p className="text-white/90 text-xs tracking-wide" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
              {footerMessages.ethos}
            </p>
            <p className="text-white/60 text-[10px] tracking-wide" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
              {footerMessages.copyright ?? "© Leo Mây Climbing Gym — 2026"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
