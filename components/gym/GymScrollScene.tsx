"use client";

import React, { useState, useEffect, useRef } from "react";
import GymCanvas, { type QualityLevel } from "@/components/gym/three/GymCanvas";
import GymChaptersOverlay from "@/components/gym/GymChaptersOverlay";
import GymCanvasErrorBoundary from "@/components/gym/GymCanvasErrorBoundary";
import { useScrollProgress } from "@/components/gym/scroll/useScrollProgress";
import type { SkyTheme } from "@/components/gym/theme/skyTheme";
import type { GymChapter } from "@/components/gym/scroll/chapters";

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

function useWebGLSupported(): boolean {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
      const gl = canvas?.getContext("webgl") ?? canvas?.getContext("experimental-webgl");
      setSupported(Boolean(gl));
    } catch {
      setSupported(false);
    }
  }, []);
  return supported !== false;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

interface GymScrollSceneProps {
  theme: SkyTheme;
  activeChapter: GymChapter | null;
  /** Total story height in vh (e.g. 420 mobile, 560 desktop for slower scroll). */
  storyVh: number;
}

const ROTATE_SENSITIVITY = 0.004;

export default function GymScrollScene({ theme, activeChapter, storyVh }: GymScrollSceneProps) {
  const scroll = useScrollProgress(storyVh);
  const { x: pointerX, y: pointerY } = usePointerNormalized();
  const [userRotationY, setUserRotationY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragLastX = useRef(0);
  const reducedMotion = useReducedMotion();
  const effectiveQuality = useQualityLevel(reducedMotion);
  const webglOk = useWebGLSupported();
  const isMobile = useIsMobile();

  const onDragPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragLastX.current = e.clientX;
    setIsDragging(true);
  };
  const onDragPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = (e.clientX - dragLastX.current) * ROTATE_SENSITIVITY;
    dragLastX.current = e.clientX;
    setUserRotationY((prev) => prev + delta);
  };
  const onDragPointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  return (
    <section
      className="relative"
      style={{ height: `${storyVh}vh`, background: theme.bgGradient }}
      aria-label="Gym story"
    >
      {/* Anchors for scroll (positions match CHAPTER_PROGRESS * maxScroll) */}
      <div id="gym-chapter-intro" className="absolute left-0 w-px h-px" style={{ top: "0" }} aria-hidden />
      <div id="gym-chapter-gym" className="absolute left-0 w-px h-px" style={{ top: "0" }} aria-hidden />
      <div id="gym-chapter-community" className="absolute left-0 w-px h-px" style={{ top: "0" }} aria-hidden />
      <div id="gym-chapter-membership" className="absolute left-0 w-px h-px" style={{ top: "0" }} aria-hidden />

      <div className="sticky top-0 z-0 w-full h-screen overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full"
          style={{ background: theme.bgGradient }}
          aria-hidden
        />
        {webglOk && (
          <GymCanvasErrorBoundary theme={theme} fallbackClassName="absolute inset-0 w-full h-full">
            <GymCanvas
              progress={scroll.progress}
              pointerX={pointerX}
              pointerY={pointerY}
              reducedMotion={reducedMotion}
              theme={theme}
              quality={effectiveQuality}
              activeChapter={activeChapter}
              userRotationY={userRotationY}
              positionYOffsetMobile={isMobile ? 0.24 : 0}
              className="absolute inset-0 w-full h-full"
            />
          </GymCanvasErrorBoundary>
        )}
        {/* Drag to rotate on desktop only; on mobile no drag layer so scroll always works */}
        <div
          className="absolute inset-0 z-[5] md:pointer-events-auto pointer-events-none"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "pan-y",
          }}
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerUp}
          aria-hidden
        />
        <GymChaptersOverlay scroll={scroll} reducedMotion={reducedMotion} />
      </div>
    </section>
  );
}

