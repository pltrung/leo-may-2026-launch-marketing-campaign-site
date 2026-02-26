"use client";

import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Mesh, Material } from "three";

const GLB_URL = "/glb-rotating-bouldering-island.glb";
const ROTATION_SECONDS = 25;

/** Preload the hero island GLB so it doesn't cause layout or jank when the Canvas mounts. */
export function preloadHeroIslandGLB(): void {
  if (typeof window === "undefined") return;
  const { useGLTF: gltf } = require("@react-three/drei");
  gltf.preload(GLB_URL);
}

const BASE_ROTATION_RAD_PER_SEC = (Math.PI * 2) / ROTATION_SECONDS;

const DESKTOP_FOV_DEG = 45;
const DESKTOP_SCREEN_COVERAGE = 0.75;

function IslandModel({
  opacity,
  rotationSpeedMultiplier = 1,
  onFramingReady,
}: {
  opacity: number;
  rotationSpeedMultiplier?: number;
  onFramingReady?: (cameraZ: number) => void;
}) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(GLB_URL);
  const materialsRef = useRef<Material[]>([]);
  const initialized = useRef(false);
  const centered = useRef(false);
  const framingReported = useRef(false);
  const computedCameraZRef = useRef<number | null>(null);

  if (!initialized.current) {
    scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (mesh.isMesh && mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat: Material) => {
          mat.transparent = true;
          materialsRef.current.push(mat);
        });
      }
    });
    if (!centered.current) {
      const box = new THREE.Box3().setFromObject(scene);
      const center = new THREE.Vector3();
      box.getCenter(center);
      scene.position.sub(center);
      centered.current = true;
      if (onFramingReady && !framingReported.current) {
        const size = new THREE.Vector3();
        box.getSize(size);
        const radius = 0.5 * Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z);
        const fovRad = (DESKTOP_FOV_DEG * Math.PI) / 180;
        const distance = radius / (DESKTOP_SCREEN_COVERAGE * Math.tan(fovRad / 2));
        framingReported.current = true;
        computedCameraZRef.current = distance;
      }
    }
    initialized.current = true;
  }

  useEffect(() => {
    if (computedCameraZRef.current != null && onFramingReady) {
      onFramingReady(computedCameraZRef.current);
    }
  }, [onFramingReady]);

  useFrame((_state, delta) => {
    if (!groupRef.current || !scene) return;
    if (!Number.isFinite(delta) || !Number.isFinite(rotationSpeedMultiplier) || !Number.isFinite(opacity)) return;
    const speed = Math.max(0, Math.min(2, rotationSpeedMultiplier));
    const op = Math.max(0, Math.min(1, opacity));
    groupRef.current.rotation.y += delta * BASE_ROTATION_RAD_PER_SEC * speed;
    materialsRef.current.forEach((mat) => {
      mat.opacity = op;
    });
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={1} position={[0, 0, 0]} />
    </group>
  );
}

export default function HeroIslandGLB({
  opacity,
  scale = 1,
  rotationSpeedMultiplier = 1,
  onFramingReady,
  offsetY = 0,
}: {
  opacity: number;
  scale?: number;
  rotationSpeedMultiplier?: number;
  onFramingReady?: (cameraZ: number) => void;
  offsetY?: number;
}) {
  return (
    <group scale={scale} position={[0, offsetY, 0]}>
      <IslandModel
        opacity={opacity}
        rotationSpeedMultiplier={rotationSpeedMultiplier}
        onFramingReady={onFramingReady}
      />
    </group>
  );
}

