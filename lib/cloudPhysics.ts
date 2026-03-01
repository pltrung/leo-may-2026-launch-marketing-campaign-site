/**
 * Lightweight 2D physics for floating clouds: friction, boundary bounce, cloud-cloud collision.
 * No wind/drift — clouds just float (bob in place) until dragged.
 */

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
  existing: CloudState[]
): boolean {
  const minDist = radius + MIN_CLOUD_GAP;
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
  const padding = sizeMax + 30;
  let attempts = 0;
  const maxAttempts = count * 60;

  for (let i = 0; i < count && attempts < maxAttempts; attempts++) {
    const sizePx = Math.round(rand(sizeMin, sizeMax));
    const radius = sizePx * 0.45;
    const x = rand(padding, viewport.width - padding);
    const y = rand(padding, viewport.height - padding);
    if (isInNoSpawn(x, y, radius, noSpawn)) continue;
    if (isTooCloseToOthers(x, y, radius, clouds)) continue;
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
    });
    i++;
  }
  return clouds;
}

export function stepClouds(
  clouds: CloudState[],
  viewport: Viewport,
  dt: number,
  _options?: { drift?: boolean; windScale?: number }
): void {
  for (const c of clouds) {
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
          }
        }
      }
    }
  }
}
