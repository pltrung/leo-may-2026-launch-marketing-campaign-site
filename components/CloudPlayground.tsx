"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import { motion } from "framer-motion";
import SafeImg from "@/components/SafeImg";
import type { CloudState, CloudLayer } from "@/lib/cloudPhysics";
import {
  createClouds,
  stepClouds,
  type Viewport,
  type NoSpawnRect,
} from "@/lib/cloudPhysics";

const LONG_PRESS_MS = 150;
const CLOUD_FADE_MS = 180;
const BOB_AMPLITUDE = 4;
const BOB_PERIOD_MS = 4000;
const MOBILE_BREAKPOINT = 768;

/** Full cloud SVGs from downloads (cloud with eyes) — used as the cloud body. Eye fill #0242FF is replaced at runtime with cloud.eyeColor. */
const CLOUD_LEFT_SRC = "/brand/cloud-eyes-left.svg";
const CLOUD_RIGHT_SRC = "/brand/cloud-eyes-right.svg";

const EYE_FILL_ORIGINAL = "#0242FF";

function svgToDataUrl(svgText: string, eyeColor: string): string {
  const filled = svgText.replace(new RegExp(EYE_FILL_ORIGINAL.replace("#", "\\#"), "g"), eyeColor);
  return "data:image/svg+xml," + encodeURIComponent(filled);
}

/** Chicken-pox entrance: clouds appear one by one, fast (after Explore button fade-in). */
const CLOUD_ENTRANCE_BASE_DELAY_S = 0.5;
const CLOUD_ENTRANCE_STAGGER_S = 0.048;
const CLOUD_ENTRANCE_DURATION_S = 0.22;

interface CloudPlaygroundProps {
  /** When true, freeze physics and fade out (e.g. Explore clicked) */
  freeze: boolean;
  reduceMotion?: boolean;
  /** Called once when the user starts dragging a cloud (mouse drag or touch long-press + drag). */
  onFirstDrag?: () => void;
  /** Called with a random cloud position so the drag hint arrow can point at it. */
  onHintTarget?: (x: number, y: number) => void;
}

export default function CloudPlayground({ freeze, reduceMotion = false, onFirstDrag, onHintTarget }: CloudPlaygroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cloudsRef = useRef<CloudState[]>([]);
  const viewportRef = useRef<Viewport>({ width: 800, height: 600 });
  const noSpawnRef = useRef<NoSpawnRect>({ cx: 400, cy: 300, halfW: 80, halfH: 32 });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const pointerIdRef = useRef<number | null>(null);
  const dragCloudIdRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });
  const [clouds, setClouds] = useState<CloudState[]>([]);
  const [fadeOut, setFadeOut] = useState(false);
  const [dragState, setDragState] = useState<{ id: number; startX: number; startY: number } | null>(null);
  const hasFiredFirstDragRef = useRef(false);
  const hasReportedHintTargetRef = useRef(false);
  const [leftSvgText, setLeftSvgText] = useState<string | null>(null);
  const [rightSvgText, setRightSvgText] = useState<string | null>(null);

  const isMobile = typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : true;
  const cloudCount = useMemo(
    () => (isMobile ? 7 + Math.floor(Math.random() * 5) : 12 + Math.floor(Math.random() * 7)),
    []
  );
  const sizeMin = isMobile ? 70 : 90;
  const sizeMax = isMobile ? 140 : 200;

  const initClouds = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    viewportRef.current = { width: vw, height: vh };
    const halfW = isMobile ? Math.min(90, Math.floor(vw * 0.22)) : 165;
    const halfH = isMobile ? Math.min(44, Math.floor(vh * 0.06)) : 72;
    noSpawnRef.current = { cx: vw / 2, cy: vh / 2, halfW, halfH };
    cloudsRef.current = createClouds(
      cloudCount,
      viewportRef.current,
      noSpawnRef.current,
      sizeMin,
      sizeMax,
      isMobile
    );
    setClouds([...cloudsRef.current]);
  }, [cloudCount, sizeMin, sizeMax, isMobile]);

  useEffect(() => {
    if (!onHintTarget || clouds.length === 0 || hasReportedHintTargetRef.current) return;
    hasReportedHintTargetRef.current = true;
    const c = clouds[Math.floor(Math.random() * clouds.length)];
    onHintTarget(c.x, c.y);
  }, [clouds, onHintTarget]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch(CLOUD_LEFT_SRC)
      .then((r) => r.text())
      .then(setLeftSvgText)
      .catch(() => {});
    fetch(CLOUD_RIGHT_SRC)
      .then((r) => r.text())
      .then(setRightSvgText)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    initClouds();
    const ro = new ResizeObserver(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      viewportRef.current = { width: vw, height: vh };
      const mobile = vw < MOBILE_BREAKPOINT;
      noSpawnRef.current = {
        cx: vw / 2,
        cy: vh / 2,
        halfW: mobile ? Math.min(90, Math.floor(vw * 0.22)) : 165,
        halfH: mobile ? Math.min(44, Math.floor(vh * 0.06)) : 72,
      };
    });
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [initClouds]);

  useEffect(() => {
    if (freeze) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setFadeOut(true);
      return;
    }
  }, [freeze]);

  const tick = useCallback(
    (now: number) => {
      const dt = Math.min(now - lastTimeRef.current, 50);
      lastTimeRef.current = now;
      if (dragCloudIdRef.current != null) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      frameRef.current += 1;
      stepClouds(cloudsRef.current, viewportRef.current, dt, {
        drift: false,
        frame: frameRef.current,
      });
      setClouds((prev) => {
        if (prev.length !== cloudsRef.current.length) return prev;
        return [...cloudsRef.current];
      });
      rafRef.current = requestAnimationFrame(tick);
    },
    [reduceMotion]
  );

  useEffect(() => {
    if (freeze || clouds.length === 0) return;
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [freeze, clouds.length, tick]);

  const getBobOffset = useCallback((phase: number, t: number) => {
    if (reduceMotion) return 0;
    return BOB_AMPLITUDE * Math.sin((t / BOB_PERIOD_MS) * Math.PI * 2 + phase);
  }, [reduceMotion]);

  const [bobTime, setBobTime] = useState(0);
  useEffect(() => {
    if (freeze) return;
    const interval = setInterval(() => setBobTime((t) => t + 100), 100);
    return () => clearInterval(interval);
  }, [freeze]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, cloudId: number) => {
      e.preventDefault();
      const cloud = cloudsRef.current.find((c) => c.id === cloudId);
      if (!cloud) return;
      const isTouch = e.pointerType === "touch";
      const startDrag = () => {
        if (!hasFiredFirstDragRef.current && onFirstDrag) {
          hasFiredFirstDragRef.current = true;
          onFirstDrag();
        }
      };
      if (isTouch) {
        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null;
          pointerIdRef.current = e.pointerId;
          dragCloudIdRef.current = cloudId;
          setDragState({ id: cloudId, startX: cloud.x, startY: cloud.y });
          startDrag();
        }, LONG_PRESS_MS);
      } else {
        pointerIdRef.current = e.pointerId;
        dragCloudIdRef.current = cloudId;
        setDragState({ id: cloudId, startX: cloud.x, startY: cloud.y });
        startDrag();
      }
      lastPointerRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    },
    [onFirstDrag]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragCloudIdRef.current == null || e.pointerId !== pointerIdRef.current) return;
    const cloud = cloudsRef.current.find((c) => c.id === dragCloudIdRef.current!);
    if (!cloud) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastPointerRef.current.t);
    cloud.x = e.clientX;
    cloud.y = e.clientY;
    cloud.vx = (e.clientX - lastPointerRef.current.x) / dt;
    cloud.vy = (e.clientY - lastPointerRef.current.y) / dt;
    lastPointerRef.current = { x: e.clientX, y: e.clientY, t: now };
    setClouds((prev) => (prev.length ? [...cloudsRef.current] : prev));
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== pointerIdRef.current) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    const cloud = cloudsRef.current.find((c) => c.id === dragCloudIdRef.current!);
    if (cloud) {
      const scale = 0.5;
      cloud.vx *= scale;
      cloud.vy *= scale;
    }
    pointerIdRef.current = null;
    dragCloudIdRef.current = null;
    setDragState(null);
  }, []);

  useEffect(() => {
    const onUp = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      const id = dragCloudIdRef.current;
      if (id != null) {
        const cloud = cloudsRef.current.find((c) => c.id === id);
        if (cloud) {
          cloud.vx *= 0.5;
          cloud.vy *= 0.5;
        }
      }
      pointerIdRef.current = null;
      dragCloudIdRef.current = null;
      setDragState(null);
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  if (clouds.length === 0) return null;

  const cx = viewportRef.current.width / 2;
  const cy = viewportRef.current.height / 2;
  const sortedByLayer = [...clouds].sort((a, b) => a.layer - b.layer);

  return (
    <div
      ref={containerRef}
      className="cloud-playground"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: fadeOut ? "none" : "auto",
        touchAction: "none",
        opacity: fadeOut ? 0 : 1,
        transition: fadeOut ? `opacity ${CLOUD_FADE_MS}ms ease-out` : "none",
        zIndex: 5,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {sortedByLayer.map((c, index) => {
        const isDragging = dragState?.id === c.id;
        const bob = getBobOffset(c.floatPhase, bobTime);
        const eyeOffset =
          isDragging && dragState
            ? (() => {
                const dx = c.x - dragState.startX;
                const dy = c.y - dragState.startY;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const cap = 6;
                const s = Math.min(1, cap / len);
                return { x: (-dx * s), y: (-dy * s) };
              })()
            : { x: 0, y: 0 };
        return (
          <CloudNode
            key={c.id}
            cloud={c}
            cloudIndex={clouds.indexOf(c)}
            centerX={cx}
            centerY={cy}
            bobY={isDragging ? 0 : bob}
            isDragging={isDragging}
            eyeOffsetX={eyeOffset.x}
            eyeOffsetY={eyeOffset.y}
            leftSvgText={leftSvgText}
            rightSvgText={rightSvgText}
            onPointerDown={(e) => handlePointerDown(e, c.id)}
          />
        );
      })}
    </div>
  );
}

const CENTER_DIM_RADIUS_PX = 200;
const LAYER_OPACITY: Record<CloudLayer, number> = { 0: 0.78, 1: 0.88, 2: 0.92 };
const LAYER_Z: Record<CloudLayer, number> = { 0: 1, 1: 2, 2: 3 };
const LAYER_FILTER: Record<CloudLayer, string> = {
  0: "blur(3px) drop-shadow(0 2px 8px rgba(0,0,0,0.08))",
  1: "drop-shadow(0 4px 12px rgba(0,0,0,0.1)) drop-shadow(0 0 0 1px rgba(255,255,255,0.15))",
  2: "drop-shadow(0 6px 20px rgba(0,0,0,0.18)) drop-shadow(0 0 0 1px rgba(255,255,255,0.18))",
};

function CloudNode({
  cloud,
  cloudIndex,
  centerX,
  centerY,
  bobY,
  isDragging,
  eyeOffsetX,
  eyeOffsetY,
  leftSvgText,
  rightSvgText,
  onPointerDown,
}: {
  cloud: CloudState;
  cloudIndex: number;
  centerX: number;
  centerY: number;
  bobY: number;
  isDragging: boolean;
  eyeOffsetX: number;
  eyeOffsetY: number;
  leftSvgText: string | null;
  rightSvgText: string | null;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const w = cloud.sizePx;
  const isLeft = cloud.id % 2 === 0;
  const template = isLeft ? leftSvgText : rightSvgText;
  const cloudSrc =
    template != null
      ? svgToDataUrl(template, cloud.eyeColor)
      : isLeft
        ? CLOUD_LEFT_SRC
        : CLOUD_RIGHT_SRC;
  const entranceDelay = CLOUD_ENTRANCE_BASE_DELAY_S + cloudIndex * CLOUD_ENTRANCE_STAGGER_S;

  const dist = Math.sqrt((cloud.x - centerX) ** 2 + (cloud.y - centerY) ** 2);
  const centerDim = dist < CENTER_DIM_RADIUS_PX ? 0.4 + 0.6 * (dist / CENTER_DIM_RADIUS_PX) : 1;
  const opacity = LAYER_OPACITY[cloud.layer] * centerDim;

  return (
    <div
      style={{
        position: "fixed",
        left: cloud.x,
        top: cloud.y,
        width: w,
        opacity,
        transform: "translate(-50%, -50%)",
        transformOrigin: "50% 50%",
        zIndex: isDragging ? 100 : LAYER_Z[cloud.layer],
        pointerEvents: "auto",
      }}
    >
      <motion.div
        role="presentation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: CLOUD_ENTRANCE_DURATION_S,
          delay: entranceDelay,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          transform: `translateY(${bobY}px) rotate(${cloud.rotation}rad) scale(${isDragging ? 1.03 : 1})`,
          transformOrigin: "50% 50%",
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
          willChange: isDragging ? "transform" : "auto",
          filter: LAYER_FILTER[cloud.layer],
        }}
        onPointerDown={onPointerDown}
      >
        <SafeImg
          src={cloudSrc}
          alt=""
          aria-hidden
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            pointerEvents: "none",
            transform: `translate(${eyeOffsetX}px, ${eyeOffsetY}px)`,
          }}
        />
      </motion.div>
    </div>
  );
}
