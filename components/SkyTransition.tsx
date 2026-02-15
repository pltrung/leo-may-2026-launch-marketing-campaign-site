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
    if (!el) return;

    el.classList.add("transition-active");

    const t1 = setTimeout(() => {
      el.classList.add("transition-open");
    }, 1800);

    const t2 = setTimeout(() => {
      onComplete?.();
      el.classList.remove("transition-active");
      el.classList.remove("transition-open");
    }, 3200);

    timersRef.current = [t1, t2];
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [onComplete]);

  return (
    <div id="cloud-transition" ref={containerRef} aria-hidden>
      <div className="mist-layer" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/big-cloud-transition.svg"
        alt=""
        className="cloud cloud-left"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/big-cloud-transition.svg"
        alt=""
        className="cloud cloud-right"
      />
      <div className="sky-opens-text">THE SKY OPENS</div>
    </div>
  );
}
