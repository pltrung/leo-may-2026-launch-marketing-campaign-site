"use client";

import React, { useRef, useMemo, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import type { HotspotDef } from "./hotspots";

/** Single source of truth for camera, controls, and UI. Exported for Hero3D. */
export type HeroInteractionMode = "default" | "animating" | "focus";

/** Rotate worldGroup so climbing wall faces camera. */
const MODEL_ROTATION_FIX = Math.PI / 2;

// ---------- Experience constants (intentional motion, no patches) ----------
/** Desktop: 45–50 for composition. */
const DESKTOP_FOV = 48;
/** Mobile: wider FOV so all islands visible. */
const MOBILE_FOV = 58;

const DEFAULT_CINEMATIC_CAMERA = {
  position: [0, 1.0, 6.8] as const,
  lookAt: [0, 1.4, -0.3] as const,
  fov: DESKTOP_FOV,
};

const MOBILE_CAM_FALLBACK = { position: [0, 1.2, 8] as const, fov: MOBILE_FOV };

/** Vision Pro–style: deterministic framing from radius r only. */
const FRAME_TARGET_UP = 0.2;
const FRAME_POS_UP = 0.9;
const FRAME_POS_FORWARD = 2.7;

/** Critically damped spring: ζ=1, ω in [10,14]. */
const SPRING_ZETA = 1;
const SPRING_OMEGA_CAMERA = 12;
const SPRING_OMEGA_WORLD = 10;
const SPRING_OMEGA_PARALLAX = 11;

/** Island breathing: A=0.03r, A2=0.01r, second freq 0.13. */
const BREATH_A_FAC = 0.03;
const BREATH_A2_FAC = 0.01;
const BREATH_OMEGA = 0.5;
const BREATH_OMEGA2 = 0.13;

/** Desktop parallax: kx~0.1r, ky~0.07r. */
const PARALLAX_KX = 0.1;
const PARALLAX_KY = 0.07;

function islandPhase(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return (h % 100) / 100 * Math.PI * 2;
}
function islandPhase2(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 3) + h + id.charCodeAt(i);
  return (h % 100) / 100 * Math.PI * 2;
}
/** Click vs drag: only treat as island click when release within time and movement. */
const CLICK_MAX_MS = 260;
const CLICK_MAX_DIST_PX = 10;

/** Mobile: 2x hitbox for reliable tap. */
const MOBILE_HITBOX_SCALE = 2.5;
const DESKTOP_HITBOX_SCALE = 2.0;
const MOBILE_SCALE_MULT = 1.08;
const HALO_RADIUS = 1.8;
const HALO_INNER = 1.2;
const HOTSPOT_HOVER_SCALE = 1.02;

/** Orbit limits when bounding not yet available. */
const ORBIT_RADIUS_FALLBACK = 4;
const ANIMATION_SETTLE_THRESHOLD = 0.015;
const ANIMATION_SETTLE_VEL_THRESHOLD = 0.002;

/** Get world group rotation Y so this island faces camera. */
function getFocusWorldRotationY(h: HotspotDef): number {
  if (h.focusWorldRotationY !== undefined) return h.focusWorldRotationY;
  const [x, , z] = h.position;
  return x === 0 && z === 0 ? 0 : Math.atan2(x, z);
}

/** Critically damped spring step (ζ=1). Returns new x, new v. */
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

/** 3D spring step for Vector3 position. */
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

/** Hitboxes shown only when ?debug=1 (debugUi). Set true to always show for development. */
const DEBUG_HOTSPOTS = false;

export interface Hero3DCanvasProps {
  worldUrl: string;
  hotspots: HotspotDef[];
  /** Single source of truth: default (orbit) | animating (lerp) | focus (static). */
  interactionMode: HeroInteractionMode;
  focusedId: string | null;
  /** When interactionMode === "animating", true = transitioning to default view. */
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
  /** Called when focus/default animation has settled; arg = true if we transitioned to default. */
  onAnimationSettled: (wasAnimatingToDefault: boolean) => void;
  userInteracting?: boolean;
  onUserInteractingChange?: (v: boolean) => void;
  debugUi?: boolean;
  showCenterPulse?: boolean;
  entranceProgress?: number;
  /** Debug: report GLB load status for HUD. */
  onGlbStatus?: (status: "loading" | "loaded" | "error") => void;
  /** Debug: report bounding/camera for HUD. */
  onDebugInfo?: (info: {
    radius?: number;
    cameraPos?: [number, number, number];
    center?: [number, number, number];
    size?: [number, number, number];
  }) => void;
}

export default function Hero3DCanvas(props: Hero3DCanvasProps) {
  const { isMobile } = props;
  const dpr = typeof window !== "undefined"
    ? (isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5))
    : 1;
  const [px, py, pz] = isMobile ? MOBILE_CAM_FALLBACK.position : DEFAULT_CINEMATIC_CAMERA.position;
  const fov = isMobile ? MOBILE_FOV : DESKTOP_FOV;

  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0x111111, 1);
        gl.setClearAlpha(1);
        scene.background = new THREE.Color(0x111111);
      }}
      dpr={[1, dpr]}
      camera={{
        position: [px, py, pz],
        fov,
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


type PendingClick = { id: string; downTime: number; downX: number; downY: number; cancelled: boolean };

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
    onBoundingReady,
    onAnimationSettled,
    userInteracting = false,
    onUserInteractingChange,
    debugUi = false,
    showCenterPulse = false,
    entranceProgress = 1,
    onGlbStatus,
    onDebugInfo,
  } = props;

  if (typeof window !== "undefined") {
    console.log("[Hero3D] resolved GLB URL:", worldUrl);
  }
  const groupRef = useRef<Group>(null);
  const pendingClickRef = useRef<PendingClick | null>(null);

  const onIslandPointerDown = useCallback(
    (id: string, clientX: number, clientY: number) => {
      const downTime = Date.now();
      pendingClickRef.current = { id, downTime, downX: clientX, downY: clientY, cancelled: false };
      const onMove = (e: PointerEvent) => {
        if (!pendingClickRef.current || pendingClickRef.current.id !== id) return;
        const dx = e.clientX - pendingClickRef.current.downX;
        const dy = e.clientY - pendingClickRef.current.downY;
        if (dx * dx + dy * dy > CLICK_MAX_DIST_PX * CLICK_MAX_DIST_PX) pendingClickRef.current.cancelled = true;
      };
      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        const pending = pendingClickRef.current;
        pendingClickRef.current = null;
        if (pending && !pending.cancelled && Date.now() - pending.downTime < CLICK_MAX_MS) {
          onFocus(pending.id);
        }
      };
      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerup", onUp, { passive: true });
    },
    [onFocus]
  );
  const hasCalledReady = useRef(false);
  const [boundingInfo, setBoundingInfo] = useState<BoundingInfo | null>(null);
  const [cameraFramed, setCameraFramed] = useState(false);
  const { camera } = useThree();
  const onBoundingReadyStable = useCallback((info: BoundingInfo) => setBoundingInfo(info), []);

  // Initial camera: apply whenever bounding is ready. Fallback if radius is NaN/0.
  useLayoutEffect(() => {
    if (!boundingInfo) return;
    const r = boundingInfo.worldRadius;
    const validRadius = Number.isFinite(r) && r > 0;
    if (!validRadius) {
      camera.position.set(0, 2, 7);
      camera.lookAt(0, 1, 0);
      if (camera instanceof THREE.PerspectiveCamera) camera.updateProjectionMatrix();
      console.warn("[Hero3D] invalid bounding radius, using fallback camera", { radius: r, center: boundingInfo.center, size: boundingInfo.size });
      onDebugInfo?.({
        radius: r,
        cameraPos: [0, 2, 7],
        center: [boundingInfo.center.x, boundingInfo.center.y, boundingInfo.center.z],
        size: [boundingInfo.size.x, boundingInfo.size.y, boundingInfo.size.z],
      });
      onGlbStatus?.("loaded");
      return;
    }
    camera.position.copy(boundingInfo.homePosition);
    camera.lookAt(boundingInfo.homeLookAt.x, boundingInfo.homeLookAt.y, boundingInfo.homeLookAt.z);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.updateProjectionMatrix();
    }
    const centerArr: [number, number, number] = [boundingInfo.center.x, boundingInfo.center.y, boundingInfo.center.z];
    const sizeArr: [number, number, number] = [boundingInfo.size.x, boundingInfo.size.y, boundingInfo.size.z];
    console.log("[Hero3D] boundingInfo", {
      center: centerArr,
      size: sizeArr,
      radius: boundingInfo.radius,
      worldRadius: boundingInfo.worldRadius,
      homePosition: boundingInfo.homePosition.toArray(),
    });
    onDebugInfo?.({
      radius: boundingInfo.worldRadius,
      cameraPos: [camera.position.x, camera.position.y, camera.position.z],
      center: centerArr,
      size: sizeArr,
    });
    onGlbStatus?.("loaded");
  }, [boundingInfo, camera, debugUi, onDebugInfo, onGlbStatus]);

  const hasFramedRef = useRef(false);
  useFrame(() => {
    if (boundingInfo && !hasFramedRef.current) {
      hasFramedRef.current = true;
      setCameraFramed(true);
    }
  });

  const orbitEnabled = interactionMode === "default";
  const hotspotDef: HotspotDef | null =
    focusedId && !animatingToDefault ? (hotspots.find((h) => h.id === focusedId) ?? null) : null;
  const focusHotspotForRotation =
    focusedId ? hotspots.find((h) => h.id === focusedId) : null;
  const targetWorldRotationY =
    interactionMode === "animating"
      ? animatingToDefault
        ? 0
        : focusHotspotForRotation
          ? getFocusWorldRotationY(focusHotspotForRotation)
          : 0
      : interactionMode === "focus" && focusHotspotForRotation
        ? getFocusWorldRotationY(focusHotspotForRotation)
        : 0;

  const worldRotY = useRef(0);
  const worldRotVel = useRef(0);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const dt = Math.min(state.clock.getDelta(), 0.05);
    if (interactionMode === "animating" || (interactionMode === "focus" && focusedId)) {
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
    if (boundingInfo?.orbitTarget) return [boundingInfo.orbitTarget.x, boundingInfo.orbitTarget.y, boundingInfo.orbitTarget.z];
    if (boundingInfo) return [boundingInfo.homeLookAt.x, boundingInfo.homeLookAt.y, boundingInfo.homeLookAt.z];
    return [0, 1, 0];
  }, [boundingInfo]);
  const radius = boundingInfo?.worldRadius ?? ORBIT_RADIUS_FALLBACK;
  const orbitMinDist = isMobile ? radius * 1.5 : radius * 1.4;
  const orbitMaxDist = radius * 5;

  const parallaxOffset = useRef(new THREE.Vector3(0, 0, 0));
  const parallaxVel = useRef(new THREE.Vector3(0, 0, 0));
  const parallaxPrev = useRef(new THREE.Vector3(0, 0, 0));

  // Parallax: skip applying to camera so initial framing is never overwritten (fixes black screen).
  useFrame((state) => {
    if (orbitEnabled && !isMobile && boundingInfo && radius > 0) {
      const dt = Math.min(state.clock.getDelta(), 0.05);
      const { mouseNorm } = props;
      const target = new THREE.Vector3(
        mouseNorm.x * PARALLAX_KX * radius,
        mouseNorm.y * PARALLAX_KY * radius,
        0
      );
      springStep3(
        parallaxOffset.current,
        parallaxVel.current,
        target,
        SPRING_OMEGA_PARALLAX,
        SPRING_ZETA,
        dt
      );
      parallaxPrev.current.copy(parallaxOffset.current);
      // Do not apply to camera: cam.position.sub/add was overwriting initial camera and causing black screen.
    } else {
      parallaxPrev.current.set(0, 0, 0);
      parallaxOffset.current.set(0, 0, 0);
      parallaxVel.current.set(0, 0, 0);
    }
  }, 1);

  const hasSetControlsTargetRef = useRef(false);
  const debugFrameCount = useRef(0);
  useFrame((state) => {
    if (boundingInfo) {
      const controls = state.controls as { target: THREE.Vector3; update: () => void } | undefined;
      if (orbitEnabled && controls && !hasSetControlsTargetRef.current) {
        controls.target.set(
          boundingInfo.orbitTarget.x,
          boundingInfo.orbitTarget.y,
          boundingInfo.orbitTarget.z
        );
        controls.update();
        hasSetControlsTargetRef.current = true;
      }
      if (onDebugInfo) {
        debugFrameCount.current += 1;
        if (debugFrameCount.current % 30 === 0) {
          const cam = state.camera;
          onDebugInfo({
            radius: boundingInfo.worldRadius,
            cameraPos: [cam.position.x, cam.position.y, cam.position.z],
            center: [boundingInfo.center.x, boundingInfo.center.y, boundingInfo.center.z],
            size: [boundingInfo.size.x, boundingInfo.size.y, boundingInfo.size.z],
          });
        }
      }
    }
  });

  return (
    <>
      <color attach="background" args={["#111111"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.0} />
      {!isMobile && <Environment preset="studio" background={false} />}
      <axesHelper args={[2]} />
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshBasicMaterial color="white" />
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
          onIslandPointerDown={onIslandPointerDown}
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

export interface BoundingInfo {
  size: THREE.Vector3;
  scale: number;
  radius: number;
  /** World-space radius (radius * scale). */
  worldRadius: number;
  /** World-space center (after centering) = origin. */
  center: THREE.Vector3;
  /** Default camera: pos = target + up*0.9r + forward*2.7r. */
  homePosition: THREE.Vector3;
  /** LookAt = target = center + up*0.2r. */
  homeLookAt: THREE.Vector3;
  /** OrbitControls target = center + up*0.2r. */
  orbitTarget: THREE.Vector3;
}

/**
 * Deterministic framing from bounds only. Compute bounds → center world → use r.
 * target = center + up*(0.2r), pos = target + up*(0.9r) + forward*(2.7r). No magic numbers.
 */
function frameScene(
  object: THREE.Object3D,
  isMobile: boolean
): { position: [number, number, number]; scale: number; size: THREE.Vector3; radius: number; worldRadius: number; center: THREE.Vector3; homePosition: THREE.Vector3; homeLookAt: THREE.Vector3; orbitTarget: THREE.Vector3 } {
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
  const rawR = sphere.radius * scale;
  const r = Number.isFinite(rawR) && rawR > 0 ? rawR : 2;
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const up = new THREE.Vector3(0, 1, 0);
  const forward = new THREE.Vector3(0, 0, 1);
  const target = up.clone().multiplyScalar(FRAME_TARGET_UP * r);
  const orbitTarget = target.clone();
  const homeLookAt = target.clone();
  const homePosition = target
    .clone()
    .add(up.clone().multiplyScalar(FRAME_POS_UP * r))
    .add(forward.clone().multiplyScalar(FRAME_POS_FORWARD * r));
  return {
    position: [-center.x, -center.y, -center.z],
    scale: safeScale,
    size,
    radius: sphere.radius,
    worldRadius: r,
    center: new THREE.Vector3(0, 0, 0),
    homePosition,
    homeLookAt,
    orbitTarget,
  };
}

/** Ascend CTA: fraction of bounding size.y for center-island top. Tune if needed. */
const ASCEND_CTA_Y_FRAC = 0.55;

/** Ambient hover: y(t)=A*sin(wt+phi)+A2*sin(0.13t+phi2), A=0.03r, A2=0.01r. Camera never floats. */
function IslandBreathingGroup({
  worldRadius,
  phase,
  phase2,
  children,
}: {
  worldRadius: number;
  phase: number;
  phase2: number;
  children: React.ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const A = BREATH_A_FAC * worldRadius;
    const A2 = BREATH_A2_FAC * worldRadius;
    g.position.y = A * Math.sin(BREATH_OMEGA * t + phase) + A2 * Math.sin(BREATH_OMEGA2 * t + phase2);
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
  onIslandPointerDown,
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
  onIslandPointerDown: (id: string, clientX: number, clientY: number) => void;
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
  const { position, scale, size, radius, worldRadius, center, homePosition, homeLookAt, orbitTarget } = framed;

  useEffect(() => {
    onBoundingReady?.({ size, scale, radius, worldRadius, center, homePosition, homeLookAt, orbitTarget });
  }, [onBoundingReady, size, scale, radius, worldRadius, center, homePosition, homeLookAt, orbitTarget]);

  useFrame(() => {
    if (hasCalledReady.current) return;
    hasCalledReady.current = true;
    onLoaded();
  });

  const ascendCtaPosition: [number, number, number] = [0, size.y * ASCEND_CTA_Y_FRAC, 0];
  const showAscendCta = onAscendCtaClick && focusedId === "main";

  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, MODEL_ROTATION_FIX, 0]}>
      <primitive object={cloned} />
      {hotspots.map((h) => (
        <IslandBreathingGroup
          key={h.id}
          worldRadius={worldRadius}
          phase={islandPhase(h.id)}
          phase2={islandPhase2(h.id)}
        >
          <HotspotHalo def={h} visible={hoveredHotspotId === h.id || focusedId === h.id} isHovered={hoveredHotspotId === h.id} />
          <HotspotBox
            def={h}
            isFocused={focusedId === h.id}
            isHovered={hoveredHotspotId === h.id}
            isMobile={isMobile}
            onHover={onHover}
            onIslandPointerDown={onIslandPointerDown}
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
      {isMobile && showCenterPulse && !focusedId && (() => {
        const centerIsland = hotspots.find((h) => h.id === "main");
        return centerIsland ? <CenterPulseRing position={centerIsland.position} /> : null;
      })()}
      {showAscendCta && (
        <Html
          position={ascendCtaPosition}
          transform
          sprite
          center
          distanceFactor={isMobile ? 5 : 6}
          style={{ pointerEvents: "auto", animation: "hero-ascend-fade-in 0.35s ease-out forwards" }}
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
function HotspotHalo({ def, visible, isHovered }: { def: HotspotDef; visible: boolean; isHovered?: boolean }) {
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
          opacity={isHovered ? 0.4 : 0.25}
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
  onIslandPointerDown,
  showDebugBox,
}: {
  def: HotspotDef;
  isFocused: boolean;
  isHovered: boolean;
  isMobile: boolean;
  onHover: (id: string | null) => void;
  onIslandPointerDown: (id: string, clientX: number, clientY: number) => void;
  showDebugBox?: boolean;
}) {
  const [x, y, z] = def.position;
  const [sx, sy, sz] = def.size;
  const mult = isMobile ? MOBILE_HITBOX_SCALE : DESKTOP_HITBOX_SCALE;
  const lift = isHovered || isFocused ? HOTSPOT_HOVER_SCALE : 1;

  return (
    <group position={[x, y, z]} scale={[lift, lift, lift]}>
      <mesh
        onPointerDown={(e) => {
          const ev = e.nativeEvent;
          onIslandPointerDown(def.id, ev.clientX, ev.clientY);
          if (showDebugBox) console.log("[Hero] pointer down island:", def.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(def.id);
          document.body.style.cursor = "pointer";
          if (showDebugBox) console.log("[Hero] hover island:", def.id, def.label);
        }}
        onPointerOut={() => {
          onHover(null);
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
        const fallback = isMobile ? MOBILE_CAM_FALLBACK : DEFAULT_CINEMATIC_CAMERA;
        targetPos.current.set(fallback.position[0], fallback.position[1], fallback.position[2]);
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
  }, [interactionMode, animatingToDefault, focusedId, hotspots, boundingInfo, isMobile, defaultFov, camera]);

  useFrame((state) => {
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
