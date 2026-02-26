"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";
import { preloadHeroIslandGLB } from "@/components/HeroIslandGLB";
import { HERO_BG } from "@/lib/heroConstants";

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
  wrapperVh = 400,
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
    if (heroProgress >= 0.5) setGlbMounted(true);
  }, [heroProgress]);

  const p = heroProgress;

  // STEP 1 (0–0.25): mascot + float. STEP 2 (0.25–0.5): mascot up+fade, holds in. STEP 3 (0.5–0.75): holds out, GLB in. STEP 4 (0.75–0.9): GLB larger. FINAL (0.9–1): headline out, camera push.
  const mascotOpacity = 1 - smoothstep(0.25, 0.5, p);
  const mascotY = p < 0.25 ? Math.sin(p * Math.PI * 2) * 8 : -20 - smoothstep(0.25, 0.5, p) * 100;
  const holdsOpacity = smoothstep(0.25, 0.5, p) * (1 - smoothstep(0.5, 0.75, p));
  const glbOpacity = smoothstep(0.5, 0.75, p);
  const zoomT = smoothstep(0.9, 1, p);
  const glbScaleBase = 0.75 + 0.25 * smoothstep(0.75, 0.9, Math.min(p, 0.9));
  const glbScale = p < 0.9 ? glbScaleBase : glbScaleBase + zoomT * (4 - glbScaleBase);
  const cameraDistance = p < 0.9 ? 8 : 8 - zoomT * (8 - 2.4);
  const cameraFov = p < 0.9 ? 45 : 45 - zoomT * (45 - 28);

  const h1 = p >= 0 && p < 0.25 ? 1 : 0;
  const h2 = p >= 0.25 && p < 0.5 ? 1 : 0;
  const h3 = p >= 0.5 && p < 0.75 ? 1 : 0;
  const h4 = p >= 0.75 && p < 0.9 ? 1 : 0;
  const headlineOpacities = [h1, h2, h3, h4];
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
        {/* Wall + holds: STEP 2 in, STEP 3 out */}
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

        {/* GLB: STEP 3 in, STEP 4 larger, FINAL zoom */}
        <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center">
          <div className={isMobile ? "w-full h-full max-h-[55vh]" : "w-full h-full"}>
            <HeroIslandCanvas
              opacity={glbOpacity}
              scale={Math.min(glbScale, isMobile ? 2.8 : 4)}
              cameraDistance={cameraDistance}
              fov={cameraFov}
              shouldMount={glbMounted}
            />
          </div>
        </div>

        {/* Content: flex column to avoid overlap; headline + CTA always in flow */}
        <div
          className="absolute inset-0 z-10 flex flex-col pointer-events-none"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Headline — single element, 4 lines via opacity */}
          <div
            className={isMobile ? "flex-shrink-0 pt-6 px-4 text-center" : "flex-shrink-0 pt-[14%] pl-4 sm:pl-6 md:pl-8"}
            style={{
              width: isMobile ? "100%" : "min(44%, 440px)",
              opacity: headlineContainerOpacity,
            }}
          >
            <h1
              className={`relative font-bold text-white tracking-tight overflow-hidden min-h-[2.6em] leading-[1.2] ${isMobile ? "text-[clamp(28px,8vw,44px)]" : "text-[clamp(26px,4vw,42px)] md:text-[clamp(34px,3.5vw,52px)] lg:text-[clamp(44px,4vw,64px)]"}`}
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

          {/* Visual: mascot — flex-1 so it stays below headline, no overlap */}
          <div className="flex-1 min-h-0 flex items-center justify-center w-full">
            <div
              className={isMobile ? "w-[68%] max-w-[260px] max-h-[50vh]" : "w-[36%] max-w-[300px] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"}
              style={
                isMobile
                  ? { transform: `translateY(${mascotY}px)` }
                  : { transform: `translate(-50%, calc(-50% + ${mascotY}px))` }
              }
            >
              <div style={{ opacity: mascotOpacity }} className="w-full h-full flex items-center justify-center">
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
          </div>

          {/* CTA — centered below headline, always visible */}
          <div
            className={`flex-shrink-0 ${isMobile ? "pb-6 pt-4 flex justify-center" : "absolute bottom-[100px] left-1/2 -translate-x-1/2"}`}
          >
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJoin();
              }}
              className="px-6 py-3 sm:px-8 sm:py-3.5 rounded-full border border-white/70 text-white text-xs sm:text-sm font-medium tracking-wider uppercase bg-transparent pointer-events-auto"
              style={{ letterSpacing: "0.05em", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 1.02 }}
            >
              JOIN THE FOUNDING ASCENT
            </motion.button>
          </div>
        </div>

        {/* Vertical progress bar */}
        <div
          className="absolute right-3 top-0 bottom-0 w-px z-20 flex flex-col pointer-events-none"
          style={{ paddingTop: headerHeight, paddingBottom: footerHeight + 16 }}
        >
          <div className="flex-1 min-h-0 flex flex-col justify-end">
            <div
              className="w-full rounded-full bg-white/50"
              style={{ height: `${heroProgress * 100}%`, minHeight: 2 }}
            />
          </div>
        </div>

        {/* Footer overlay — same background, never scrolls */}
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
