"use client";

import React, { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import type { HotspotDef } from "./hotspots";

/** Rotate worldGroup so climbing wall faces camera. Try Math.PI/2 or -Math.PI/2 if holds not front. */
const MODEL_ROTATION_FIX = Math.PI / 2;

/** Desktop camera preset fallback when bounding not yet available. */
const DESKTOP_CAM_FALLBACK = { position: [0, 1.2, 6.8] as const, fov: 35 };
/** Mobile fallback when bounding not yet available. */
const MOBILE_CAM_FALLBACK = { position: [0, 1.5, 5.6] as const, fov: 50 };
/** Desktop: camera.position.set(0, size.y*scale*Y, size.z*scale*Z), lookAt(0, size.y*scale*0.5, 0). */
const DESKTOP_CAM_Y_POS_MULT = 0.7;
const DESKTOP_CAM_Z_POS_MULT = 1.8;
const DESKTOP_LOOKAT_Y_MULT = 0.5;
const DESKTOP_FOV = 35;
/** Mobile: same pattern; tune multipliers if needed. */
const MOBILE_CAM_Y_POS_MULT = 0.9;
const MOBILE_CAM_Z_POS_MULT = 2.3;
const MOBILE_CAM_LOOKAT_Y_MULT = 0.5;
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

/** OrbitControls: small range so wall stays facing camera. */
const ORBIT_MIN_DISTANCE = 5.2;
const ORBIT_MAX_DISTANCE = 8.5;
const ORBIT_MIN_POLAR = 0.9;
const ORBIT_MAX_POLAR = 1.35;
const ORBIT_MIN_AZIMUTH = -0.25;
const ORBIT_MAX_AZIMUTH = 0.25;
const ORBIT_ROTATE_SPEED = 0.5;

/** TODO: set to false before production. When true (or debugUi), show hotspot hitboxes. */
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
}

export default function Hero3DCanvas(props: Hero3DCanvasProps) {
  const { isMobile } = props;
  const dpr = typeof window !== "undefined"
    ? (isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5))
    : 1;
  const initialCam = isMobile ? MOBILE_CAM_FALLBACK : DESKTOP_CAM_FALLBACK;

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
        far: 1000,
      }}
      style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
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
    onAscendCtaClick,
    cameraFocusMainWall = false,
    onReady,
    onBoundingReady,
    userInteracting = false,
    onUserInteractingChange,
    debugUi = false,
    resetViewTrigger = 0,
  } = props;
  const groupRef = useRef<Group>(null);
  const hasCalledReady = useRef(false);
  const [boundingInfo, setBoundingInfo] = useState<BoundingInfo | null>(null);
  const [resetRequested, setResetRequested] = useState(false);
  const { scene, camera } = useThree();
  const onBoundingReadyStable = useCallback((info: BoundingInfo) => setBoundingInfo(info), []);

  useEffect(() => {
    scene.background = new THREE.Color(SCENE_BG);
  }, [scene]);

  useEffect(() => {
    if (boundingInfo) {
      camera.position.copy(boundingInfo.homePosition);
      camera.lookAt(0, 0, 0);
    }
  }, [boundingInfo, camera]);

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
    if (userInteracting) return;
    const t = state.clock.elapsedTime;
    g.position.y = FLOAT_AMP * Math.sin(t * FLOAT_FREQ);
    g.scale.setScalar(1 + BREATHE_AMP * Math.sin(t * BREATHE_FREQ));
  });

  const hotspotDef: HotspotDef | null = focusedId ? (hotspots.find((h) => h.id === focusedId) ?? null) : null;
  const orbitEnabled = !hotspotDef && !cameraFocusMainWall && !resetRequested;

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
      {orbitEnabled && boundingInfo && (
        <OrbitControls
          target={[0, 0, 0]}
          enablePan={isMobile ? false : true}
          enableRotate={true}
          enableZoom={true}
          minDistance={boundingInfo.radius * boundingInfo.scale * 0.45}
          maxDistance={boundingInfo.radius * boundingInfo.scale * 2.6}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI * 0.45}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={isMobile ? 0.55 : 0.75}
          zoomSpeed={isMobile ? 0.7 : 1}
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
      />
    </>
  );
}

export interface BoundingInfo {
  size: THREE.Vector3;
  scale: number;
  radius: number;
  /** World-space center (after centering) = origin. */
  center: THREE.Vector3;
  /** Camera home position so full world fits with padding; target = center. */
  homePosition: THREE.Vector3;
}

/** Multiplier on bounding radius for camera distance so full world fits with padding. */
const FRAME_PADDING = 2.2;
/** Slight height offset for home camera (above center). */
const HOME_HEIGHT_FRAC = 0.12;

/**
 * Center the world at origin and scale to fit based on bounding box.
 * Returns size, radius, and camera home position so entire world is visible.
 */
function frameScene(
  object: THREE.Object3D,
  isMobile: boolean
): { position: [number, number, number]; scale: number; size: THREE.Vector3; radius: number; center: THREE.Vector3; homePosition: THREE.Vector3 } {
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
  const distance = worldRadius * FRAME_PADDING;
  const homePosition = new THREE.Vector3(0, worldRadius * HOME_HEIGHT_FRAC, distance);
  return {
    position: [-center.x, -center.y, -center.z],
    scale,
    size,
    radius: sphere.radius,
    center: new THREE.Vector3(0, 0, 0),
    homePosition,
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
  onAscendCtaClick,
  debugUi,
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
  const { position, scale, size, radius, center, homePosition } = framed;

  useEffect(() => {
    onBoundingReady?.({ size, scale, radius, center, homePosition });
  }, [onBoundingReady, size, scale, radius, center, homePosition]);

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
            showDebugBox={DEBUG_HOTSPOTS || debugUi === true}
          />
          <HotspotPill
            def={h}
            show={(isMobile && focusedId === h.id) || (!isMobile && (hoveredHotspotId === h.id || focusedId === h.id))}
            isMobile={isMobile}
            onCtaClick={onCtaClick}
          />
        </React.Fragment>
      ))}
      {onAscendCtaClick && !focusedId && (
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
}: {
  focusedHotspot: HotspotDef | null;
  isMobile: boolean;
  mouseNorm: { x: number; y: number };
  orbitEnabled: boolean;
  userInteracting: boolean;
  boundingInfo: BoundingInfo | null;
  cameraFocusMainWall?: boolean;
  resetRequested?: boolean;
}) {
  const { camera } = useThree();
  const targetPos = useRef({ x: 0, y: 0, z: 0 });
  const targetLook = useRef({ x: 0, y: 0, z: 0 });
  const targetFov = useRef(isMobile ? MOBILE_FOV : DESKTOP_FOV);
  useEffect(() => {
    if (resetRequested && boundingInfo) {
      targetPos.current = {
        x: boundingInfo.homePosition.x,
        y: boundingInfo.homePosition.y,
        z: boundingInfo.homePosition.z,
      };
      targetLook.current = { x: 0, y: 0, z: 0 };
      targetFov.current = isMobile ? MOBILE_FOV : DESKTOP_FOV;
      return;
    }
    if (focusedHotspot) {
      const [px, py, pz] = focusedHotspot.focusCam;
      const [lx, ly, lz] = focusedHotspot.lookAt;
      targetPos.current = { x: px, y: py, z: pz };
      targetLook.current = { x: lx, y: ly, z: lz };
      targetFov.current = isMobile ? MOBILE_FOV : DESKTOP_FOV;
    } else if (boundingInfo) {
      const { size, scale } = boundingInfo;
      const wy = size.y * scale;
      const wz = size.z * scale;
      const lookY = wy * (isMobile ? MOBILE_CAM_LOOKAT_Y_MULT : DESKTOP_LOOKAT_Y_MULT);
      targetLook.current = { x: 0, y: lookY, z: 0 };
      targetFov.current = isMobile ? MOBILE_FOV : DESKTOP_FOV;
      if (isMobile) {
        targetPos.current = {
          x: 0,
          y: wy * MOBILE_CAM_Y_POS_MULT,
          z: wz * MOBILE_CAM_Z_POS_MULT,
        };
      } else {
        targetPos.current = {
          x: 0,
          y: wy * DESKTOP_CAM_Y_POS_MULT,
          z: wz * DESKTOP_CAM_Z_POS_MULT,
        };
      }
    } else if (isMobile) {
      const preset = MOBILE_CAM_FALLBACK;
      targetPos.current = { x: preset.position[0], y: preset.position[1], z: preset.position[2] };
      targetLook.current = { x: DEFAULT_LOOKAT[0], y: DEFAULT_LOOKAT[1], z: DEFAULT_LOOKAT[2] };
      targetFov.current = MOBILE_FOV;
    } else {
      const preset = DESKTOP_CAM_FALLBACK;
      targetPos.current = { x: preset.position[0], y: preset.position[1], z: preset.position[2] };
      targetLook.current = { x: DEFAULT_LOOKAT[0], y: DEFAULT_LOOKAT[1], z: DEFAULT_LOOKAT[2] };
      targetFov.current = DESKTOP_FOV;
    }
  }, [focusedHotspot, isMobile, boundingInfo, resetRequested]);

  useFrame((state) => {
    const tp = targetPos.current;
    const tl = targetLook.current;
    const t = state.clock.elapsedTime;

    if (orbitEnabled) return;

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
