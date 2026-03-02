/**
 * Lightweight 2D physics for floating clouds: friction, boundary bounce, cloud-cloud collision.
 * No wind/drift — clouds just float (bob in place) until dragged.
 */

import { HERO_ACCENT_COLORS } from "@/lib/heroConstants";

/** 0 = background (smaller, slower, blur), 1 = mid, 2 = foreground (larger, shadow, faster) */
export type CloudLayer = 0 | 1 | 2;

export interface CloudState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  sizePx: number;
  rotation: number;
  floatPhase: number;
  layer: CloudLayer;
  /** Hero accent color for cloud eyes (randomized per cloud). */
  eyeColor: string;
  /** Last frame when this cloud's eye color changed due to collision (for cooldown). */
  lastEyeColorChangeFrame: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** Rectangle to avoid (e.g. Explore button area) — center and half-size */
export interface NoSpawnRect {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
}

const FRICTION = 0.985;
const RESTITUTION = 0.75;
const COLLISION_ITERATIONS = 3;
/** Minimum gap between cloud centers (so clouds don’t overlap or sit too close) */
const MIN_CLOUD_GAP = 28;
/** Slightly tighter on mobile so 5–6 clouds fit in the smaller viewport; desktop unchanged. */
const MIN_CLOUD_GAP_MOBILE = 18;
/** Frames to wait before the same cloud can get its eye color changed by collision again */
const COLLISION_EYE_COLOR_COOLDOWN_FRAMES = 40;

function pickRandomAccentColor(): string {
  return HERO_ACCENT_COLORS[Math.floor(Math.random() * HERO_ACCENT_COLORS.length)];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function isInNoSpawn(x: number, y: number, r: number, noSpawn: NoSpawnRect): boolean {
  const dx = Math.abs(x - noSpawn.cx);
  const dy = Math.abs(y - noSpawn.cy);
  const margin = r + 20;
  return dx < noSpawn.halfW + margin && dy < noSpawn.halfH + margin;
}

function isTooCloseToOthers(
  x: number,
  y: number,
  radius: number,
  existing: CloudState[],
  isMobile: boolean
): boolean {
  const gap = isMobile ? MIN_CLOUD_GAP_MOBILE : MIN_CLOUD_GAP;
  const minDist = radius + gap;
  for (const c of existing) {
    const dx = x - c.x;
    const dy = y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist + c.radius) return true;
  }
  return false;
}

export function createClouds(
  count: number,
  viewport: Viewport,
  noSpawn: NoSpawnRect,
  sizeMin: number,
  sizeMax: number,
  isMobile: boolean
): CloudState[] {
  const clouds: CloudState[] = [];
  const padding = isMobile
    ? Math.min(sizeMax + 15, Math.floor(viewport.width * 0.12), Math.floor(viewport.height * 0.12))
    : sizeMax + 30;
  let attempts = 0;
  const maxAttempts = count * 80;

  for (let i = 0; i < count && attempts < maxAttempts; attempts++) {
    const sizePx = Math.round(rand(sizeMin, sizeMax));
    const radius = sizePx * 0.45;
    const x = rand(padding, viewport.width - padding);
    const y = rand(padding, viewport.height - padding);
    if (isInNoSpawn(x, y, radius, noSpawn)) continue;
    if (isTooCloseToOthers(x, y, radius, clouds, isMobile)) continue;
    const eyeColor = HERO_ACCENT_COLORS[Math.floor(Math.random() * HERO_ACCENT_COLORS.length)];
    clouds.push({
      id: i,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      sizePx,
      rotation: rand(-6, 6) * (Math.PI / 180),
      floatPhase: rand(0, Math.PI * 2),
      layer: 1,
      eyeColor,
      lastEyeColorChangeFrame: -999,
    });
    i++;
  }
  // Assign layers by size: smallest third = back (0), middle = mid (1), largest third = fore (2)
  const sorted = [...clouds].sort((a, b) => a.sizePx - b.sizePx);
  const third = Math.floor(sorted.length / 3);
  sorted.forEach((c, idx) => {
    c.layer = idx < third ? 0 : idx < third * 2 ? 1 : 2;
  });
  return clouds;
}

/** Drift scale per layer: back slower, mid normal, fore slightly faster */
const LAYER_DRIFT = [0.15, 0.4, 0.7] as const;

export function stepClouds(
  clouds: CloudState[],
  viewport: Viewport,
  dt: number,
  options?: { drift?: boolean; windScale?: number; frame?: number }
): void {
  const windScale = options?.windScale ?? 1;
  const drift = options?.drift ?? false;
  const frame = options?.frame ?? 0;
  for (const c of clouds) {
    if (drift) {
      const d = LAYER_DRIFT[c.layer] * windScale * 0.08;
      c.vx += (Math.sin(c.floatPhase + dt * 0.0008) * d - c.vx * 0.02) * (dt / 16);
      c.vy += (Math.cos(c.floatPhase * 0.7 + dt * 0.0006) * d * 0.5 - c.vy * 0.02) * (dt / 16);
    }
    c.vx *= FRICTION;
    c.vy *= FRICTION;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
  }

  for (let iter = 0; iter < COLLISION_ITERATIONS; iter++) {
    for (let i = 0; i < clouds.length; i++) {
      const a = clouds[i];
      const left = a.radius;
      const right = viewport.width - a.radius;
      const top = a.radius;
      const bottom = viewport.height - a.radius;
      if (a.x < left) {
        a.x = left;
        a.vx *= -RESTITUTION;
      }
      if (a.x > right) {
        a.x = right;
        a.vx *= -RESTITUTION;
      }
      if (a.y < top) {
        a.y = top;
        a.vy *= -RESTITUTION;
      }
      if (a.y > bottom) {
        a.y = bottom;
        a.vy *= -RESTITUTION;
      }
    }

    for (let i = 0; i < clouds.length; i++) {
      for (let j = i + 1; j < clouds.length; j++) {
        const a = clouds[i];
        const b = clouds[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const overlap = a.radius + b.radius - dist;
        if (overlap > 0 && dist > 1e-6) {
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * (overlap * (b.radius / (a.radius + b.radius)));
          a.y -= ny * (overlap * (b.radius / (a.radius + b.radius)));
          b.x += nx * (overlap * (a.radius / (a.radius + b.radius)));
          b.y += ny * (overlap * (a.radius / (a.radius + b.radius)));
          const dvx = b.vx - a.vx;
          const dvy = b.vy - a.vy;
          const dvn = dvx * nx + dvy * ny;
          if (dvn < 0) {
            const k = (1 + RESTITUTION) * 0.5;
            a.vx += k * dvn * nx;
            a.vy += k * dvn * ny;
            b.vx -= k * dvn * nx;
            b.vy -= k * dvn * ny;
            if (frame - a.lastEyeColorChangeFrame >= COLLISION_EYE_COLOR_COOLDOWN_FRAMES) {
              a.eyeColor = pickRandomAccentColor();
              a.lastEyeColorChangeFrame = frame;
            }
            if (frame - b.lastEyeColorChangeFrame >= COLLISION_EYE_COLOR_COOLDOWN_FRAMES) {
              b.eyeColor = pickRandomAccentColor();
              b.lastEyeColorChangeFrame = frame;
            }
          }
        }
      }
    }
  }
}
