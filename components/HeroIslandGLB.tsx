"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group, Mesh, Material } from "three";

const GLB_URL = "/glb-rotating-bouldering-island.glb";
const ROTATION_SECONDS = 25;

/** Preload the hero island GLB so it doesn't cause layout or jank when the Canvas mounts. */
export function preloadHeroIslandGLB(): void {
  if (typeof window === "undefined") return;
  const { useGLTF: gltf } = require("@react-three/drei");
  gltf.preload(GLB_URL);
}

function IslandModel({ opacity }: { opacity: number }) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(GLB_URL);
  const materialsRef = useRef<Material[]>([]);
  const initialized = useRef(false);

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
    initialized.current = true;
  }

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * (Math.PI * 2 / ROTATION_SECONDS);
    materialsRef.current.forEach((mat) => {
      mat.opacity = opacity;
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
}: {
  opacity: number;
  scale?: number;
}) {
  return (
    <group scale={scale} position={[0, 0, 0]}>
      <IslandModel opacity={opacity} />
    </group>
  );
}

