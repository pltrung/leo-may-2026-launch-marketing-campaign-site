"use client";

import { useState, useEffect } from "react";

/**
 * Hero entrance phases for the countdown page.
 * Both entry flows (Card→Join→Countdown and Know your cloud→Countdown) land here;
 * this hook orchestrates the SAME cinematic entrance for every arrival.
 */
/** Apple-level 5-phase hero entrance */
export type HeroEntrancePhase =
  | "hidden"       // Phase 0: Page loads invisible
  | "phase1-scale" // Phase 1: Scale up (birth) ~800ms
  | "phase2-pause" // Phase 2: Micro pause ~180ms
  | "phase3-settle"// Phase 3: Settle upward + scale down ~900ms
  | "phase4-rest"  // Phase 4: Rest pause ~200ms
  | "content";     // Phase 5: UI fades in

/** Apple cinematic timing (ms) */
const TIMING = {
  hidden: 150,
  phase1Scale: 800,
  phase2Pause: 180,
  phase3Settle: 900,
  phase4Rest: 200,
} as const;

const CUMULATIVE = {
  hidden: TIMING.hidden,
  phase1Scale: TIMING.hidden + TIMING.phase1Scale,
  phase2Pause: TIMING.hidden + TIMING.phase1Scale + TIMING.phase2Pause,
  phase3Settle: TIMING.hidden + TIMING.phase1Scale + TIMING.phase2Pause + TIMING.phase3Settle,
  phase4Rest: TIMING.hidden + TIMING.phase1Scale + TIMING.phase2Pause + TIMING.phase3Settle + TIMING.phase4Rest,
} as const;

/**
 * Orchestrates the cinematic hero entrance for the countdown page.
 * Both entry flows (Card→Join→Countdown and Know your cloud→Countdown) land on
 * the countdown page; mounting runs enterCountdownHero() automatically.
 */
export function useCountdownHeroEntrance() {
  const [phase, setPhase] = useState<HeroEntrancePhase>("hidden");

  useEffect(() => {
    const start = performance.now();

    const advance = () => {
      const elapsed = performance.now() - start;
      if (elapsed < CUMULATIVE.hidden) setPhase("hidden");
      else if (elapsed < CUMULATIVE.phase1Scale) setPhase("phase1-scale");
      else if (elapsed < CUMULATIVE.phase2Pause) setPhase("phase2-pause");
      else if (elapsed < CUMULATIVE.phase3Settle) setPhase("phase3-settle");
      else if (elapsed < CUMULATIVE.phase4Rest) setPhase("phase4-rest");
      else setPhase("content");
    };

    advance();
    const ids: ReturnType<typeof setTimeout>[] = [
      setTimeout(advance, CUMULATIVE.hidden + 10),
      setTimeout(advance, CUMULATIVE.phase1Scale + 10),
      setTimeout(advance, CUMULATIVE.phase2Pause + 10),
      setTimeout(advance, CUMULATIVE.phase3Settle + 10),
      setTimeout(advance, CUMULATIVE.phase4Rest + 10),
    ];
    return () => ids.forEach(clearTimeout);
  }, []);

  return { phase };
}

/** Apple-level easing curves — do NOT use generic ease */
export const EASE_APPLE_IN_OUT = [0.22, 1, 0.36, 1];       // cubic-bezier(0.22, 1, 0.36, 1)
export const EASE_APPLE_SETTLE = [0.65, 0, 0.35, 1];       // cubic-bezier(0.65, 0, 0.35, 1)

/** Stagger delays (ms) for Phase 5 UI fade-in */
export const CONTENT_STAGGER_MS = [0, 80, 160, 240, 320, 400];
