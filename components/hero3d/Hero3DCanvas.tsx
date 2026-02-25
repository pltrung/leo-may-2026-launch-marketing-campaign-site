"use client";

import React, { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF, Environment, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import type { HotspotDef } from "./hotspots";

export type HeroInteractionMode = "default" | "animating" | "focus";

/** Align world so climbing wall faces camera. */
const MODEL_ROTATION_FIX = Math.PI / 2;

const DESKTOP_FOV = 48;
const MOBILE_FOV = 58;

const MOBILE_CAM_FALLBACK = { position: [0, 1.2, 8] as const, fov: MOBILE_FOV };
const DEFAULT_CINEMATIC_CAMERA = {
  position: [0, 1.0, 6.8] as const,
  lookAt: [0, 1.4, -0.3] as const,
  fov: DESKTOP_FOV,
};

const MOBILE_SCALE_MULT = 1.08;
const MOBILE_HITBOX_SCALE = 2.8;
const DESKTOP_HITBOX_SCALE = 2.4;
const HALO_RADIUS = 1.8;
const HALO_INNER = 1.2;
const HOTSPOT_HOVER_SCALE = 1.02;
const ORBIT_RADIUS_FALLBACK = 4;
const SPRING_ZETA = 1;
const SPRING_OMEGA_CAMERA = 12;
const SPRING_OMEGA_WORLD = 10;
const ANIMATION_SETTLE_THRESHOLD = 0.02;
const ANIMATION_SETTLE_VEL_THRESHOLD = 0.003;
const ASCEND_CTA_Y_FRAC = 0.55;
const PILL_OFFSET_Y = 0.6;
const DEBUG_HOTSPOTS = false;

function getFocusWorldRotationY(h: HotspotDef): number {
  if (h.focusWorldRotationY !== undefined) return h.focusWorldRotationY;
  const [x, , z] = h.position;
  return x === 0 && z === 0 ? 0 : Math.atan2(x, z);
}

function springStep(
  x: number,
  v: number,
  target: number,
  omega: number,
  zeta: number,
  dt: number
): [number, number] {
  const acc = omega * omega * (target - x) - 2 * zeta * omega * v;
  const vNew = v + acc * dt;
  const xNew = x + vNew * dt;
  return [xNew, vNew];
}

function springStep3(
  x: THREE.Vector3,
  v: THREE.Vector3,
  target: THREE.Vector3,
  omega: number,
  zeta: number,
  dt: number
): void {
  const ax = omega * omega * (target.x - x.x) - 2 * zeta * omega * v.x;
  const ay = omega * omega * (target.y - x.y) - 2 * zeta * omega * v.y;
  const az = omega * omega * (target.z - x.z) - 2 * zeta * omega * v.z;
  v.x += ax * dt;
  v.y += ay * dt;
  v.z += az * dt;
  x.x += v.x * dt;
  x.y += v.y * dt;
  x.z += v.z * dt;
}

export interface BoundingInfo {
  size: THREE.Vector3;
  scale: number;
  radius: number;
  worldRadius: number;
  center: THREE.Vector3;
  homePosition: THREE.Vector3;
  homeLookAt: THREE.Vector3;
  orbitTarget: THREE.Vector3;
}

function frameScene(
  object: THREE.Object3D,
  isMobile: boolean
): {
  position: [number, number, number];
  scale: number;
  size: THREE.Vector3;
  radius: number;
  worldRadius: number;
  center: THREE.Vector3;
  homePosition: THREE.Vector3;
  homeLookAt: THREE.Vector3;
  orbitTarget: THREE.Vector3;
} {
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
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const worldRadius = sphere.radius * safeScale;
  const r = Number.isFinite(worldRadius) && worldRadius > 0 ? worldRadius : 2;
  const boundingCenter = new THREE.Vector3(0, 0, 0);
  let homePosition: THREE.Vector3;
  let homeLookAt: THREE.Vector3;
  if (isMobile) {
    const distance = r * 2.8;
    const camY = r * 0.7;
    homePosition = new THREE.Vector3(0, camY, distance);
    homeLookAt = boundingCenter.clone();
  } else {
    const distance = r * 2.4;
    homePosition = new THREE.Vector3(0, r * 0.6, distance);
    homeLookAt = new THREE.Vector3(0, r * 0.6, -r * 0.2);
  }
  return {
    position: [-center.x, -center.y, -center.z],
    scale: safeScale,
    size,
    radius: sphere.radius,
    worldRadius: r,
    center: boundingCenter,
    homePosition,
    homeLookAt,
    orbitTarget: homeLookAt.clone(),
  };
}

export interface Hero3DCanvasProps {
  worldUrl: string;
  hotspots: HotspotDef[];
  interactionMode: HeroInteractionMode;
  focusedId: string | null;
  animatingToDefault: boolean;
  hoveredHotspotId: string | null;
  isMobile: boolean;
  mouseNorm: { x: number; y: number };
  onFocus: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onCtaClick?: (href: string) => void;
  onAscendCtaClick?: () => void;
  onReady: () => void;
  onBoundingReady?: (info: BoundingInfo) => void;
  onAnimationSettled: (wasAnimatingToDefault: boolean) => void;
  userInteracting?: boolean;
  onUserInteractingChange?: (v: boolean) => void;
  debugUi?: boolean;
  showCenterPulse?: boolean;
  entranceProgress?: number;
}

export default function Hero3DCanvas(props: Hero3DCanvasProps) {
  const { isMobile } = props;
  const dpr =
    typeof window !== "undefined"
      ? (isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5))
      : 1;
  const [px, py, pz] = isMobile
    ? MOBILE_CAM_FALLBACK.position
    : DEFAULT_CINEMATIC_CAMERA.position;
  const fov = isMobile ? MOBILE_FOV : DESKTOP_FOV;

  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [px, py, pz], fov, near: 0.1, far: 1000 }}
      dpr={dpr}
      style={{ display: "block", width: "100%", height: "100%", pointerEvents: "auto" }}
    >
      <Scene {...props} />
    </Canvas>
  );
}

function Scene(props: Hero3DCanvasProps) {
  const {
    worldUrl,
    hotspots,
    interactionMode,
    focusedId,
    animatingToDefault,
    hoveredHotspotId,
    isMobile,
    onFocus,
    onHover,
    onCtaClick,
    onAscendCtaClick,
    onReady,
    onAnimationSettled,
    onUserInteractingChange,
    onBoundingReady,
    debugUi = false,
    showCenterPulse = false,
  } = props;

  const [boundingInfo, setBoundingInfo] = useState<BoundingInfo | null>(null);
  const groupRef = useRef<Group>(null);
  const hasCalledReady = useRef(false);
  const onBoundingReadyStable = useCallback((info: BoundingInfo) => {
    setBoundingInfo(info);
    onBoundingReady?.(info);
  }, [onBoundingReady]);

  const orbitEnabled = interactionMode === "default";
  const focusHotspot =
    focusedId ? hotspots.find((h) => h.id === focusedId) : null;
  const targetWorldRotationY =
    interactionMode === "animating"
      ? animatingToDefault
        ? 0
        : focusHotspot
          ? getFocusWorldRotationY(focusHotspot)
          : 0
      : interactionMode === "focus" && focusHotspot
        ? getFocusWorldRotationY(focusHotspot)
        : 0;

  const worldRotY = useRef(0);
  const worldRotVel = useRef(0);

  useFrame((state: { clock: { getDelta: () => number } }) => {
    const g = groupRef.current;
    if (!g) return;
    const dt = Math.min(state.clock.getDelta(), 0.05);
    if (
      interactionMode === "animating" ||
      (interactionMode === "focus" && focusedId)
    ) {
      let diff = targetWorldRotationY - worldRotY.current;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const [next, vNext] = springStep(
        worldRotY.current,
        worldRotVel.current,
        worldRotY.current + diff,
        SPRING_OMEGA_WORLD,
        SPRING_ZETA,
        dt
      );
      worldRotY.current = next;
      worldRotVel.current = vNext;
      g.rotation.y = worldRotY.current;
    } else {
      worldRotY.current = g.rotation.y;
      worldRotVel.current = 0;
    }
  });

  const orbitTargetVec: [number, number, number] = useMemo(() => {
    if (boundingInfo?.orbitTarget)
      return [
        boundingInfo.orbitTarget.x,
        boundingInfo.orbitTarget.y,
        boundingInfo.orbitTarget.z,
      ];
    if (boundingInfo)
      return [
        boundingInfo.homeLookAt.x,
        boundingInfo.homeLookAt.y,
        boundingInfo.homeLookAt.z,
      ];
    return [0, 1, 0];
  }, [boundingInfo]);

  const radius = boundingInfo?.worldRadius ?? ORBIT_RADIUS_FALLBACK;
  const orbitMinDist = isMobile ? radius * 1.5 : radius * 1.4;
  const orbitMaxDist = radius * 5;

  const hasSyncedControlsTarget = useRef(false);
  useFrame((state: { controls: unknown }) => {
    if (!orbitEnabled) hasSyncedControlsTarget.current = false;
    if (!boundingInfo) return;
    const controls = state.controls as unknown as
      | { target: THREE.Vector3; update: () => void }
      | undefined;
    if (orbitEnabled && controls && !hasSyncedControlsTarget.current) {
      controls.target.set(
        boundingInfo.orbitTarget.x,
        boundingInfo.orbitTarget.y,
        boundingInfo.orbitTarget.z
      );
      controls.update();
      hasSyncedControlsTarget.current = true;
    }
  });

  return (
    <>
      <color attach="background" args={["#111111"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1} />
      <Environment preset="studio" background={false} />
      {/* Invisible canary on layer 1 so it never receives rays */}
      <mesh position={[0, 0, 0]} layers={1}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshBasicMaterial color="#111111" visible={false} />
      </mesh>
      {orbitEnabled && (
        <OrbitControls
          target={orbitTargetVec}
          enablePan={false}
          enableRotate={true}
          enableZoom={true}
          minDistance={orbitMinDist}
          maxDistance={orbitMaxDist}
          minPolarAngle={0.35}
          maxPolarAngle={1.55}
          enableDamping
          dampingFactor={isMobile ? 0.08 : 0.1}
          rotateSpeed={isMobile ? 0.75 : 0.7}
          zoomSpeed={isMobile ? 0.9 : 0.75}
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
          onFocus={onFocus}
          onHover={onHover}
          onCtaClick={onCtaClick}
          onAscendCtaClick={onAscendCtaClick}
          debugUi={debugUi}
          showCenterPulse={showCenterPulse}
        />
      </group>
      <CameraController
        interactionMode={interactionMode}
        animatingToDefault={animatingToDefault}
        focusedId={focusedId}
        hotspots={hotspots}
        boundingInfo={boundingInfo}
        isMobile={isMobile}
        onAnimationSettled={onAnimationSettled}
      />
    </>
  );
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
  onFocus,
  onHover,
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
  onFocus: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onCtaClick?: (href: string) => void;
  onAscendCtaClick?: () => void;
  debugUi?: boolean;
  showCenterPulse?: boolean;
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const c = scene.clone();
    c.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        (child as THREE.Mesh).raycast = () => {};
      }
    });
    return c;
  }, [scene]);

  const framed = useMemo(
    () => frameScene(cloned, isMobile),
    [cloned, isMobile]
  );
  const {
    position,
    scale,
    size,
    worldRadius,
    center,
    homePosition,
    homeLookAt,
    orbitTarget,
  } = framed;

  useEffect(() => {
    onBoundingReady?.({
      size,
      scale,
      radius: framed.radius,
      worldRadius,
      center,
      homePosition,
      homeLookAt,
      orbitTarget,
    });
  }, [
    onBoundingReady,
    size,
    scale,
    framed.radius,
    worldRadius,
    center,
    homePosition,
    homeLookAt,
    orbitTarget,
  ]);

  useFrame(() => {
    if (hasCalledReady.current) return;
    hasCalledReady.current = true;
    onLoaded();
  });

  const ascendCtaPosition: [number, number, number] = [
    0,
    size.y * ASCEND_CTA_Y_FRAC,
    0,
  ];
  const showAscendCta = onAscendCtaClick && focusedId === "main";

  return (
    <group
      position={position}
      scale={[scale, scale, scale]}
      rotation={[0, MODEL_ROTATION_FIX, 0]}
    >
      <primitive object={cloned} />
      {hotspots.map((h) => (
        <React.Fragment key={h.id}>
          <HotspotHalo
            def={h}
            visible={hoveredHotspotId === h.id || focusedId === h.id}
            isHovered={hoveredHotspotId === h.id}
          />
          <HotspotBox
            def={h}
            isFocused={focusedId === h.id}
            isHovered={hoveredHotspotId === h.id}
            isMobile={isMobile}
            onFocus={onFocus}
            onHover={onHover}
            showDebugBox={DEBUG_HOTSPOTS || debugUi === true}
          />
          <HotspotPill
            def={h}
            show={
              (isMobile && focusedId === h.id) ||
              (!isMobile &&
                (hoveredHotspotId === h.id || focusedId === h.id))
            }
            isMobile={isMobile}
            onCtaClick={onCtaClick}
          />
        </React.Fragment>
      ))}
      {isMobile && showCenterPulse && !focusedId && (() => {
        const centerIsland = hotspots.find((h) => h.id === "main");
        return centerIsland ? (
          <CenterPulseRing position={centerIsland.position} />
        ) : null;
      })()}
      {showAscendCta && (
        <Html
          position={ascendCtaPosition}
          transform
          sprite
          center
          distanceFactor={isMobile ? 5 : 6}
          style={{
            pointerEvents: "auto",
            animation: "hero-ascend-fade-in 0.35s ease-out forwards",
          }}
        >
          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onAscendCtaClick?.();
            }}
            className={`ascend-cta-pill rounded-full bg-white/90 backdrop-blur-md text-storm font-medium border border-white/50 shadow-lg transition-transform duration-200 ${
              isMobile
                ? "px-4 py-2 text-xs scale-90 active:scale-95"
                : "px-5 py-2.5 text-sm hover:scale-[1.04] active:scale-100"
            }`}
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
            aria-label="Ascend With Us"
          >
            Ascend With Us
          </button>
        </Html>
      )}
    </group>
  );
}

function CenterPulseRing({ position: pos }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state: { clock: { elapsedTime: number } }) => {
    const m = meshRef.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const scale = 1 + 0.12 * Math.sin(t * 1.2);
    m.scale.setScalar(scale);
    const mat = m.material as THREE.MeshBasicMaterial;
    if (mat.opacity !== undefined)
      mat.opacity = 0.15 + 0.08 * Math.sin(t * 1.2);
  });
  return (
    <group
      position={[pos[0], pos[1] - 0.1, pos[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
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

function HotspotHalo({
  def,
  visible,
  isHovered,
}: {
  def: HotspotDef;
  visible: boolean;
  isHovered?: boolean;
}) {
  const [x, y, z] = def.position;
  const accent = def.accent ?? "#4FA3FF";
  if (!visible) return null;
  return (
    <group
      position={[x, y - 0.1, z]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <mesh>
        <ringGeometry args={[HALO_INNER, HALO_RADIUS, 32]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={isHovered ? 0.4 : 0.25}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

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
          onClick={(e: React.MouseEvent) => {
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
  onFocus,
  onHover,
  showDebugBox,
}: {
  def: HotspotDef;
  isFocused: boolean;
  isHovered: boolean;
  isMobile: boolean;
  onFocus: (id: string | null) => void;
  onHover: (id: string | null) => void;
  showDebugBox?: boolean;
}) {
  const [x, y, z] = def.position;
  const [sx, sy, sz] = def.size;
  const mult = isMobile ? MOBILE_HITBOX_SCALE : DESKTOP_HITBOX_SCALE;
  const lift = isHovered || isFocused ? HOTSPOT_HOVER_SCALE : 1;

  return (
    <group position={[x, y, z]} scale={[lift, lift, lift]}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onFocus(def.id);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(def.id);
          if (typeof document !== "undefined")
            document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          if (typeof document !== "undefined")
            document.body.style.cursor = "default";
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
  interactionMode,
  animatingToDefault,
  focusedId,
  hotspots,
  boundingInfo = null,
  isMobile,
  onAnimationSettled,
}: {
  interactionMode: HeroInteractionMode;
  animatingToDefault: boolean;
  focusedId: string | null;
  hotspots: HotspotDef[];
  boundingInfo?: BoundingInfo | null;
  isMobile: boolean;
  onAnimationSettled: (wasAnimatingToDefault: boolean) => void;
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));
  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const posVel = useRef(new THREE.Vector3(0, 0, 0));
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const lookVel = useRef(new THREE.Vector3(0, 0, 0));
  const defaultFov = isMobile ? MOBILE_FOV : DESKTOP_FOV;
  const targetFov = useRef(defaultFov);
  const fovVel = useRef(0);
  const hasFiredSettled = useRef(false);
  const hasInitializedFromBounds = useRef(false);

  useEffect(() => {
    if (interactionMode !== "animating") return;
    hasFiredSettled.current = false;
    if (animatingToDefault) {
      if (boundingInfo) {
        targetPos.current.set(
          boundingInfo.homePosition.x,
          boundingInfo.homePosition.y,
          boundingInfo.homePosition.z
        );
        targetLook.current.set(
          boundingInfo.homeLookAt.x,
          boundingInfo.homeLookAt.y,
          boundingInfo.homeLookAt.z
        );
      } else {
        const fallback = isMobile
          ? MOBILE_CAM_FALLBACK
          : DEFAULT_CINEMATIC_CAMERA;
        targetPos.current.set(
          fallback.position[0],
          fallback.position[1],
          fallback.position[2]
        );
        targetLook.current.set(
          DEFAULT_CINEMATIC_CAMERA.lookAt[0],
          DEFAULT_CINEMATIC_CAMERA.lookAt[1],
          DEFAULT_CINEMATIC_CAMERA.lookAt[2]
        );
      }
      targetFov.current = defaultFov;
    } else if (focusedId) {
      const hotspot = hotspots.find((h) => h.id === focusedId);
      if (hotspot) {
        const [px, py, pz] = hotspot.focusCam;
        const [lx, ly, lz] = hotspot.lookAt;
        targetPos.current.set(px, py, pz);
        targetLook.current.set(lx, ly, lz);
        targetFov.current = defaultFov;
      }
    }
    pos.current.copy(camera.position);
    look.current.copy(targetLook.current);
    posVel.current.set(0, 0, 0);
    lookVel.current.set(0, 0, 0);
    fovVel.current = 0;
  }, [
    interactionMode,
    animatingToDefault,
    focusedId,
    hotspots,
    boundingInfo,
    isMobile,
    defaultFov,
    camera,
  ]);

  useFrame((state: { clock: { getDelta: () => number } }) => {
    if (boundingInfo && !hasInitializedFromBounds.current) {
      hasInitializedFromBounds.current = true;
      camera.position.copy(boundingInfo.homePosition);
      camera.lookAt(boundingInfo.homeLookAt);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = defaultFov;
        camera.updateProjectionMatrix();
      }
    }

    if (interactionMode !== "animating") return;

    const dt = Math.min(state.clock.getDelta(), 0.05);
    const tp = targetPos.current;
    const tl = targetLook.current;

    springStep3(pos.current, posVel.current, tp, SPRING_OMEGA_CAMERA, SPRING_ZETA, dt);
    springStep3(look.current, lookVel.current, tl, SPRING_OMEGA_CAMERA, SPRING_ZETA, dt);

    camera.position.copy(pos.current);
    camera.lookAt(look.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      const [fovNext, fovVNext] = springStep(
        camera.fov,
        fovVel.current,
        targetFov.current,
        SPRING_OMEGA_CAMERA,
        SPRING_ZETA,
        dt
      );
      camera.fov = fovNext;
      fovVel.current = fovVNext;
      camera.updateProjectionMatrix();
    }

    const dist = pos.current.distanceTo(tp);
    const velMag = posVel.current.length();
    if (
      dist < ANIMATION_SETTLE_THRESHOLD &&
      velMag < ANIMATION_SETTLE_VEL_THRESHOLD &&
      !hasFiredSettled.current
    ) {
      hasFiredSettled.current = true;
      camera.position.copy(tp);
      camera.lookAt(tl.x, tl.y, tl.z);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = targetFov.current;
        camera.updateProjectionMatrix();
      }
      onAnimationSettled(animatingToDefault);
    }
  });

  return null;
}
