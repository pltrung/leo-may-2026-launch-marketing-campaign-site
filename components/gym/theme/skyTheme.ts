/**
 * Time-based sky theme for gym post-launch experience.
 * Integrates with existing morning / sunset / night feel; used by CloudAtmosphere and overlay.
 */

export type SkyPeriod = "morning" | "day" | "sunset" | "night";

export interface SkyTheme {
  period: SkyPeriod;
  /** CSS gradient for background (e.g. linear-gradient(...)) */
  bgGradient: string;
  /** RGB 0–1 for cloud shader tint */
  cloudTint: [number, number, number];
  /** RGB 0–1 for fog/haze */
  fogTint: [number, number, number];
  /** Cloud opacity/strength 0–1; night can be very low */
  cloudStrength: number;
}

/** Local time: 0–24. Returns theme for that hour. */
export function getSkyTheme(localTime: number): SkyTheme {
  const t = localTime % 24;
  if (t >= 5 && t < 8) {
    return {
      period: "morning",
      bgGradient:
        "linear-gradient(180deg, #1a1a2e 0%, #16213e 35%, #0f3460 60%, #e8eef4 100%)",
      cloudTint: [0.85, 0.88, 0.95],
      fogTint: [0.4, 0.5, 0.65],
      cloudStrength: 0.7,
    };
  }
  if (t >= 8 && t < 17) {
    return {
      period: "day",
      bgGradient:
        "linear-gradient(180deg, #0c1445 0%, #1e3a5f 25%, #4a90b8 55%, #87ceeb 100%)",
      cloudTint: [1, 1, 1],
      fogTint: [0.5, 0.6, 0.75],
      cloudStrength: 0.6,
    };
  }
  if (t >= 17 && t < 20) {
    const s = (t - 17) / 3;
    return {
      period: "sunset",
      bgGradient:
        "linear-gradient(180deg, #0f0a1a 0%, #2d1b4e 20%, #6b2d5c 45%, #c75a3a 70%, #f4b942 100%)",
      cloudTint: [1, 0.85 - s * 0.2, 0.7 - s * 0.3],
      fogTint: [0.7, 0.4, 0.3],
      cloudStrength: 0.65,
    };
  }
  return {
    period: "night",
    bgGradient:
      "linear-gradient(180deg, #0B0B0F 0%, #0d0d14 40%, #12121a 100%)",
    cloudTint: [0.15, 0.15, 0.2],
    fogTint: [0.05, 0.05, 0.08],
    cloudStrength: 0.15,
  };
}

/** Get current local time in hours (0–24) from Date. */
export function getLocalTimeHours(): number {
  if (typeof window === "undefined") return 12;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
