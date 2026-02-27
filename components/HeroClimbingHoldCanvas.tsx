"use client";

import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import HeroClimbingHoldGLB, { preloadHeroClimbingHoldGLB } from "./HeroClimbingHoldGLB";

const FADE_MS = 180;

export { preloadHeroClimbingHoldGLB };

export default function HeroClimbingHoldCanvas({
  opacity,
  isMobile,
  className,
  style,
}: {
  opacity: number;
  isMobile: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [mounted, setMounted] = useState(false);
  const [fadeInProgress, setFadeInProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / FADE_MS);
      setFadeInProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mounted]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: isMobile ? "90px" : "120px",
        maxHeight: isMobile ? "120px" : "160px",
        opacity: fadeInProgress,
        transition: `opacity ${FADE_MS}ms ease-out`,
        ...style,
      }}
      aria-hidden
    >
      {mounted && (
        <Canvas
          camera={{ position: [0, 0.3, 1.8], fov: 26 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          frameloop="always"
          style={{ width: "100%", height: "100%" }}
        >
          <HeroClimbingHoldGLB opacity={opacity} isMobile={isMobile} />
        </Canvas>
      )}
    </div>
  );
}
