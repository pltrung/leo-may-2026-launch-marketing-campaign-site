"use client";

import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Mesh, Material } from "three";

const COIN_GLB_URL = "/leo-may-coin.glb";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function preloadCoinGLB(): void {
  if (typeof window === "undefined") return;
  const { useGLTF: gltf } = require("@react-three/drei");
  gltf.preload(COIN_GLB_URL);
}

export default function CoinTransitionScene({
  progress,
  phase,
}: {
  progress: number;
  phase: 1 | 2 | 3 | 4;
}) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(COIN_GLB_URL);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const initialized = useRef(false);
  const centered = useRef(false);

  if (!initialized.current) {
    scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (mesh.isMesh && mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          const m = mat as THREE.MeshStandardMaterial;
          if (m && m.isMeshStandardMaterial) materialsRef.current.push(m);
        });
      }
    });
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    scene.position.sub(center);
    centered.current = true;
    initialized.current = true;
  }

  const phase1End = 0.16;
  const phase2End = 0.48;
  const phase3End = 0.68;
  const phase4End = 1;

  const t2 =
    phase === 2
      ? (progress - phase1End) / (phase2End - phase1End)
      : phase > 2
        ? 1
        : 0;
  const t3 =
    phase === 3
      ? (progress - phase2End) / (phase3End - phase2End)
      : phase > 3
        ? 1
        : 0;
  const t4 =
    phase === 4
      ? (progress - phase3End) / (phase4End - phase3End)
      : 0;

  const rotationY = phase <= 2 ? t2 * Math.PI * 0.5 : Math.PI * 0.5 + t3 * Math.PI * 0.2;
  const floatY = phase <= 2 ? Math.sin(t2 * Math.PI * 2) * 0.004 : 0;
  const innerGlow = phase >= 3 ? (phase === 3 ? 0.15 + t3 * 0.5 : 0.65 + t4 * 0.2) : 0;
  const pulse = phase === 3 && t3 > 0.35 && t3 < 0.55 ? 1 + Math.sin((t3 - 0.35) * Math.PI * 5) * 0.12 : 1;
  const moveZ = phase === 4 ? -0.7 * easeOutCubic(t4) : 0;
  const scalePortal = phase === 4 ? 1 + t4 * 1.8 : 1;

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x = 0.05;
    groupRef.current.rotation.y = rotationY + floatY;
    groupRef.current.rotation.z = 0.12;
    groupRef.current.position.z = moveZ;
    groupRef.current.scale.setScalar(scalePortal);
    materialsRef.current.forEach((m) => {
      m.emissive.setHex(0x88aacc);
      m.emissiveIntensity = innerGlow * pulse * 0.35;
    });
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={1.2} castShadow receiveShadow />
      {/* Subtle shadow plane under coin */}
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="#0a0a12" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
