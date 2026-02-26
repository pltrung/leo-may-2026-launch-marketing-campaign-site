"use client";

import React, { useState, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import HeroIslandGLB from "./HeroIslandGLB";

const DEFAULT_CAMERA_Z = 8;
const CAMERA_Z_MIN = 1;
const FOV_MIN = 30;
const FOV_MAX = 75;

/** Vertical offset for look-at target so the sculpture is centered in frame (not sitting too high). */
const LOOKAT_Y_OFFSET = 0.34;

function safeCameraZ(z: number): number {
  if (z !== z || z < CAMERA_Z_MIN) return CAMERA_Z_MIN;
  return Math.max(CAMERA_Z_MIN, z);
}

function safeFov(fov: number): number {
  if (fov !== fov) return 45;
  return Math.max(FOV_MIN, Math.min(FOV_MAX, fov));
}

/** Drives camera Z and look-at; skips update if values are invalid. */
function CameraPushIn({ cameraDistance, fov }: { cameraDistance: number; fov: number }) {
  const { camera } = useThree();
  useFrame(() => {
    if (!camera) return;
    const z = safeCameraZ(cameraDistance);
    const f = safeFov(fov);
    if (z !== z || f !== f) return;
    camera.position.set(0, 0, z);
    camera.lookAt(0, LOOKAT_Y_OFFSET, 0);
    const pCamera = camera as THREE.PerspectiveCamera;
    if (pCamera.fov !== f) {
      pCamera.fov = f;
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
  modelOffsetY = 0,
}: {
  opacity: number;
  scale: number;
  cameraDistance?: number;
  fov?: number;
  rotationSpeedMultiplier?: number;
  onFramingReady?: (cameraZ: number) => void;
  shouldMount?: boolean;
  className?: string;
  modelOffsetY?: number;
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
            offsetY={modelOffsetY}
          />
        </Canvas>
      )}
    </div>
  );
}
