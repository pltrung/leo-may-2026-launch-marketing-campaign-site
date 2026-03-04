"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { easeOutCubic } from "@/lib/easing";

const LOOKAT_Y = 0.34;
const PARALLAX_MAX = 0.25;
const LERP = 0.08;
const POINTER_LERP = 0.06;

export interface ParallaxCameraParams {
  progress: number;
  pointerX: number;
  pointerY: number;
  reducedMotion: boolean;
}

/** Dolly/orbit/tilt from scroll; pointer offset for parallax. Smooth lerp. */
export function useParallaxCamera(params: ParallaxCameraParams) {
  const { progress, pointerX, pointerY, reducedMotion } = params;
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 0, 8));
  const targetLookAt = useRef(new THREE.Vector3(0, LOOKAT_Y, 0));
  const currentPos = useRef(new THREE.Vector3(0, 0, 8));
  const currentLookAt = useRef(new THREE.Vector3(0, LOOKAT_Y, 0));
  const pointerOffsetX = useRef(0);
  const pointerOffsetY = useRef(0);
  const targetPointerX = useRef(0);
  const targetPointerY = useRef(0);

  useEffect(() => {
    const p = Math.max(0, Math.min(1, progress));
    const e = easeOutCubic(p);

    const baseZ = 8 - e * 2.2;
    const baseY = 0 + e * 0.1;
    const orbitAngle = e * 0.15;
    const tilt = e * 0.06;
    const radius = baseZ * 0.95;
    const x = Math.sin(orbitAngle) * radius * 0.3;
    const z = Math.cos(orbitAngle) * radius;

    targetPos.current.set(x, baseY, z);
    targetLookAt.current.set(0, LOOKAT_Y + tilt, 0);

    targetPointerX.current = reducedMotion ? 0 : pointerX * PARALLAX_MAX;
    targetPointerY.current = reducedMotion ? 0 : pointerY * PARALLAX_MAX;
  }, [progress, pointerX, pointerY, reducedMotion]);

  useFrame(() => {
    if (!camera) return;
    const tp = targetPos.current;
    const tl = targetLookAt.current;
    currentPos.current.lerp(tp, LERP);
    currentLookAt.current.lerp(tl, LERP);

    pointerOffsetX.current += (targetPointerX.current - pointerOffsetX.current) * POINTER_LERP;
    pointerOffsetY.current += (targetPointerY.current - pointerOffsetY.current) * POINTER_LERP;

    camera.position.copy(currentPos.current);
    camera.position.x += pointerOffsetX.current;
    camera.position.y += pointerOffsetY.current;
    (camera as THREE.PerspectiveCamera).lookAt(currentLookAt.current);
  });
}
