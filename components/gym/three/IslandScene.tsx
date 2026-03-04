"use client";

import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Mesh, Material } from "three";

const GLB_URL = "/glb-rotating-bouldering-island.glb";
const FLOAT_AMP = 0.008;
const FLOAT_FREQ = 0.6;

export function preloadGymIslandGLB(): void {
  if (typeof window === "undefined") return;
  const { useGLTF: gltf } = require("@react-three/drei");
  gltf.preload(GLB_URL);
}

interface IslandSceneProps {
  opacity: number;
  scale: number;
  rotationSpeedMultiplier?: number;
}

function IslandModel({
  opacity,
  scale,
  rotationSpeedMultiplier = 1,
}: IslandSceneProps) {
  const groupRef = useRef<Group>(null);
  const floatRef = useRef(0);
  const { scene: sourceScene } = useGLTF(GLB_URL);
  const materialsRef = useRef<Material[]>([]);
  const sceneRef = useRef<THREE.Object3D | null>(null);

  if (!sceneRef.current) {
    const scene = sourceScene.clone() as THREE.Group;
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
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    scene.position.sub(center);
    sceneRef.current = scene;
  }

  const scene = sceneRef.current;

  useFrame((_, delta) => {
    if (!groupRef.current || !scene) return;
    const speed = Math.max(0, Math.min(2, rotationSpeedMultiplier));
    groupRef.current.rotation.y += delta * (Math.PI * 2 / 25) * speed;
    floatRef.current += delta * FLOAT_FREQ;
    const floatY = Math.sin(floatRef.current) * FLOAT_AMP;
    groupRef.current.position.y = floatY;
    materialsRef.current.forEach((mat) => {
      mat.opacity = Math.max(0, Math.min(1, opacity));
    });
  });

  return (
    <group ref={groupRef} scale={scale} position={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  );
}

export default function IslandScene(props: IslandSceneProps) {
  return <IslandModel {...props} />;
}
