"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const ZONE_COLORS: { glow: string; secondary?: string }[] = [
  { glow: "rgba(255,255,255,0.4)" }, // 1: Ground - faint white
  { glow: "rgba(180,240,255,0.5)" }, // 2: Low atmosphere - soft cyan
  { glow: "rgba(120,220,220,0.55)" }, // 3: Breathable sky - cyan-green
  { glow: "rgba(100,220,160,0.6)" }, // 4: Identity clarity - soft green
  { glow: "rgba(180,230,140,0.55)" }, // 5: Open sky - green-yellow
  { glow: "rgba(230,215,140,0.55)" }, // 6: Liberation - soft golden
  { glow: "rgba(255,255,255,0.6)", secondary: "rgba(140,255,200,0.2)" }, // 7: Ascended - white + green aura
];

function lerpColor(
  a: { r: number; g: number; b: number; alpha: number },
  b: { r: number; g: number; b: number; alpha: number },
  t: number
): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  const alpha = a.alpha + (b.alpha - a.alpha) * t;
  return `rgba(${r},${g},${bl},${alpha})`;
}

function parseRgba(s: string): { r: number; g: number; b: number; alpha: number } {
  const m = s.match(/rgba?\((\d+),(\d+),(\d+),([\d.]+)\)/);
  if (!m) return { r: 255, g: 255, b: 255, alpha: 0.5 };
  return {
    r: parseInt(m[1], 10),
    g: parseInt(m[2], 10),
    b: parseInt(m[3], 10),
    alpha: parseFloat(m[4]),
  };
}

function interpolateZoneColor(progress: number): string {
  const zoneCount = ZONE_COLORS.length;
  const scaled = progress * (zoneCount - 1);
  const i = Math.floor(scaled);
  const j = Math.min(i + 1, zoneCount - 1);
  const t = scaled - i;
  const a = parseRgba(ZONE_COLORS[i].glow);
  const b = parseRgba(ZONE_COLORS[j].glow);
  return lerpColor(a, b, t);
}

const PARTICLE_COUNT_DESKTOP = 5;
const PARTICLE_COUNT_MOBILE = 2;

export interface AscentBarProps {
  /** When provided (0–1), bar is driven by this value instead of scroll. Used by cinematic hero. */
  progress?: number;
  /** 0–1 scale for particle/glow intensity (e.g. final stage reduction). Default 1. */
  intensity?: number;
}

export default function AscentBar({ progress: progressProp, intensity = 1 }: AscentBarProps = {}) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const rafRef = useRef<number | null>(null);
  const tickingRef = useRef(false);
  const mountedRef = useRef(true);

  const progress = progressProp !== undefined ? Math.max(0, Math.min(1, progressProp)) : scrollProgress;

  const updateProgress = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!mountedRef.current) {
      tickingRef.current = false;
      return;
    }
    const scrollY = Math.max(0, window.scrollY);
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const raw = scrollY / maxScroll;
    const eased = 1 - Math.pow(1 - Math.min(1, raw), 0.9);
    if (!mountedRef.current) return;
    setScrollProgress(eased);
    tickingRef.current = false;
  }, []);

  useEffect(() => {
    if (progressProp !== undefined) return;
    mountedRef.current = true;
    const onScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        rafRef.current = requestAnimationFrame(() => {
          updateProgress();
        });
      }
    };

    const onResize = () => {
      if (mountedRef.current) setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    };

    onResize();
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [updateProgress, progressProp]);

  const glowColor = interpolateZoneColor(progress);
  const glowPositionPercent = progress * 100;
  const particleCount = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
  const safeIntensity = Math.max(0, Math.min(1, intensity));

  return (
    <div
      className="ascent-bar fixed right-3 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-[5] pointer-events-none select-none flex flex-col items-center"
      aria-hidden
      style={{
        ["--ascent-glow-color" as string]: glowColor,
        ["--ascent-glow-position" as string]: `${glowPositionPercent}%`,
      }}
    >
      {/* Track container - shorter on mobile */}
      <div className="ascent-track w-[3px] md:w-[2px] h-[28vh] md:h-[40vh] relative rounded-full overflow-visible">
        {/* Base atmospheric line */}
        <div
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background:
              "linear-gradient(to top, rgba(255,255,255,0.15), rgba(200,240,255,0.1), rgba(255,255,255,0.08))",
          }}
        />

        {/* Section markers (7 zones) */}
        {Array.from({ length: 7 }, (_, i) => {
          const markerProgress = (i + 1) / 7;
          const reached = progress >= markerProgress - 0.08;
          return (
            <div
              key={i}
              className="ascent-marker absolute left-1/2 -translate-x-1/2 rounded-full transition-opacity duration-500 ease-out"
              style={{
                bottom: `${(i / 6) * 100}%`,
                width: "4px",
                height: "4px",
                opacity: reached ? 0.7 : 0.2,
                background: reached ? glowColor : "rgba(255,255,255,0.3)",
                boxShadow: reached
                  ? `0 0 8px ${glowColor}, 0 0 16px ${glowColor}40`
                  : "none",
              }}
            />
          );
        })}

        {/* Ascent glow - moves with scroll */}
        <div
          className="ascent-glow absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-16 md:w-10 md:h-20 transition-all duration-150 ease-out"
          style={{
            bottom: "var(--ascent-glow-position)",
            background: `radial-gradient(ellipse 80% 100% at center, var(--ascent-glow-color) 0%, transparent 70%)`,
            filter: "blur(8px)",
            willChange: "transform",
          }}
        />

        {/* Breathing pulse overlay */}
        <div
          className="ascent-glow-pulse absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 md:w-8 md:h-14 opacity-60 transition-all duration-150 ease-out animate-ascent-breathe"
          style={{
            bottom: "var(--ascent-glow-position)",
            background: `radial-gradient(ellipse 70% 100% at center, var(--ascent-glow-color) 0%, transparent 70%)`,
            filter: "blur(6px)",
            willChange: "transform",
          }}
        />

        {/* Cloud particles near glow */}
        <div className="absolute inset-0 overflow-visible">
          {Array.from({ length: particleCount }, (_, i) => (
            <div
              key={i}
              className="ascent-particle absolute rounded-full"
              style={{
                left: "50%",
                bottom: "var(--ascent-glow-position)",
                width: "3px",
                height: "3px",
                background: "rgba(255,255,255,0.25)",
                transform: `translate(-50%, ${-20 - i * 15}px)`,
                animation: `ascent-particle-drift 3s ease-in-out ${i * 0.4}s infinite`,
                opacity: 0.6 * safeIntensity,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
