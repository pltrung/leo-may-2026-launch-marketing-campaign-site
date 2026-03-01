"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import type { CloudState } from "@/lib/cloudPhysics";
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

const EYES_LEFT_SRC = "/brand/cloud-eyes-left.svg";
const EYES_RIGHT_SRC = "/brand/cloud-eyes-right.svg";

interface CloudPlaygroundProps {
  /** When true, freeze physics and fade out (e.g. Explore clicked) */
  freeze: boolean;
  reduceMotion?: boolean;
}

export default function CloudPlayground({ freeze, reduceMotion = false }: CloudPlaygroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cloudsRef = useRef<CloudState[]>([]);
  const viewportRef = useRef<Viewport>({ width: 800, height: 600 });
  const noSpawnRef = useRef<NoSpawnRect>({ cx: 400, cy: 300, halfW: 80, halfH: 32 });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const pointerIdRef = useRef<number | null>(null);
  const dragCloudIdRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });
  const [clouds, setClouds] = useState<CloudState[]>([]);
  const [fadeOut, setFadeOut] = useState(false);
  const [dragState, setDragState] = useState<{ id: number; startX: number; startY: number } | null>(null);

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
    noSpawnRef.current = { cx: vw / 2, cy: vh / 2, halfW: 90, halfH: 40 };
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
    if (typeof window === "undefined") return;
    initClouds();
    const ro = new ResizeObserver(() => {
      viewportRef.current = { width: window.innerWidth, height: window.innerHeight };
      noSpawnRef.current = {
        cx: window.innerWidth / 2,
        cy: window.innerHeight / 2,
        halfW: 90,
        halfH: 40,
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
      stepClouds(cloudsRef.current, viewportRef.current, dt, {
        drift: true,
        windScale: reduceMotion ? 0.3 : 1,
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
      if (isTouch) {
        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null;
          pointerIdRef.current = e.pointerId;
          dragCloudIdRef.current = cloudId;
          setDragState({ id: cloudId, startX: cloud.x, startY: cloud.y });
        }, LONG_PRESS_MS);
      } else {
        pointerIdRef.current = e.pointerId;
        dragCloudIdRef.current = cloudId;
        setDragState({ id: cloudId, startX: cloud.x, startY: cloud.y });
      }
      lastPointerRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    },
    []
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
      {clouds.map((c) => {
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
            bobY={isDragging ? 0 : bob}
            isDragging={isDragging}
            eyeOffsetX={eyeOffset.x}
            eyeOffsetY={eyeOffset.y}
            onPointerDown={(e) => handlePointerDown(e, c.id)}
          />
        );
      })}
    </div>
  );
}

function CloudNode({
  cloud,
  bobY,
  isDragging,
  eyeOffsetX,
  eyeOffsetY,
  onPointerDown,
}: {
  cloud: CloudState;
  bobY: number;
  isDragging: boolean;
  eyeOffsetX: number;
  eyeOffsetY: number;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const w = cloud.sizePx;
  const h = Math.round(w * 0.5);

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        left: cloud.x,
        top: cloud.y,
        width: w,
        height: h,
        transform: `translate(-50%, -50%) translateY(${bobY}px) rotate(${cloud.rotation}rad) scale(${isDragging ? 1.03 : 1})`,
        transformOrigin: "50% 50%",
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
        pointerEvents: "auto",
        zIndex: isDragging ? 100 : 1,
        willChange: isDragging ? "transform" : "auto",
      }}
      onPointerDown={onPointerDown}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: "50% 50% 45% 45%",
          background: "rgba(255,255,255,0.92)",
          boxShadow:
            "0 8px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${eyeOffsetX}px), calc(-50% + ${eyeOffsetY}px))`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: w * 0.12,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src={EYES_LEFT_SRC}
              alt=""
              aria-hidden
              style={{
                width: w * 0.18,
                height: "auto",
                opacity: 0.9,
                pointerEvents: "none",
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const next = e.currentTarget.nextElementSibling as HTMLElement;
                if (next) next.style.display = "block";
              }}
            />
            <span
              style={{
                width: w * 0.1,
                height: w * 0.08,
                borderRadius: "50%",
                background: "rgba(0,40,80,0.5)",
                display: "none",
              }}
            />
          </span>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src={EYES_RIGHT_SRC}
              alt=""
              aria-hidden
              style={{
                width: w * 0.18,
                height: "auto",
                opacity: 0.9,
                pointerEvents: "none",
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const next = e.currentTarget.nextElementSibling as HTMLElement;
                if (next) next.style.display = "block";
              }}
            />
            <span
              style={{
                width: w * 0.1,
                height: w * 0.08,
                borderRadius: "50%",
                background: "rgba(0,40,80,0.5)",
                display: "none",
              }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
