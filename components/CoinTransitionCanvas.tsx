"use client";

import React, { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import CoinTransitionScene from "./CoinTransitionScene";

function TransparentClear() {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(0x000000, 0);
    return () => gl.setClearColor(0x000000, 1);
  }, [gl]);
  return null;
}

export function CoinTransitionCanvas({
  progress,
  phase,
}: {
  progress: number;
  phase: 1 | 2 | 3 | 4;
}) {
  return (
    <div className="absolute inset-0 w-full h-full" style={{ transformStyle: "preserve-3d" }}>
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 32 }}
        dpr={[1, 2]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
        }}
        frameloop="always"
        shadows
      >
        <TransparentClear />
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 2, 3]} intensity={0.9} castShadow />
        <directionalLight position={[-1, -0.5, 2]} intensity={0.25} />
        <pointLight position={[0, 0.8, -1.2]} intensity={0.35} color="#aaccff" />
        <pointLight position={[0, 1, 1]} intensity={0.3} color="#88aacc" />
        <CoinTransitionScene progress={progress} phase={phase} />
      </Canvas>
    </div>
  );
}
