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
    };
  }, [updateProgress]);

  // Opacity curves: top=almost invisible, middle=slight, near CTA=most visible
  const topOpacity = Math.min(0.06, progress * 0.08);
  const midOpacity = progress < 0.25 ? 0 : Math.min(0.07, (progress - 0.25) * 0.2);
  const upperOpacity = progress < 0.5 ? 0 : Math.min(0.09, (progress - 0.5) * 0.25);

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
