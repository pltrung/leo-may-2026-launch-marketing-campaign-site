"use client";

import { useEffect, useRef } from "react";

interface SkyTransitionProps {
  onComplete?: () => void;
}

export default function SkyTransition({ onComplete }: SkyTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      onComplete?.();
      return;
    }

    el.classList.remove("mist-active", "mist-clearing");
    void el.offsetHeight;
    el.classList.add("mist-active");

    // Phase 1–2: Mist thickens (~1200ms)
    // Phase 3: Text fades in (handled by CSS)
    // Phase 4: Mist clearing starts at 2400ms
    const t1 = setTimeout(() => {
      el.classList.add("mist-clearing");
    }, 2400);

    // Phase 5: Next page revealed at 4200ms
    const t2 = setTimeout(() => {
      onComplete?.();
    }, 4200);

    const t3 = setTimeout(() => {
      el.classList.remove("mist-active", "mist-clearing");
    }, 4500);

    timersRef.current = [t1, t2, t3];
    return () => timersRef.current.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div id="mist-transition" ref={containerRef} aria-hidden="true">
      <div className="mist-layer mist-back" />
      <div className="mist-layer mist-mid" />
      <div className="mist-layer mist-front" />
      <div className="mist-transition-text">THE SKY OPENS</div>
    </div>
  );
}
