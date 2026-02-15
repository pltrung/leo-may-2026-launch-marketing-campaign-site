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

    el.classList.remove("transition-active", "transition-open");
    void el.offsetHeight;
    el.classList.add("transition-active");

    const t1 = setTimeout(() => {
      el.classList.add("transition-open");
    }, 1200);

    const t2 = setTimeout(() => {
      onComplete?.();
    }, 3200);

    const t3 = setTimeout(() => {
      el.classList.remove("transition-active", "transition-open");
    }, 3600);

    timersRef.current = [t1, t2, t3];
    return () => timersRef.current.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div id="cloud-transition" ref={containerRef} aria-hidden="true">
      <div className="mist-layer" />
      <div className="cloud-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/big-cloud-transition.svg"
          className="cloud-half cloud-left"
          alt=""
          draggable={false}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/big-cloud-transition.svg"
          className="cloud-half cloud-right"
          alt=""
          draggable={false}
        />
      </div>
      <div className="sky-opens-text">THE SKY OPENS</div>
    </div>
  );
}
