"use client";

import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import HeroIslandGLB from "./HeroIslandGLB";

/** Mount Canvas once when island band is entered; keep mounted to avoid re-mount on scroll. */
export default function HeroIslandCanvas({
  opacity,
  scale,
  className,
}: {
  opacity: number;
  scale: number;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (opacity > 0.01) setMounted(true);
  }, [opacity]);

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
      aria-hidden
    >
      {mounted && (
        <Canvas
          camera={{ position: [0, 0, 8], fov: 45 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          frameloop="always"
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-3, 2, 2]} intensity={0.4} />
          <HeroIslandGLB opacity={opacity} scale={scale} />
        </Canvas>
      )}
    </div>
  );
}
