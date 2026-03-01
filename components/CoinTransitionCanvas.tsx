"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import CoinTransitionScene from "./CoinTransitionScene";

export function CoinTransitionCanvas({
  progress,
  phase,
}: {
  progress: number;
  phase: 1 | 2 | 3 | 4;
}) {
  return (
    <div className="w-full h-full min-h-[280px]" style={{ transformStyle: "preserve-3d" }}>
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 28 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        frameloop="always"
        shadows
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 2, 3]} intensity={0.9} castShadow />
        <directionalLight position={[-1, -0.5, 2]} intensity={0.25} />
        {/* Rim light */}
        <pointLight position={[0, 0.8, -1.2]} intensity={0.35} color="#aaccff" />
        <pointLight position={[0, 1, 1]} intensity={0.3} color="#88aacc" />
        <CoinTransitionScene progress={progress} phase={phase} />
      </Canvas>
    </div>
  );
}
