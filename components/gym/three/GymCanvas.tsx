"use client";

import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { SkyTheme } from "@/components/gym/theme/skyTheme";
import type { GymChapter } from "@/components/gym/scroll/chapters";
import { CHAPTERS } from "@/components/gym/scroll/chapters";
import IslandScene from "./IslandScene";
import CloudAtmosphere from "./CloudAtmosphere";
import { useParallaxCamera } from "./useParallaxCamera";
import { easeOutCubic } from "@/lib/easing";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

export type QualityLevel = "high" | "med" | "low";

function getDpr(quality: QualityLevel): [number, number] {
  if (quality === "high") return [1, 1.75];
  if (quality === "med") return [1, 1.5];
  return [1, 1.25];
}

interface SceneProps {
  progress: number;
  pointerX: number;
  pointerY: number;
  reducedMotion: boolean;
  theme: SkyTheme;
  quality: QualityLevel;
  uTime: number;
  activeChapter: GymChapter | null;
}

function Scene({
  progress,
  pointerX,
  pointerY,
  reducedMotion,
  theme,
  quality,
  uTime,
  activeChapter,
}: SceneProps) {
  const chapterPose = activeChapter ? CHAPTERS[activeChapter].camera : null;
  const chapterTargetPose = chapterPose
    ? {
        pos: chapterPose.pos,
        target: chapterPose.target,
        fov: chapterPose.fov,
      }
    : null;

  useParallaxCamera({
    progress,
    pointerX,
    pointerY,
    reducedMotion,
    chapterTargetPose,
  });

  const islandOpacity = 0.3 + 0.7 * easeOutCubic(Math.min(progress * 1.8, 1));
  const islandScale = 0.72 + 0.28 * easeOutCubic(progress);
  /* Same cloud strength on all devices for consistent coloring/style; quality only affects DPR/antialias */
  const cloudQuality = 1;

  const targetTint = activeChapter ? hexToRgb(CHAPTERS[activeChapter].atmosphere.tint) : null;
  const targetStrength = activeChapter ? CHAPTERS[activeChapter].atmosphere.cloudDensity : null;

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-3, 2, 2]} intensity={0.35} />
      <CloudAtmosphere
        uTime={uTime}
        uScroll={progress}
        cloudTint={theme.cloudTint}
        fogTint={theme.fogTint}
        cloudStrength={theme.cloudStrength}
        quality={cloudQuality}
        targetCloudTint={targetTint}
        targetCloudStrength={targetStrength}
      />
      <IslandScene
        opacity={islandOpacity}
        scale={islandScale}
        rotationSpeedMultiplier={0.8 + progress * 0.2}
      />
    </>
  );
}


export interface GymCanvasProps {
  progress: number;
  pointerX: number;
  pointerY: number;
  reducedMotion: boolean;
  theme: SkyTheme;
  quality: QualityLevel;
  activeChapter: GymChapter | null;
  className?: string;
}

export default function GymCanvas({
  progress,
  pointerX,
  pointerY,
  reducedMotion,
  theme,
  quality,
  activeChapter,
  className,
}: GymCanvasProps) {
  const [uTime, setUTime] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const start = performance.now() / 1000;
    let raf = 0;
    const tick = () => {
      setUTime(performance.now() / 1000 - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  const dpr = getDpr(quality);

  if (!mounted) {
    return (
      <div
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--gym-fallback-bg, #0B0B0F)",
        }}
        aria-hidden
      />
    );
  }

  return (
    <>
      <Canvas
        className={className}
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={dpr}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        frameloop="always"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#000000"), 0);
        }}
      >
        <Scene
          progress={progress}
          pointerX={pointerX}
          pointerY={pointerY}
          reducedMotion={reducedMotion}
          theme={theme}
          quality={quality}
          uTime={uTime}
          activeChapter={activeChapter}
        />
      </Canvas>
    </>
  );
}
