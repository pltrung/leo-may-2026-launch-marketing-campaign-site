"use client";

import React, { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import type { HotspotDef } from "./hotspots";

/** Rotate worldGroup so climbing wall faces camera. */
const MODEL_ROTATION_FIX = Math.PI / 2;

/** Locked cinematic default: slightly low camera, upward tilt, all islands visible, FOV 40–50. Never auto-fit. */
const DEFAULT_CINEMATIC_CAMERA = {
  position: [0, 1.0, 6.8] as const,
  lookAt: [0, 1.4, -0.3] as const,
  fov: 45,
};

/** Mobile uses same cinematic framing as desktop. */
const MOBILE_CAM_FALLBACK = { position: DEFAULT_CINEMATIC_CAMERA.position, fov: DEFAULT_CINEMATIC_CAMERA.fov };

const DEFAULT_LOOKAT: [number, number, number] = [0, 1, 0];
const CAM_LERP = 0.04;
const FOCUS_CAM_LERP = 0.022;
const FOV_LERP = 0.03;
const FLOAT_AMP = 0.025;
const FLOAT_FREQ = 0.35;
const BREATHE_AMP = 0.006;
const BREATHE_FREQ = 0.4;
const WORLD_DRIFT_Y_RAD = 0.008;
const WORLD_DRIFT_FREQ = 0.12;
const ISLAND_PHASE_AMP = 0.012;
const ISLAND_PHASE_FREQ = 0.5;
const PARALLAX_STRENGTH = 0.07;

function islandPhase(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return (h % 100) / 100 * Math.PI * 2;
}
const MOBILE_DRIFT_STRENGTH = 0.015;
const MOBILE_DRIFT_FREQ = 0.12;
const MOBILE_HITBOX_SCALE = 1.8;
const DESKTOP_HITBOX_SCALE = 1.2;
const MOBILE_SCALE_MULT = 1.08;
const HALO_RADIUS = 1.8;
const HALO_INNER = 1.2;
const HOTSPOT_HOVER_SCALE = 1.02;

/** OrbitControls: small range so wall stays facing camera. */
const ORBIT_MIN_DISTANCE = 5.2;
const ORBIT_MAX_DISTANCE = 8.5;
const ORBIT_MIN_POLAR = 0.9;
const ORBIT_MAX_POLAR = 1.35;
const ORBIT_MIN_AZIMUTH = -0.25;
const ORBIT_MAX_AZIMUTH = 0.25;
const ORBIT_ROTATE_SPEED = 0.5;

/** Hitboxes shown only when ?debug=1 (debugUi). Set true to always show for development. */
const DEBUG_HOTSPOTS = false;

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
  /** In-scene Ascend CTA click: opens confirm panel (does not call onJoin). */
  onAscendCtaClick?: () => void;
  /** When true, camera focuses toward main wall (e.g. when Ascend panel is open). */
  cameraFocusMainWall?: boolean;
  onReady: () => void;
  onBoundingReady?: (info: BoundingInfo) => void;
  userInteracting?: boolean;
  onUserInteractingChange?: (v: boolean) => void;
  /** Show hotspot hitboxes when true (?debug=1). */
  debugUi?: boolean;
  /** Increment to trigger reset camera to home framing. */
  resetViewTrigger?: number;
  /** Mobile: show subtle pulse on center island after idle (discoverability). */
  showCenterPulse?: boolean;
  /** 0..1 entrance progress for dolly + rise animation. */
  entranceProgress?: number;
}

export default function Hero3DCanvas(props: Hero3DCanvasProps) {
  const { isMobile } = props;
  const dpr = typeof window !== "undefined"
    ? (isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5))
    : 1;
  const [px, py, pz] = DEFAULT_CINEMATIC_CAMERA.position;

  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 1);
      }}
      dpr={[1, dpr]}
      camera={{
        position: [px, py, pz],
        fov: DEFAULT_CINEMATIC_CAMERA.fov,
        near: 0.1,
        far: 1000,
      }}
      style={{ display: "block", width: "100%", height: "100%", touchAction: "none", pointerEvents: "auto" }}
      shadows={false}
    >
      <Scene {...props} />
    </Canvas>
  );
}


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
    onAscendCtaClick,
    cameraFocusMainWall = false,
    onReady,
    onBoundingReady,
    userInteracting = false,
    onUserInteractingChange,
    debugUi = false,
    resetViewTrigger = 0,
    showCenterPulse = false,
    entranceProgress = 1,
  } = props;
  const groupRef = useRef<Group>(null);
  const hasCalledReady = useRef(false);
  const [boundingInfo, setBoundingInfo] = useState<BoundingInfo | null>(null);
  const [resetRequested, setResetRequested] = useState(false);
  const { camera } = useThree();
  const onBoundingReadyStable = useCallback((info: BoundingInfo) => setBoundingInfo(info), []);

  useEffect(() => {
    if (resetViewTrigger > 0) {
      setResetRequested(true);
      const t = setTimeout(() => setResetRequested(false), 650);
      return () => clearTimeout(t);
    }
  }, [resetViewTrigger]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const rise = 1 - Math.max(0, entranceProgress);
    const entranceY = -0.15 * rise;
    if (!userInteracting) {
      g.position.y = entranceY + FLOAT_AMP * Math.sin(t * FLOAT_FREQ);
      g.rotation.y = WORLD_DRIFT_Y_RAD * Math.sin(t * WORLD_DRIFT_FREQ);
      g.scale.setScalar(1 + BREATHE_AMP * Math.sin(t * BREATHE_FREQ));
    } else {
      g.position.y = entranceY;
    }
  });

  const hotspotDef: HotspotDef | null = focusedId ? (hotspots.find((h) => h.id === focusedId) ?? null) : null;
  const orbitEnabled = !hotspotDef && !cameraFocusMainWall && !resetRequested;

  const orbitTarget = useMemo(() => {
    if (boundingInfo) return [boundingInfo.homeLookAt.x, boundingInfo.homeLookAt.y, boundingInfo.homeLookAt.z] as const;
    return [DEFAULT_CINEMATIC_CAMERA.lookAt[0], DEFAULT_CINEMATIC_CAMERA.lookAt[1], DEFAULT_CINEMATIC_CAMERA.lookAt[2]] as const;
  }, [boundingInfo]);
  const orbitMinDist = boundingInfo ? boundingInfo.worldRadius * 0.45 : ORBIT_MIN_DISTANCE;
  const orbitMaxDist = boundingInfo ? boundingInfo.worldRadius * 2.6 : ORBIT_MAX_DISTANCE;

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
          <Environment preset="studio" background={false} />
        </>
      )}
      {orbitEnabled && (
        <OrbitControls
          target={orbitTarget}
          enablePan={false}
          enableRotate={true}
          enableZoom={false}
          minDistance={orbitMinDist}
          maxDistance={orbitMaxDist}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI * 0.45}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={isMobile ? 0.55 : 0.75}
          onStart={() => onUserInteractingChange?.(true)}
          onEnd={() => onUserInteractingChange?.(false)}
        />
      )}
      {/* worldGroup: hotspots are children so they scale and rotate with the model */}
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
          onAscendCtaClick={onAscendCtaClick}
          debugUi={debugUi}
          showCenterPulse={showCenterPulse}
        />
      </group>
      <CameraController
        focusedHotspot={hotspotDef}
        isMobile={isMobile}
        mouseNorm={mouseNorm}
        orbitEnabled={orbitEnabled}
        userInteracting={userInteracting}
        boundingInfo={boundingInfo}
        cameraFocusMainWall={cameraFocusMainWall}
        resetRequested={resetRequested}
        entranceProgress={entranceProgress}
      />
    </>
  );
}

export interface BoundingInfo {
  size: THREE.Vector3;
  scale: number;
  radius: number;
  /** World-space radius (radius * scale). */
  worldRadius: number;
  /** World-space center (after centering) = origin. */
  center: THREE.Vector3;
  /** Camera home position: distance = radius*2.4, lower angle. */
  homePosition: THREE.Vector3;
  /** Camera home lookAt: cinematic tilt (0, radius*0.6, -radius*0.2). */
  homeLookAt: THREE.Vector3;
}

/**
 * Center the world at origin and scale to fit based on bounding box.
 * Camera: distance = radius*2.4, lower camera at radius*0.6, lookAt(0, radius*0.6, -radius*0.2).
 */
function frameScene(
  object: THREE.Object3D,
  isMobile: boolean
): { position: [number, number, number]; scale: number; size: THREE.Vector3; radius: number; worldRadius: number; center: THREE.Vector3; homePosition: THREE.Vector3; homeLookAt: THREE.Vector3 } {
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
  const worldRadius = sphere.radius * scale;
  const distance = worldRadius * 2.4;
  const homePosition = new THREE.Vector3(0, worldRadius * 0.6, distance);
  const homeLookAt = new THREE.Vector3(0, worldRadius * 0.6, -worldRadius * 0.2);
  return {
    position: [-center.x, -center.y, -center.z],
    scale,
    size,
    radius: sphere.radius,
    worldRadius,
    center: new THREE.Vector3(0, 0, 0),
    homePosition,
    homeLookAt,
  };
}

/** Ascend CTA: fraction of bounding size.y for center-island top. Tune if needed. */
const ASCEND_CTA_Y_FRAC = 0.55;

function IslandBreathingGroup({ phase, children }: { phase: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.position.y = ISLAND_PHASE_AMP * Math.sin(t * ISLAND_PHASE_FREQ + phase);
  });
  return <group ref={ref}>{children}</group>;
}

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
  onAscendCtaClick,
  debugUi,
  showCenterPulse = false,
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
  onAscendCtaClick?: () => void;
  debugUi?: boolean;
  showCenterPulse?: boolean;
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
  const { position, scale, size, radius, worldRadius, center, homePosition, homeLookAt } = framed;

  useEffect(() => {
    onBoundingReady?.({ size, scale, radius, worldRadius, center, homePosition, homeLookAt });
  }, [onBoundingReady, size, scale, radius, worldRadius, center, homePosition, homeLookAt]);

  useFrame(() => {
    if (hasCalledReady.current) return;
    hasCalledReady.current = true;
    onLoaded();
  });

  const ascendCtaPosition: [number, number, number] = [0, size.y * ASCEND_CTA_Y_FRAC, 0];
  const centerIsland = hotspots.find((h) => h.id === "main");
  const showAscendCta = onAscendCtaClick && focusedId !== null;

  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, MODEL_ROTATION_FIX, 0]}>
      <primitive object={cloned} />
      {hotspots.map((h) => (
        <IslandBreathingGroup key={h.id} phase={islandPhase(h.id)}>
          <HotspotHalo def={h} visible={hoveredHotspotId === h.id || focusedId === h.id} />
          <HotspotBox
            def={h}
            isFocused={focusedId === h.id}
            isHovered={hoveredHotspotId === h.id}
            isMobile={isMobile}
            onHover={onHover}
            onFocus={onFocus}
            showDebugBox={DEBUG_HOTSPOTS || debugUi === true}
          />
          <HotspotPill
            def={h}
            show={(isMobile && focusedId === h.id) || (!isMobile && (hoveredHotspotId === h.id || focusedId === h.id))}
            isMobile={isMobile}
            onCtaClick={onCtaClick}
          />
        </IslandBreathingGroup>
      ))}
      {isMobile && showCenterPulse && !focusedId && centerIsland && (
        <CenterPulseRing position={centerIsland.position} />
      )}
      {showAscendCta && (
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
              onAscendCtaClick();
            }}
            className={`ascend-cta-pill rounded-full bg-white/90 backdrop-blur-md text-storm font-medium border border-white/50 shadow-lg transition-transform duration-200 ${
              isMobile
                ? "px-4 py-2 text-xs scale-90 active:scale-95"
                : "px-5 py-2.5 text-sm hover:scale-[1.04] active:scale-100"
            }`}
            style={{
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            }}
            aria-label="Ascend With Us"
          >
            Ascend With Us
          </button>
        </Html>
      )}
    </group>
  );
}

/** Subtle pulse ring on center island for discoverability (mobile, after idle). */
function CenterPulseRing({ position: pos }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = meshRef.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const scale = 1 + 0.12 * Math.sin(t * 1.2);
    m.scale.setScalar(scale);
    const mat = m.material as THREE.MeshBasicMaterial;
    if (mat.opacity !== undefined) mat.opacity = 0.15 + 0.08 * Math.sin(t * 1.2);
  });
  return (
    <group position={[pos[0], pos[1] - 0.1, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={meshRef}>
        <ringGeometry args={[1.0, 2.2, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.2}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
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
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-3 py-2 shadow-lg border border-white/50 transition-transform duration-150 ease-out hover:scale-105"
        style={{ whiteSpace: "nowrap", transform: "scale(1.02)" }}
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
  showDebugBox,
}: {
  def: HotspotDef;
  isFocused: boolean;
  isHovered: boolean;
  isMobile: boolean;
  onHover: (id: string | null) => void;
  onFocus: (id: string | null) => void;
  showDebugBox?: boolean;
}) {
  const [x, y, z] = def.position;
  const [sx, sy, sz] = def.size;
  const mult = isMobile ? MOBILE_HITBOX_SCALE : DESKTOP_HITBOX_SCALE;
  const lift = isHovered || isFocused ? HOTSPOT_HOVER_SCALE : 1;

  return (
    <group position={[x, y, z]} scale={[lift, lift, lift]}>
      <mesh
        onPointerDown={(e) => e.stopPropagation()}
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
          opacity={showDebugBox ? 0.25 : 0}
          depthWrite={false}
          color={showDebugBox ? "#4FA3FF" : undefined}
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
  cameraFocusMainWall = false,
  resetRequested = false,
  entranceProgress = 1,
}: {
  focusedHotspot: HotspotDef | null;
  isMobile: boolean;
  mouseNorm: { x: number; y: number };
  orbitEnabled: boolean;
  userInteracting: boolean;
  boundingInfo: BoundingInfo | null;
  cameraFocusMainWall?: boolean;
  resetRequested?: boolean;
  entranceProgress?: number;
}) {
  const { camera } = useThree();
  const targetPos = useRef({ x: 0, y: 0, z: 0 });
  const targetLook = useRef({ x: 0, y: 0, z: 0 });
  const targetFov = useRef(DEFAULT_CINEMATIC_CAMERA.fov);
  useEffect(() => {
    const dx = isMobile ? MOBILE_CAM_FALLBACK.position[0] : DEFAULT_CINEMATIC_CAMERA.position[0];
    const dy = isMobile ? MOBILE_CAM_FALLBACK.position[1] : DEFAULT_CINEMATIC_CAMERA.position[1];
    const dz = isMobile ? MOBILE_CAM_FALLBACK.position[2] : DEFAULT_CINEMATIC_CAMERA.position[2];
    const lx = DEFAULT_CINEMATIC_CAMERA.lookAt[0];
    const ly = DEFAULT_CINEMATIC_CAMERA.lookAt[1];
    const lz = DEFAULT_CINEMATIC_CAMERA.lookAt[2];
    if (resetRequested) {
      targetPos.current = { x: dx, y: dy, z: dz };
      targetLook.current = { x: lx, y: ly, z: lz };
      targetFov.current = DEFAULT_CINEMATIC_CAMERA.fov;
      return;
    }
    if (focusedHotspot) {
      const [px, py, pz] = focusedHotspot.focusCam;
      const [tlx, tly, tlz] = focusedHotspot.lookAt;
      targetPos.current = { x: px, y: py, z: pz };
      targetLook.current = { x: tlx, y: tly, z: tlz };
      targetFov.current = DEFAULT_CINEMATIC_CAMERA.fov;
    } else {
      targetPos.current = { x: dx, y: dy, z: dz };
      targetLook.current = { x: lx, y: ly, z: lz };
      targetFov.current = DEFAULT_CINEMATIC_CAMERA.fov;
    }
  }, [focusedHotspot, isMobile, resetRequested]);

  useFrame((state) => {
    if (orbitEnabled) return;

    const tp = targetPos.current;
    const tl = targetLook.current;
    const t = state.clock.elapsedTime;
    const rise = 1 - Math.max(0, entranceProgress);
    const dollyIn = 0.4 * rise;
    const entranceZ = tp.z + dollyIn * 1.5;

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
    const pz = rise > 0 ? entranceZ : tp.z;

    const lerp = focusedHotspot ? FOCUS_CAM_LERP : CAM_LERP;
    camera.position.x += (px - camera.position.x) * lerp;
    camera.position.y += (py - camera.position.y) * lerp;
    camera.position.z += (pz - camera.position.z) * lerp;
    camera.lookAt(tl.x, tl.y, tl.z);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov += (targetFov.current - camera.fov) * FOV_LERP;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
