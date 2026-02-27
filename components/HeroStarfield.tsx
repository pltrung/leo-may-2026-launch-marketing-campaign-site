"use client";

import React, { useRef, useEffect, useCallback, useMemo } from "react";

const STAR_COLOR = "#e6ecff"; // soft cool white
const STAR_COUNT_MIN = 80;
const STAR_COUNT_MAX = 150;
const FAR_RATIO = 0.6; // 60% far layer
const TWINKLE_PERIOD_MS = 3000;
const DRIFT_FAR_PX_PER_SEC = 2;
const DRIFT_NEAR_PX_PER_SEC = 5;
const SHOOTING_STAR_INTERVAL_MIN_MS = 12000;
const SHOOTING_STAR_INTERVAL_MAX_MS = 25000;
const SHOOTING_STAR_DURATION_MIN_MS = 600;
const SHOOTING_STAR_DURATION_MAX_MS = 900;
const SHOOTING_STAR_FADE_IN_MS = 100;

type Star = {
  x: number; // 0..1
  y: number; // 0..1
  size: number; // 1 or 2
  baseOpacity: number;
  phase: number; // 0..2π for twinkle
  layer: 0 | 1; // 0 far, 1 near
};

type ShootingStar = {
  active: boolean;
  startTime: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  direction: 1 | -1; // 1 = top-right to bottom-left, -1 = reverse
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function HeroStarfield({
  heroTransitioning = false,
}: {
  /** When true, do not start a new shooting star (e.g. during heavy GLB scroll transition). */
  heroTransitioning?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const nextShootingStarAtRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const shootingStarRef = useRef<ShootingStar>({ active: false, startTime: 0, duration: 0, startX: 0, startY: 0, endX: 0, endY: 0, direction: 1 });

  const stars = useMemo(() => {
    const count = Math.floor(rand(STAR_COUNT_MIN, STAR_COUNT_MAX + 1));
    const farCount = Math.floor(count * FAR_RATIO);
    const list: Star[] = [];
    for (let i = 0; i < count; i++) {
      const layer = i < farCount ? (0 as 0) : (1 as 1);
      list.push({
        x: Math.random(),
        y: Math.random(),
        size: layer === 0 ? 1 : Math.random() < 0.6 ? 1 : 2,
        baseOpacity: rand(0.3, 0.8),
        phase: rand(0, Math.PI * 2),
        layer,
      });
    }
    return list;
  }, []);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => {
      ctx.clearRect(0, 0, width, height);

      const timeSec = t / 1000;

      // Stars: twinkle + slow upward drift (wrap y)
      for (const s of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin((t / TWINKLE_PERIOD_MS) * Math.PI * 2 + s.phase);
        const opacity = s.baseOpacity * (0.6 + 0.4 * twinkle);
        const drift = s.layer === 0 ? DRIFT_FAR_PX_PER_SEC * timeSec : DRIFT_NEAR_PX_PER_SEC * timeSec;
        let yNorm = s.y - (drift / height);
        while (yNorm < 0) yNorm += 1;
        while (yNorm > 1) yNorm -= 1;

        const x = s.x * width;
        const y = yNorm * height;

        ctx.fillStyle = STAR_COLOR;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(x, y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Shooting star: head bright, tail fades (gradient from head to tail)
      const ss = shootingStarRef.current;
      if (ss.active && ss.duration > 0) {
        const elapsed = t - ss.startTime;
        if (elapsed >= ss.duration) {
          ss.active = false;
        } else {
          const progress = elapsed / ss.duration;
          const easeOut = 1 - (1 - progress) * (1 - progress);
          const headX = lerp(ss.startX, ss.endX, easeOut) * width;
          const headY = lerp(ss.startY, ss.endY, easeOut) * height;
          const tailT = Math.max(0, easeOut - 0.2);
          const tailX = lerp(ss.startX, ss.endX, tailT) * width;
          const tailY = lerp(ss.startY, ss.endY, tailT) * height;

          let alpha = 1;
          if (elapsed < SHOOTING_STAR_FADE_IN_MS) alpha = elapsed / SHOOTING_STAR_FADE_IN_MS;
          else if (elapsed > ss.duration - 150) alpha = (ss.duration - elapsed) / 150;

          const gradient = ctx.createLinearGradient(tailX, tailY, headX, headY);
          gradient.addColorStop(0, "rgba(230, 236, 255, 0)");
          gradient.addColorStop(0.5, "rgba(230, 236, 255, " + 0.25 * alpha + ")");
          gradient.addColorStop(1, "rgba(230, 236, 255, " + 0.85 * alpha + ")");

          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.globalAlpha = alpha;
          ctx.shadowColor = "rgba(230, 236, 255, 0.5)";
          ctx.shadowBlur = 3;
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(headX, headY);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }
    },
    [stars]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width;
    let height = canvas.height;

    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === width && h === height) return;
      width = w;
      height = h;
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const tick = (now: number) => {
      const w = (sizeRef.current.w || canvas.parentElement?.clientWidth) ?? width;
      const h = (sizeRef.current.h || canvas.parentElement?.clientHeight) ?? height;
      draw(ctx, w, h, now);

      const ss = shootingStarRef.current;
      if (!ss.active && !heroTransitioning && now >= nextShootingStarAtRef.current) {
        const duration = rand(SHOOTING_STAR_DURATION_MIN_MS, SHOOTING_STAR_DURATION_MAX_MS);
        const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        if (direction === 1) {
          ss.startX = rand(0.1, 0.4);
          ss.startY = rand(0, 0.25);
          ss.endX = rand(0.6, 0.95);
          ss.endY = rand(0.75, 1);
        } else {
          ss.startX = rand(0.6, 0.9);
          ss.startY = rand(0.2, 0.5);
          ss.endX = rand(0.05, 0.35);
          ss.endY = rand(0.7, 0.95);
        }
        ss.active = true;
        ss.startTime = now;
        ss.duration = duration;
        ss.direction = direction;
        nextShootingStarAtRef.current = now + rand(SHOOTING_STAR_INTERVAL_MIN_MS, SHOOTING_STAR_INTERVAL_MAX_MS);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    nextShootingStarAtRef.current = performance.now() + rand(SHOOTING_STAR_INTERVAL_MIN_MS, SHOOTING_STAR_INTERVAL_MAX_MS);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, heroTransitioning]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
      }}
      aria-hidden
    />
  );
}
