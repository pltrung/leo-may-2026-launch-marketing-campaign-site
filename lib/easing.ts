/**
 * Easing and interpolation utilities for scroll choreography (Apple-level feel).
 */

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Remap x from [a, b] to [0, 1]; values outside clamp to 0 or 1. */
export function remap(x: number, a: number, b: number): number {
  if (a === b) return 0;
  return clamp01((x - a) / (b - a));
}

/** Linear mix. */
export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
}

export function easeInOutQuint(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2;
}

export function easeOutQuint(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 5;
}

export function easeOutExpo(t: number): number {
  const x = clamp01(t);
  return x >= 1 ? 1 : 1 - 2 ** (-10 * x);
}
