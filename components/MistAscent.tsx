"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/** Scroll-driven mist layers for cinematic ascent feel. Only visible during hero scroll. */
export default function MistAscent() {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const tickingRef = useRef(false);

  const updateProgress = useCallback(() => {
    if (typeof window === "undefined") return;
    const scrollY = window.scrollY;
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const raw = Math.min(1, scrollY / maxScroll);
    setProgress(raw);
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

  // Opacity curves: top=almost invisible, middle=slight, near CTA=most visible
  const topOpacity = 0.02 + Math.min(0.1, progress * 0.12);
  const midOpacity = progress < 0.2 ? 0 : Math.min(0.12, (progress - 0.2) * 0.35);
  const upperOpacity = progress < 0.45 ? 0 : Math.min(0.15, (progress - 0.45) * 0.4);

  return (
    <div
      className="mist-ascent fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden
    >
      {/* Top mist: very faint, present from start, slow drift */}
      <div
        className="mist-ascent-layer mist-ascent-top"
        style={{ opacity: topOpacity }}
      />

      {/* Mid mist: appears after ~25% scroll */}
      <div
        className="mist-ascent-layer mist-ascent-mid"
        style={{ opacity: midOpacity }}
      />

      {/* Upper mist: appears after ~50% scroll, soft glow */}
      <div
        className="mist-ascent-layer mist-ascent-upper"
        style={{ opacity: upperOpacity }}
      />
    </div>
  );
}
