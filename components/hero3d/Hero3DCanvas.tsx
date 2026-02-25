"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import type { HotspotDef } from "./hotspots";

/** Desktop camera preset — tune position/fov to frame the scene. */
const DESKTOP_CAM = { position: [0, 1.2, 6.5] as const, fov: 35 };
/** Mobile camera preset — slightly closer, higher fov for small screens. */
const MOBILE_CAM = { position: [0, 1.6, 5.2] as const, fov: 45 };

const DEFAULT_LOOKAT: [number, number, number] = [0, 1, 0];
const CAM_LERP = 0.04;
const FOV_LERP = 0.03;
const FLOAT_AMP = 0.03;
const FLOAT_FREQ = 0.4;
const BREATHE_AMP = 0.008;
const BREATHE_FREQ = 0.5;
const PARALLAX_STRENGTH = 0.15;
/** Very subtle auto-drift on mobile (no parallax). */
const MOBILE_DRIFT_STRENGTH = 0.02;
const MOBILE_DRIFT_FREQ = 0.15;
/** Mobile hitbox scale multiplier for larger tap targets. */
const MOBILE_HITBOX_SCALE = 1.35;
/** frameScene: slightly larger scale on mobile so GLB fills screen. */
const MOBILE_SCALE_MULT = 1.08;
/** Tune halo size here — outer and inner radius of the ring under each zone. */
const HALO_RADIUS = 1.8;
const HALO_INNER = 1.2;
/** Slight lift/scale when hotspot is hovered or selected. */
const HOTSPOT_HOVER_SCALE = 1.02;

export interface Hero3DCanvasProps {
  worldUrl: string;
  hotspots: HotspotDef[];
  focusedId: string | null;
  hoveredHotspotId: string | null;
  isMobile: boolean;
  mouseNorm: { x: number; y: number };
  onFocus: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onCtaClick?: (href: string) => void;
  onReady: () => void;
}

export default function Hero3DCanvas(props: Hero3DCanvasProps) {
  const { isMobile } = props;
  const dpr = typeof window !== "undefined"
    ? (isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5))
    : 1;
  const initialCam = isMobile ? MOBILE_CAM : DESKTOP_CAM;

  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      dpr={[1, dpr]}
      camera={{
        position: initialCam.position,
        fov: initialCam.fov,
        near: 0.1,
        far: 100,
      }}
      style={{ display: "block", width: "100%", height: "100%" }}
      shadows={false}
    >
      <Scene {...props} />
    </Canvas>
  );
}

function Scene(props: Hero3DCanvasProps) {
  const { worldUrl, hotspots, focusedId, hoveredHotspotId, isMobile, mouseNorm, onFocus, onHover, onCtaClick, onReady } = props;
  const groupRef = useRef<Group>(null);
  const hasCalledReady = useRef(false);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.position.y = FLOAT_AMP * Math.sin(t * FLOAT_FREQ);
    g.scale.setScalar(1 + BREATHE_AMP * Math.sin(t * BREATHE_FREQ));
  });

  const hotspotDef: HotspotDef | null = focusedId ? (hotspots.find((h) => h.id === focusedId) ?? null) : null;

  return (
    <>
      {isMobile ? (
        <>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={0.6} />
        </>
      ) : (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={0.8} />
          <Environment preset="apartment" />
        </>
      )}
      <fog attach="fog" args={["#0a1628", 8, 22]} />
      <group ref={groupRef} position={[0, 0, 0]} scale={[1, 1, 1]}>
        <WorldModel
          url={worldUrl}
          isMobile={isMobile}
          onLoaded={onReady}
          hasCalledReady={hasCalledReady}
          hotspots={hotspots}
          focusedId={focusedId}
          hoveredHotspotId={hoveredHotspotId}
          onHover={onHover}
          onFocus={onFocus}
          onCtaClick={onCtaClick}
        />
      </group>
      <CameraController
        focusedHotspot={hotspotDef}
        isMobile={isMobile}
        mouseNorm={mouseNorm}
      />
    </>
  );
}

/**
 * Center the world at origin and scale to fit based on bounding box.
 * Use a slightly larger scale on mobile (MOBILE_SCALE_MULT, e.g. 1.05–1.12) so GLB fills screen.
 */
function frameScene(
  object: THREE.Object3D,
  isMobile: boolean
): { position: [number, number, number]; scale: number } {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const fitScale = maxDim > 0 ? 4 / maxDim : 1;
  const scale = isMobile ? fitScale * MOBILE_SCALE_MULT : fitScale;
  return {
    position: [-center.x, -center.y, -center.z],
    scale,
  };
}

function WorldModel({
  url,
  isMobile,
  onLoaded,
  hasCalledReady,
  hotspots,
  focusedId,
  hoveredHotspotId,
  onHover,
  onFocus,
  onCtaClick,
}: {
  url: string;
  isMobile: boolean;
  onLoaded: () => void;
  hasCalledReady: React.MutableRefObject<boolean>;
  hotspots: HotspotDef[];
  focusedId: string | null;
  hoveredHotspotId: string | null;
  onHover: (id: string | null) => void;
  onFocus: (id: string | null) => void;
  onCtaClick?: (href: string) => void;
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return c;
  }, [scene]);

  const { position, scale } = useMemo(
    () => frameScene(cloned, isMobile),
    [cloned, isMobile]
  );

  useFrame(() => {
    if (hasCalledReady.current) return;
    hasCalledReady.current = true;
    onLoaded();
  });

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <primitive object={cloned} />
      {hotspots.map((h) => (
        <React.Fragment key={h.id}>
          <HotspotHalo def={h} visible={hoveredHotspotId === h.id || focusedId === h.id} />
          <HotspotBox
            def={h}
            isFocused={focusedId === h.id}
            isHovered={hoveredHotspotId === h.id}
            isMobile={isMobile}
            onHover={onHover}
            onFocus={onFocus}
          />
          <HotspotPill
            def={h}
            show={(isMobile && focusedId === h.id) || (!isMobile && (hoveredHotspotId === h.id || focusedId === h.id))}
            isMobile={isMobile}
            onCtaClick={onCtaClick}
          />
        </React.Fragment>
      ))}
    </group>
  );
}

/** Billboard ring/halo under the zone; only visible when hovered or selected. */
function HotspotHalo({ def, visible }: { def: HotspotDef; visible: boolean }) {
  const [x, y, z] = def.position;
  const accent = def.accent ?? "#4FA3FF";

  if (!visible) return null;

  return (
    <group position={[x, y - 0.1, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[HALO_INNER, HALO_RADIUS, 32]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.2}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/** Tune hotspot Html offset here — vertical offset of the pill above the hotspot center. */
const PILL_OFFSET_Y = 0.6;

function HotspotPill({
  def,
  show,
  isMobile,
  onCtaClick,
}: {
  def: HotspotDef;
  show: boolean;
  isMobile: boolean;
  onCtaClick?: (href: string) => void;
}) {
  const [x, y, z] = def.position;
  if (!show) return null;

  return (
    <Html
      position={[x, y + PILL_OFFSET_Y, z]}
      center
      distanceFactor={8}
      style={{ pointerEvents: "auto", transition: "opacity 0.2s ease, transform 0.2s ease" }}
    >
      <div
        className="flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-3 py-2 shadow-lg border border-white/50"
        style={{ whiteSpace: "nowrap" }}
      >
        <span className="text-storm text-sm font-medium">{def.label}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCtaClick?.(def.href);
          }}
          className="rounded-full bg-storm text-white text-xs font-medium px-3 py-1.5 hover:bg-storm/90 transition-colors"
          aria-label={def.ctaLabel}
        >
          {def.ctaLabel} →
        </button>
      </div>
    </Html>
  );
}

function HotspotBox({
  def,
  isFocused,
  isHovered,
  isMobile,
  onHover,
  onFocus,
}: {
  def: HotspotDef;
  isFocused: boolean;
  isHovered: boolean;
  isMobile: boolean;
  onHover: (id: string | null) => void;
  onFocus: (id: string | null) => void;
}) {
  const [x, y, z] = def.position;
  const [sx, sy, sz] = def.size;
  const mult = isMobile ? MOBILE_HITBOX_SCALE : 1;
  const lift = isHovered || isFocused ? HOTSPOT_HOVER_SCALE : 1;

  return (
    <group position={[x, y, z]} scale={[lift, lift, lift]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(def.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "default";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onFocus(isFocused ? null : def.id);
        }}
      >
        <boxGeometry args={[sx * mult, sy * mult, sz * mult]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CameraController({
  focusedHotspot,
  isMobile,
  mouseNorm,
}: {
  focusedHotspot: HotspotDef | null;
  isMobile: boolean;
  mouseNorm: { x: number; y: number };
}) {
  const { camera } = useThree();
  const targetPos = useRef({ x: 0, y: 0, z: 0 });
  const targetLook = useRef({ x: DEFAULT_LOOKAT[0], y: DEFAULT_LOOKAT[1], z: DEFAULT_LOOKAT[2] });
  const targetFov = useRef(isMobile ? MOBILE_CAM.fov : DESKTOP_CAM.fov);

  // When isMobile or focusedHotspot changes, set targets (smooth transition, no jump)
  useEffect(() => {
    if (focusedHotspot) {
      const [px, py, pz] = focusedHotspot.focusCam;
      const [lx, ly, lz] = focusedHotspot.lookAt;
      targetPos.current = { x: px, y: py, z: pz };
      targetLook.current = { x: lx, y: ly, z: lz };
      targetFov.current = isMobile ? MOBILE_CAM.fov : DESKTOP_CAM.fov;
    } else {
      const preset = isMobile ? MOBILE_CAM : DESKTOP_CAM;
      targetPos.current = { x: preset.position[0], y: preset.position[1], z: preset.position[2] };
      targetLook.current = { x: DEFAULT_LOOKAT[0], y: DEFAULT_LOOKAT[1], z: DEFAULT_LOOKAT[2] };
      targetFov.current = preset.fov;
    }
  }, [focusedHotspot, isMobile]);

  useFrame((state) => {
    const tp = targetPos.current;
    const tl = targetLook.current;
    const t = state.clock.elapsedTime;

    let parallaxX = 0;
    let parallaxY = 0;
    if (!focusedHotspot) {
      if (isMobile) {
        parallaxX = MOBILE_DRIFT_STRENGTH * Math.sin(t * MOBILE_DRIFT_FREQ);
        parallaxY = MOBILE_DRIFT_STRENGTH * 0.5 * Math.sin(t * MOBILE_DRIFT_FREQ * 0.7);
      } else {
        parallaxX = mouseNorm.x * PARALLAX_STRENGTH;
        parallaxY = mouseNorm.y * PARALLAX_STRENGTH;
      }
    }

    const px = tp.x + parallaxX;
    const py = tp.y + parallaxY;
    const pz = tp.z;

    camera.position.x += (px - camera.position.x) * CAM_LERP;
    camera.position.y += (py - camera.position.y) * CAM_LERP;
    camera.position.z += (pz - camera.position.z) * CAM_LERP;
    camera.lookAt(tl.x, tl.y, tl.z);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov += (targetFov.current - camera.fov) * FOV_LERP;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
