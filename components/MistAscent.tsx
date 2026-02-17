"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/** Parallax factors: layers move slower than scroll (far slowest, near fastest) for depth. */
const PARALLAX_FAR = 0.12;
const PARALLAX_MID = 0.22;
const PARALLAX_NEAR = 0.32;

/** Scroll-driven volumetric mist: Earth → clouds. Opacity 0→0.15/0.20/0.25, soft gradients, parallax. */
export default function MistAscent() {
  const [progress, setProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number | null>(null);
  const tickingRef = useRef(false);

  const updateProgress = useCallback(() => {
    if (typeof window === "undefined") return;
    const sy = window.scrollY;
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const raw = Math.min(1, sy / maxScroll);
    setProgress(raw);
    setScrollY(sy);
    const root = document.documentElement;
    const parallaxY = Math.min(40, raw * 40);
    root.style.setProperty("--hero-parallax-y", `${parallaxY}px`);
    const ipFloat = 6 + raw * 6;
    root.style.setProperty("--hero-ip-float", `${ipFloat}px`);
    tickingRef.current = false;
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        rafRef.current = requestAnimationFrame(updateProgress);
      }
    };
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      document.documentElement.style.removeProperty("--hero-parallax-y");
      document.documentElement.style.removeProperty("--hero-ip-float");
    };
  }, [updateProgress]);

  // Smooth accumulation: 0 → max over full scroll (no sudden jumps)
  const farOpacity = Math.min(0.15, progress * 0.15);
  const midOpacity = Math.min(0.2, progress * 0.2);
  const nearOpacity = Math.min(0.25, progress * 0.25);

  const farY = scrollY * PARALLAX_FAR;
  const midY = scrollY * PARALLAX_MID;
  const nearY = scrollY * PARALLAX_NEAR;

  return (
    <div
      className="mist-ascent fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden
    >
      <div
        className="mist-ascent-layer mist-ascent-far"
        style={{
          opacity: farOpacity,
          transform: `translateY(${farY}px)`,
        }}
        aria-hidden
      />
      <div
        className="mist-ascent-layer mist-ascent-mid"
        style={{
          opacity: midOpacity,
          transform: `translateY(${midY}px)`,
        }}
        aria-hidden
      />
      <div
        className="mist-ascent-layer mist-ascent-near"
        style={{
          opacity: nearOpacity,
          transform: `translateY(${nearY}px)`,
        }}
        aria-hidden
      />
    </div>
  );
}
