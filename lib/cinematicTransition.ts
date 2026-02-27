/** CTA → Pick Your Cloud cinematic transition phases. */
export type CinematicTransitionPhase =
  | "idle"
  | "glb_reveal"
  | "isolation"
  | "dissolve"
  | "reveal"
  | "complete";

export const CINEMATIC_PHASE_DURATION_MS = {
  glb_reveal: 450,
  isolation: 400,
  dissolve: 400,
  reveal: 600,
} as const;

/** GLB is considered visible when progress >= this (smoothstep 0.38–0.62). */
export const GLB_VISIBLE_PROGRESS = 0.38;
