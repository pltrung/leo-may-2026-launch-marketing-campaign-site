"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";
import AscentBar from "@/components/AscentBar";
import { preloadHeroIslandGLB } from "@/components/HeroIslandGLB";

const HeroIslandCanvas = dynamic(() => import("@/components/HeroIslandCanvas"), { ssr: false });

/** Hero 1→5 narrative lines (one stack, sequenced by heroProgress). */
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

const META_LINE = "Premium Climbing Experience — HCMC — 2026";

function mobileHeadlineLines(line: string): string[] {
  const words = line.trim().split(/\s+/);
  if (words.length <= 2) return [line];
  const out: string[] = [];
  for (let i = 0; i < words.length; i += 2) out.push(words.slice(i, i + 2).join(" "));
  return out;
}

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
 * Single cohesive cinematic hero.
 * - One wrapper (260–320vh); one sticky stage (top:0, height:100vh); one heroProgress (0..1).
 * - Background is provided by page (transparent here).
 * - Fixed header/footer are page-level overlays; footer overlay is also rendered here at bottom of stage.
 * - Left narrative panel (hero 1→5) with disciplined fade out → hold → fade in.
 * - GLB stage; final 10–15%: narrative out, CTA stays, dolly in + FOV + scale, GLB dominates.
 * - No conditional mount of major layers; no black screen at end.
 */
export default function CinematicHeroScroll({
  partColors,
  onJoin,
  locale = "en",
  headerHeight = 64,
  footerHeight = 56,
  wrapperVh = 280,
  footerMessages,
}: CinematicHeroScrollProps) {
  const isMobile = useIsMobile();
  const [heroProgress, setHeroProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<number | null>(null);
  const [canvasMounted, setCanvasMounted] = useState(false);

  useEffect(() => {
    preloadHeroIslandGLB();
  }, []);

  useEffect(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 700;
    const range = (vh * wrapperVh) / 100;
    const onScroll = () => {
      const p = Math.min(window.scrollY / range, 1);
      pendingRef.current = p;
      if (rafRef.current !== 0) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const v = pendingRef.current;
        if (v != null) setHeroProgress(v);
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
    if (heroProgress >= 0.15) setCanvasMounted(true);
  }, [heroProgress]);

  const p = heroProgress;
  const headlines = locale === "vi" ? HEADLINES_VI : HEADLINES_EN;

  // —— Narrative: hero 1→4 with fade out → hold → fade in (one stack, no simultaneous swap)
  const BOUNDARIES = [0.2, 0.35, 0.5, 0.65, 0.82];
  const W = 0.08;
  const OUT = 0.4;
  const HOLD = 0.2;
  let fromIndex = 0;
  let toIndex = 0;
  let outOpacity = 1;
  let inOpacity = 0;
  let showIncoming = false;
  for (let i = 0; i < BOUNDARIES.length; i++) {
    const end = BOUNDARIES[i];
    const start = end - W;
    if (p < start) {
      fromIndex = i;
      toIndex = i;
      outOpacity = 1;
      inOpacity = 0;
      break;
    }
    if (p > end) {
      fromIndex = Math.min(i + 1, headlines.length - 1);
      toIndex = fromIndex;
      outOpacity = 1;
      inOpacity = 0;
      continue;
    }
    const outEnd = start + W * OUT;
    const holdEnd = start + W * (OUT + HOLD);
    fromIndex = i;
    toIndex = Math.min(i + 1, headlines.length - 1);
    showIncoming = true;
    if (p <= outEnd) {
      outOpacity = 1 - smoothstep(start, outEnd, p);
      inOpacity = 0;
    } else if (p <= holdEnd) {
      outOpacity = 0;
      inOpacity = 0;
    } else {
      outOpacity = 0;
      inOpacity = smoothstep(holdEnd, end, p);
    }
    break;
  }

  // Final 10–15%: fade out all narrative + meta; CTA stays
  const dollyT = smoothstep(0.85, 1, p);
  const narrativePanelOpacity = 1 - dollyT;
  const metaOpacity = (p < 0.22 ? 1 : p < 0.3 ? 1 - smoothstep(0.22, 0.3, p) : 0) + (p >= 0.4 ? (p < 0.52 ? smoothstep(0.4, 0.52, p) : p < 0.85 ? 1 : 1 - smoothstep(0.85, 1, p)) : 0);
  const metaOpacityClamped = Math.min(1, metaOpacity) * narrativePanelOpacity;

  // IP mascot: 0–0.12 visible, 0.12–0.22 lift + fade out
  const ipLift = smoothstep(0.12, 0.22, p);
  const ipOpacity = p < 0.12 ? 1 : p < 0.22 ? 1 - ipLift : 0;
  const ipTranslateY = -((isMobile ? 120 : 100) * ipLift);

  // Wall/holds
  const wallOpacity = smoothstep(0.18, 0.28, p) * (isMobile ? 0.65 : 0.7);
  const holdsOpacity = smoothstep(0.18, 0.28, p) * (1 - smoothstep(0.52, 0.65, p));

  // GLB: in at 0.3–0.4; final 0.85–1 dolly in + scale
  const glbOpacity = smoothstep(0.3, 0.4, p);
  const glbScaleEmerge = 0.7 + 0.3 * smoothstep(0.3, 0.45, p);
  const glbScaleFinal = isMobile ? 3.2 : 4;
  const glbScale = p < 0.85 ? glbScaleEmerge : glbScaleEmerge + dollyT * (glbScaleFinal - glbScaleEmerge);
  const camBase = 9.35;
  const camZoomOut = 11;
  const camFinal = 2.4;
  const cameraDistance = p < 0.72 ? camBase + p * 0.2 : p < 0.85 ? camBase + smoothstep(0.72, 0.85, p) * (camZoomOut - camBase) : camZoomOut - dollyT * (camZoomOut - camFinal);
  const fovBase = 45;
  const fovZoomOut = 48;
  const fovFinal = 28;
  const cameraFov = p < 0.72 ? fovBase : p < 0.85 ? fovBase + smoothstep(0.72, 0.85, p) * (fovZoomOut - fovBase) : fovZoomOut - dollyT * (fovZoomOut - fovFinal);

  const particleScale = 1 - dollyT * 0.4;
  const darkenOverlay = dollyT * 0.3;
  const footerFadeIn = smoothstep(0.15, 0.35, p);

  const handleJoin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onJoin();
    },
    [onJoin]
  );

  return (
    <div
      className="cinematic-hero relative"
      style={{ height: `${wrapperVh}vh` }}
      onClick={() => {}}
      onTouchStart={() => {}}
      role="presentation"
      aria-hidden
    >
      <AscentBar />
      {/* Sticky stage: full viewport, locked for entire scroll. No background (page provides one). */}
      <div
        className="sticky top-0 left-0 w-full overflow-hidden"
        style={{ height: "100vh" }}
      >
        {/* Subtle darken in final phase only (overlay, not a new background) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(11,11,15,0.4)", opacity: darkenOverlay }}
          aria-hidden
        />

        {/* Wall + holds */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ opacity: wallOpacity }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: holdsOpacity }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/holds.svg" alt="" className="max-w-[90%] max-h-[70%] object-contain opacity-90" />
          </div>
        </div>

        {/* GLB: always mounted when canvasMounted; final phase on top */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: dollyT > 0.05 ? 25 : 5 }}
        >
          <HeroIslandCanvas
            opacity={glbOpacity}
            scale={glbScale}
            cameraDistance={cameraDistance}
            fov={cameraFov}
            shouldMount={canvasMounted}
          />
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: isMobile ? 10 : 14 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: 3,
                height: 3,
                left: `${12 + (i * 6) % 76}%`,
                top: `${15 + (i * 8) % 65}%`,
                opacity: Math.min(0.3, 0.05 + p * 0.4) * particleScale,
              }}
            />
          ))}
        </div>

        {/* Left narrative panel: fixed column, one headline stack, CTA */}
        <div
          className={`absolute left-0 top-0 bottom-0 z-10 flex flex-col justify-center pl-4 sm:pl-6 md:pl-8 pr-4 ${isMobile ? "items-center text-center w-full" : "w-[min(48%,420px)] items-start text-left"}`}
          style={{ opacity: narrativePanelOpacity }}
        >
          <div className={`${isMobile ? "w-full max-w-[90%]" : "w-full"}`}>
            <h1
              className="relative font-bold text-white tracking-tight overflow-hidden"
              style={{
                fontFamily: "var(--font-bold), MiSans-Bold, sans-serif",
                fontSize: isMobile ? "clamp(28px, 8vw, 44px)" : "clamp(24px, 2.8vw, 42px)",
                lineHeight: 1.2,
                minHeight: isMobile ? "2.2em" : "2.6em",
              }}
            >
              <span
                className={`absolute inset-0 block ${isMobile ? "text-center" : "text-left"}`}
                style={{ opacity: outOpacity }}
              >
                {isMobile ? mobileHeadlineLines(headlines[fromIndex]).map((ln, j) => <span key={j} className="block">{ln}</span>) : headlines[fromIndex]}
              </span>
              {showIncoming && (
                <span
                  className={`absolute inset-0 block ${isMobile ? "text-center" : "text-left"}`}
                  style={{ opacity: inOpacity }}
                >
                  {isMobile ? mobileHeadlineLines(headlines[toIndex]).map((ln, j) => <span key={j} className="block">{ln}</span>) : headlines[toIndex]}
                </span>
              )}
            </h1>
            <p
              className="text-white/80 text-sm mt-3 md:mt-4"
              style={{ opacity: metaOpacityClamped, fontFamily: "MiSans-Regular, sans-serif" }}
            >
              {META_LINE}
            </p>
            <div className="mt-4 md:mt-6">
              <motion.button
                type="button"
                onClick={handleJoin}
                className="px-5 py-2.5 rounded-full border border-white/70 text-white text-xs font-medium tracking-wider uppercase bg-transparent"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 1 }}
              >
                JOIN THE FOUNDING ASCENT
              </motion.button>
            </div>
          </div>
        </div>

        {/* IP mascot (hero 1 only) */}
        <div
          className={`absolute z-10 pointer-events-none ${isMobile ? "top-[18%] left-1/2 -translate-x-1/2 w-[60%] max-w-[260px]" : "left-[52%] top-1/2 -translate-y-1/2 w-[36%] max-w-[320px]"}`}
          style={{
            opacity: ipOpacity,
            transform: isMobile ? `translateY(${ipTranslateY}px)` : `translate(-50%, calc(-50% + ${ipTranslateY}px))`,
          }}
        >
          {partColors ? (
            <object data="/brand/ip-flying.svg" type="image/svg+xml" className="w-full h-auto" aria-hidden />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/brand/ip-flying.svg" alt="" className="w-full h-auto" />
          )}
        </div>

        {/* Footer overlay: fixed at bottom of stage, does not scroll */}
        {footerMessages && (
          <div
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center justify-center gap-0.5 py-3 px-4 text-center pointer-events-none"
            style={{
              height: footerHeight,
              minHeight: footerHeight,
              opacity: footerFadeIn,
              paddingBottom: "max(10px, env(safe-area-inset-bottom))",
            }}
            aria-label="Footer"
          >
            <p className="text-white/80 text-xs tracking-wide" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
              {footerMessages.ethos}
            </p>
            <p className="text-white/50 text-[10px] tracking-wide" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
              {footerMessages.copyright ?? "© Leo Mây Climbing Gym — 2026"}
            </p>
          </div>
        )}

        {/* Scroll hint */}
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-white/60 text-xs uppercase tracking-widest"
          style={{ opacity: p < 0.4 ? 0.8 : 0.8 * (1 - smoothstep(0.4, 0.55, p)) }}
        >
          Scroll
        </div>
      </div>
    </div>
  );
}
