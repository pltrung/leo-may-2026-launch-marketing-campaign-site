"use client";

import React, { useState, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import HeroIslandGLB from "./HeroIslandGLB";

const DEFAULT_CAMERA_Z = 8;

/** Drives camera Z only; target is always (0,0,0). Dolly toward center only. */
function CameraPushIn({ cameraDistance, fov }: { cameraDistance: number; fov: number }) {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.set(0, 0, cameraDistance);
    camera.lookAt(0, 0, 0);
    const pCamera = camera as THREE.PerspectiveCamera;
    if (pCamera.fov !== fov) {
      pCamera.fov = fov;
      pCamera.updateProjectionMatrix();
    }
  });
  return null;
}

/** Mount Canvas once when island band is entered (or when shouldMount); keep mounted to avoid pop. */
export default function HeroIslandCanvas({
  opacity,
  scale,
  cameraDistance = DEFAULT_CAMERA_Z,
  fov = 45,
  rotationSpeedMultiplier = 1,
  onFramingReady,
  shouldMount,
  className,
}: {
  opacity: number;
  scale: number;
  cameraDistance?: number;
  fov?: number;
  rotationSpeedMultiplier?: number;
  onFramingReady?: (cameraZ: number) => void;
  shouldMount?: boolean;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (shouldMount ?? opacity > 0.01) setMounted(true);
  }, [opacity, shouldMount]);

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
          camera={{ position: [0, 0, DEFAULT_CAMERA_Z], fov: 45 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          frameloop="always"
        >
          <CameraPushIn cameraDistance={cameraDistance} fov={fov} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-3, 2, 2]} intensity={0.4} />
          <HeroIslandGLB
            opacity={opacity}
            scale={scale}
            rotationSpeedMultiplier={rotationSpeedMultiplier}
            onFramingReady={onFramingReady}
          />
        </Canvas>
      )}
    </div>
  );
}
