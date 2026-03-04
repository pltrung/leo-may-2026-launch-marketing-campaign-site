"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import GymCanvas, { type QualityLevel } from "@/components/gym/three/GymCanvas";
import GymChaptersOverlay from "@/components/gym/GymChaptersOverlay";
import { useScrollProgress } from "@/components/gym/scroll/useScrollProgress";
import { getSkyTheme, getLocalTimeHours } from "@/components/gym/theme/skyTheme";
import type { SkyTheme } from "@/components/gym/theme/skyTheme";

const GYM_STORY_VH = 420;
const FPS_SAMPLE_MS = 2000;
const FPS_THRESHOLD = 45;

function usePointerNormalized() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY : e.clientY;
      if (typeof clientX !== "number" || typeof clientY !== "number") return;
      const nx = (clientX / window.innerWidth) - 0.5;
      const ny = 0.5 - (clientY / window.innerHeight);
      setX(nx);
      setY(ny);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
    };
  }, []);

  return { x, y };
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useQualityLevel(reducedMotion: boolean): QualityLevel {
  const [quality, setQuality] = useState<QualityLevel>("med");
  const downgraded = useRef(false);
  const deltas = useRef<number[]>([]);
  const startRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) {
      setQuality("low");
      return;
    }
    const isMobile = /iPhone|iPad|Android|webOS/i.test(navigator.userAgent);
    const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 4;
    const navWithMemory = navigator as unknown as { deviceMemory?: number };
    const memory = typeof navWithMemory.deviceMemory === "number" ? navWithMemory.deviceMemory : 8;
    let level: QualityLevel = "med";
    if (!isMobile && cores >= 6 && memory >= 6) level = "high";
    if (isMobile || cores <= 2) level = "low";
    setQuality(level);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || downgraded.current) return;
    startRef.current = performance.now();
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      deltas.current.push(1000 / (now - last));
      last = now;
      if (deltas.current.length > 120) deltas.current.shift();
      const elapsed = now - startRef.current;
      if (elapsed >= FPS_SAMPLE_MS && deltas.current.length >= 30) {
        const avg = deltas.current.reduce((a, b) => a + b, 0) / deltas.current.length;
        if (avg < FPS_THRESHOLD) {
          downgraded.current = true;
          setQuality((q) => (q === "high" ? "med" : "low"));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  return quality;
}

interface GymScrollSceneProps {
  theme: SkyTheme;
}

export default function GymScrollScene({ theme }: GymScrollSceneProps) {
  const scroll = useScrollProgress(GYM_STORY_VH);
  const { x: pointerX, y: pointerY } = usePointerNormalized();
  const reducedMotion = useReducedMotion();
  const effectiveQuality = useQualityLevel(reducedMotion);

  return (
    <section
      className="relative"
      style={{ height: `${GYM_STORY_VH}vh` }}
      aria-label="Gym story"
    >
      {/* Anchors for smooth scroll: progress 0, 0.25, 0.5, 0.8 -> 0, 80vh, 160vh, 256vh */}
      <div id="gym-chapter-gym" className="absolute left-0 w-px h-px" style={{ top: "0vh" }} aria-hidden />
      <div id="gym-chapter-membership" className="absolute left-0 w-px h-px" style={{ top: "80vh" }} aria-hidden />
      <div id="gym-chapter-community" className="absolute left-0 w-px h-px" style={{ top: "160vh" }} aria-hidden />
      <div id="gym-cta" className="absolute left-0 w-px h-px" style={{ top: "256vh" }} aria-hidden />

      <div className="sticky top-0 w-full h-screen overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full"
          style={{ background: theme.bgGradient }}
          aria-hidden
        />
        <GymCanvas
          progress={scroll.progress}
          pointerX={pointerX}
          pointerY={pointerY}
          reducedMotion={reducedMotion}
          theme={theme}
          quality={effectiveQuality}
          className="absolute inset-0 w-full h-full"
        />
        <GymChaptersOverlay scroll={scroll} reducedMotion={reducedMotion} />
      </div>
    </section>
  );
}

export { GYM_STORY_VH };
