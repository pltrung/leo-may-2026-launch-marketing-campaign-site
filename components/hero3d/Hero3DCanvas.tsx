"use client";

import React, { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import type { HotspotDef } from "./hotspots";

/** Tune this if model faces wrong way (e.g. Math.PI = 180°, -Math.PI/2 = -90°). */
const MODEL_ROTATION_FIX = Math.PI;

/** Desktop camera preset — position and fov after framing. */
const DESKTOP_CAM = { position: [0, 1.2, 6.8] as const, fov: 35 };
/** Mobile fallback when bounding not yet available. */
const MOBILE_CAM_FALLBACK = { position: [0, 1.5, 5.6] as const, fov: 50 };
/** Mobile camera derived from bounding size; tune multipliers if needed. */
const MOBILE_CAM_Y_POS_MULT = 0.6;
const MOBILE_CAM_Z_POS_MULT = 2.2;
const MOBILE_CAM_LOOKAT_Y_MULT = 0.3;
const MOBILE_FOV = 50;

const DEFAULT_LOOKAT: [number, number, number] = [0, 1, 0];
const CAM_LERP = 0.04;
const FOV_LERP = 0.03;
const FLOAT_AMP = 0.03;
const FLOAT_FREQ = 0.4;
const BREATHE_AMP = 0.008;
const BREATHE_FREQ = 0.5;
const PARALLAX_STRENGTH = 0.15;
const MOBILE_DRIFT_STRENGTH = 0.02;
const MOBILE_DRIFT_FREQ = 0.15;
const MOBILE_HITBOX_SCALE = 1.35;
const MOBILE_SCALE_MULT = 1.08;
const HALO_RADIUS = 1.8;
const HALO_INNER = 1.2;
const HOTSPOT_HOVER_SCALE = 1.02;

/** OrbitControls: premium constrained range. */
const ORBIT_MIN_DISTANCE = 5.2;
const ORBIT_MAX_DISTANCE = 8.5;
const ORBIT_MIN_POLAR = 0.9;
const ORBIT_MAX_POLAR = 1.35;
const ORBIT_ROTATE_SPEED = 0.5;

/** TODO: set to false before production. Renders semi-transparent hitbox meshes for tuning. */
const DEBUG_HOTSPOTS = true;

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
  onAscend?: () => void;
  onReady: () => void;
  onBoundingReady?: (info: BoundingInfo) => void;
  userInteracting?: boolean;
  onUserInteractingChange?: (v: boolean) => void;
}

export default function Hero3DCanvas(props: Hero3DCanvasProps) {
  const { isMobile } = props;
  const dpr = typeof window !== "undefined"
    ? (isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5))
    : 1;
  const initialCam = isMobile ? MOBILE_CAM_FALLBACK : DESKTOP_CAM;

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

/** Soft blue-gray background; removes black void. */
const SCENE_BG = "#0e1623";

function Scene(props: Hero3DCanvasProps) {
  const {
    worldUrl,
    hotspots,
    focusedId,
    hoveredHotspotId,
    isMobile,
    mouseNorm,
    onFocus,
    onHover,
    onCtaClick,
    onAscend,
    onReady,
    onBoundingReady,
    userInteracting = false,
    onUserInteractingChange,
  } = props;
  const groupRef = useRef<Group>(null);
  const hasCalledReady = useRef(false);
  const [boundingInfo, setBoundingInfo] = useState<BoundingInfo | null>(null);
  const { scene } = useThree();
  const onBoundingReadyStable = useCallback((info: BoundingInfo) => setBoundingInfo(info), []);

  useEffect(() => {
    scene.background = new THREE.Color(SCENE_BG);
  }, [scene]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    if (userInteracting) return;
    const t = state.clock.elapsedTime;
    g.position.y = FLOAT_AMP * Math.sin(t * FLOAT_FREQ);
    g.scale.setScalar(1 + BREATHE_AMP * Math.sin(t * BREATHE_FREQ));
  });

  const hotspotDef: HotspotDef | null = focusedId ? (hotspots.find((h) => h.id === focusedId) ?? null) : null;
  const orbitEnabled = !isMobile && !hotspotDef;

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
      <fog attach="fog" args={["#0e1a2e", 10, 24]} />
      {orbitEnabled && (
        <OrbitControls
          enablePan={false}
          minDistance={ORBIT_MIN_DISTANCE}
          maxDistance={ORBIT_MAX_DISTANCE}
          minPolarAngle={ORBIT_MIN_POLAR}
          maxPolarAngle={ORBIT_MAX_POLAR}
          rotateSpeed={ORBIT_ROTATE_SPEED}
          onStart={() => onUserInteractingChange?.(true)}
          onEnd={() => onUserInteractingChange?.(false)}
        />
      )}
      <group ref={groupRef} position={[0, 0, 0]} scale={[1, 1, 1]}>
        <WorldModel
          url={worldUrl}
          isMobile={isMobile}
          onLoaded={onReady}
          onBoundingReady={onBoundingReadyStable}
          hasCalledReady={hasCalledReady}
          hotspots={hotspots}
          focusedId={focusedId}
          hoveredHotspotId={hoveredHotspotId}
          onHover={onHover}
          onFocus={onFocus}
          onCtaClick={onCtaClick}
          onAscend={onAscend}
        />
      </group>
      <CameraController
        focusedHotspot={hotspotDef}
        isMobile={isMobile}
        mouseNorm={mouseNorm}
        orbitEnabled={orbitEnabled}
        userInteracting={userInteracting}
        boundingInfo={boundingInfo}
      />
    </>
  );
}

export interface BoundingInfo {
  size: THREE.Vector3;
  scale: number;
  radius: number;
}

/**
 * Center the world at origin and scale to fit based on bounding box.
 * worldGroup.position should be set to -center so scene is centered at origin.
 * Returns size and bounding sphere radius for dynamic camera framing.
 */
function frameScene(
  object: THREE.Object3D,
  isMobile: boolean
): { position: [number, number, number]; scale: number; size: THREE.Vector3; radius: number } {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const maxDim = Math.max(size.x, size.y, size.z);
  const fitScale = maxDim > 0 ? 4 / maxDim : 1;
  const scale = isMobile ? fitScale * MOBILE_SCALE_MULT : fitScale;
  return {
    position: [-center.x, -center.y, -center.z],
    scale,
    size,
    radius: sphere.radius,
  };
}

/** Ascend CTA: fraction of bounding size.y for center-island top. Tune if needed. */
const ASCEND_CTA_Y_FRAC = 0.55;

function WorldModel({
  url,
  isMobile,
  onLoaded,
  onBoundingReady,
  hasCalledReady,
  hotspots,
  focusedId,
  hoveredHotspotId,
  onHover,
  onFocus,
  onCtaClick,
  onAscend,
}: {
  url: string;
  isMobile: boolean;
  onLoaded: () => void;
  onBoundingReady?: (info: BoundingInfo) => void;
  hasCalledReady: React.MutableRefObject<boolean>;
  hotspots: HotspotDef[];
  focusedId: string | null;
  hoveredHotspotId: string | null;
  onHover: (id: string | null) => void;
  onFocus: (id: string | null) => void;
  onCtaClick?: (href: string) => void;
  onAscend?: () => void;
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

  const framed = useMemo(
    () => frameScene(cloned, isMobile),
    [cloned, isMobile]
  );
  const { position, scale, size, radius } = framed;

  useEffect(() => {
    onBoundingReady?.({ size, scale, radius });
  }, [onBoundingReady, size, scale, radius]);

  useFrame(() => {
    if (hasCalledReady.current) return;
    hasCalledReady.current = true;
    onLoaded();
  });

  const ascendCtaPosition: [number, number, number] = [0, size.y * ASCEND_CTA_Y_FRAC, 0];

  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, MODEL_ROTATION_FIX, 0]}>
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
      {onAscend && (
        <Html
          position={ascendCtaPosition}
          transform
          sprite
          center
          distanceFactor={isMobile ? 5 : 6}
          style={{ pointerEvents: "auto" }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFocus("monument");
              onAscend();
            }}
            className={`ascend-cta-pill rounded-full bg-white/90 backdrop-blur-md text-storm font-medium border border-white/50 shadow-lg hover:scale-105 active:scale-100 transition-transform duration-200 ${
              isMobile ? "px-4 py-2 text-xs scale-90" : "px-5 py-2.5 text-sm"
            }`}
            style={{
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            }}
            aria-label="Ascend With Us — Founding Circle"
          >
            Ascend With Us
          </button>
        </Html>
      )}
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
        <meshBasicMaterial
          transparent
          opacity={DEBUG_HOTSPOTS ? 0.25 : 0}
          depthWrite={false}
          color={DEBUG_HOTSPOTS ? "#4FA3FF" : undefined}
          wireframe={false}
        />
      </mesh>
    </group>
  );
}

function CameraController({
  focusedHotspot,
  isMobile,
  mouseNorm,
  orbitEnabled,
  userInteracting,
  boundingInfo,
}: {
  focusedHotspot: HotspotDef | null;
  isMobile: boolean;
  mouseNorm: { x: number; y: number };
  orbitEnabled: boolean;
  userInteracting: boolean;
  boundingInfo: BoundingInfo | null;
}) {
  const { camera } = useThree();
  const targetPos = useRef({ x: 0, y: 0, z: 0 });
  const targetLook = useRef({ x: DEFAULT_LOOKAT[0], y: DEFAULT_LOOKAT[1], z: DEFAULT_LOOKAT[2] });
  const targetFov = useRef(isMobile ? MOBILE_FOV : DESKTOP_CAM.fov);

  useEffect(() => {
    if (focusedHotspot) {
      const [px, py, pz] = focusedHotspot.focusCam;
      const [lx, ly, lz] = focusedHotspot.lookAt;
      targetPos.current = { x: px, y: py, z: pz };
      targetLook.current = { x: lx, y: ly, z: lz };
      targetFov.current = isMobile ? MOBILE_FOV : DESKTOP_CAM.fov;
    } else if (isMobile && boundingInfo) {
      const { size, scale } = boundingInfo;
      const wy = size.y * scale;
      const wz = size.z * scale;
      targetPos.current = {
        x: 0,
        y: wy * MOBILE_CAM_Y_POS_MULT,
        z: wz * MOBILE_CAM_Z_POS_MULT,
      };
      targetLook.current = { x: 0, y: wy * MOBILE_CAM_LOOKAT_Y_MULT, z: 0 };
      targetFov.current = MOBILE_FOV;
    } else if (isMobile) {
      const preset = MOBILE_CAM_FALLBACK;
      targetPos.current = { x: preset.position[0], y: preset.position[1], z: preset.position[2] };
      targetLook.current = { x: DEFAULT_LOOKAT[0], y: DEFAULT_LOOKAT[1], z: DEFAULT_LOOKAT[2] };
      targetFov.current = MOBILE_FOV;
    } else {
      targetPos.current = { x: DESKTOP_CAM.position[0], y: DESKTOP_CAM.position[1], z: DESKTOP_CAM.position[2] };
      targetLook.current = { x: DEFAULT_LOOKAT[0], y: DEFAULT_LOOKAT[1], z: DEFAULT_LOOKAT[2] };
      targetFov.current = DESKTOP_CAM.fov;
    }
  }, [focusedHotspot, isMobile, boundingInfo]);

  useFrame((state) => {
    if (orbitEnabled) return;

    const tp = targetPos.current;
    const tl = targetLook.current;
    const t = state.clock.elapsedTime;

    let parallaxX = 0;
    let parallaxY = 0;
    if (!focusedHotspot && !userInteracting) {
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
