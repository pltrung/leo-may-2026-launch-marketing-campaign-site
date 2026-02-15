"use client";

import { useEffect, useRef } from "react";

interface SkyTransitionProps {
  onComplete?: () => void;
}

export default function SkyTransition({ onComplete }: SkyTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = containerRef.current;
    if (!t) {
      onComplete?.();
      return;
    }

    t.classList.remove("active", "open");
    void t.offsetHeight;
    t.classList.add("active");

    const t1 = setTimeout(() => {
      t.classList.add("open");
    }, 2800);

    const t2 = setTimeout(() => {
      onComplete?.();
    }, 3400);

    const t3 = setTimeout(() => {
      t.classList.remove("active", "open");
    }, 4600);

    timersRef.current = [t1, t2, t3];
    return () => timersRef.current.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div id="cloud-transition" ref={containerRef} aria-hidden="true">
      <div className="mist-layer" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/big-cloud-transition.svg"
        className="transition-cloud"
        alt=""
        draggable={false}
      />
      <div className="sky-opens-text">THE SKY OPENS</div>
    </div>
  );
}
