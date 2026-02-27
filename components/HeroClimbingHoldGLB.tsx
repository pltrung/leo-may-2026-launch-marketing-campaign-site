"use client";

import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Group, Mesh, Material } from "three";

/** Place glb-human-climbing-hold.glb in public/ so it is served at this path. */
const GLB_URL = "/glb-human-climbing-hold.glb";

/** easeOutCubic */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const CAMERA_FOV = 30;
const CAMERA_POSITION: [number, number, number] = [0, 0.7, 2.4];
const SCALE_INITIAL = 0.85;
const SCALE_FINAL_DESKTOP = 0.99;
const SCALE_FINAL_MOBILE = 0.92;
const SCALE_MAX = 1.05;
const SCALE_ANIM_MS = 300;
const ROTATION_RAD_PER_SEC_DESKTOP = 0.3;
const ROTATION_RAD_PER_SEC_MOBILE = 0.2;

export function preloadHeroClimbingHoldGLB(): void {
  if (typeof window === "undefined") return;
  const { useGLTF: gltf } = require("@react-three/drei");
  gltf.preload(GLB_URL);
}

function ClimbingHoldModel({
  opacity,
  isMobile,
}: {
  opacity: number;
  isMobile: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(GLB_URL);
  const materialsRef = useRef<Material[]>([]);
  const initialized = useRef(false);
  const centered = useRef(false);
  const scaleStartTime = useRef<number | null>(null);

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
    }
    initialized.current = true;
  }

  useFrame((state, delta) => {
    if (!groupRef.current || !scene) return;

    const rotSpeed = isMobile ? ROTATION_RAD_PER_SEC_MOBILE : ROTATION_RAD_PER_SEC_DESKTOP;
    groupRef.current.rotation.y += delta * rotSpeed;

    const now = state.clock.getElapsedTime() * 1000;
    if (scaleStartTime.current === null) scaleStartTime.current = now;
    const scaleElapsed = now - scaleStartTime.current;
    const scaleT = Math.min(1, scaleElapsed / SCALE_ANIM_MS);
    const scaleFinal = isMobile ? SCALE_FINAL_MOBILE : SCALE_FINAL_DESKTOP;
    const scaleEased = SCALE_INITIAL + (scaleFinal - SCALE_INITIAL) * easeOutCubic(scaleT);
    const scale = Math.min(SCALE_MAX, scaleEased);
    groupRef.current.scale.setScalar(scale);

    const op = Math.max(0, Math.min(1, opacity));
    materialsRef.current.forEach((mat) => {
      mat.opacity = op;
    });
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

function CameraAndLights() {
  const { camera } = useThree();
  useEffect(() => {
    if (!camera) return;
    camera.position.set(...CAMERA_POSITION);
    camera.lookAt(0, 0, 0);
    const pCam = camera as THREE.PerspectiveCamera;
    pCam.fov = CAMERA_FOV;
    pCam.updateProjectionMatrix();
  }, [camera]);
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 2, 2]} intensity={1.2} />
      <directionalLight position={[0, 1, -1]} intensity={0.25} />
    </>
  );
}

export default function HeroClimbingHoldGLB({
  opacity,
  isMobile,
}: {
  opacity: number;
  isMobile: boolean;
}) {
  return (
    <>
      <CameraAndLights />
      <ClimbingHoldModel opacity={opacity} isMobile={isMobile} />
    </>
  );
}
