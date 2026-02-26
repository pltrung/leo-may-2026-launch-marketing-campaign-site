"use client";

import { useState, useEffect } from "react";

/**
 * Hero entrance phases for the countdown page.
 * Both entry flows (Card→Join→Countdown and Know your cloud→Countdown) land here;
 * this hook orchestrates the SAME cinematic entrance for every arrival.
 */
/** Apple-level hero entrance: scale up → pause → settle (move+scale together) → micro-settle → rest → content */
export type HeroEntrancePhase =
  | "hidden"            // Phase 0: Page loads invisible
  | "phase1-scale"      // Phase 1: Scale up at center ~800ms
  | "phase2-pause"      // Phase 2: Brief pause ~180ms
  | "phase3-settle"     // Phase 3: Move up + scale down together ~900ms, same ease
  | "phase4-micro-settle" // Phase 4: Subtle stabilization into rest ~120ms
  | "phase5-rest"       // Phase 5: Rest pause ~200ms
  | "content";          // Phase 6: UI fades in

/** Apple cinematic timing (ms) */
const TIMING = {
  hidden: 150,
  phase1Scale: 800,
  phase2Pause: 180,
  phase3Settle: 900,
  phase4MicroSettle: 120,
  phase5Rest: 200,
} as const;

const CUMULATIVE = {
  hidden: TIMING.hidden,
  phase1Scale: TIMING.hidden + TIMING.phase1Scale,
  phase2Pause: TIMING.hidden + TIMING.phase1Scale + TIMING.phase2Pause,
  phase3Settle: TIMING.hidden + TIMING.phase1Scale + TIMING.phase2Pause + TIMING.phase3Settle,
  phase4MicroSettle: TIMING.hidden + TIMING.phase1Scale + TIMING.phase2Pause + TIMING.phase3Settle + TIMING.phase4MicroSettle,
  phase5Rest: TIMING.hidden + TIMING.phase1Scale + TIMING.phase2Pause + TIMING.phase3Settle + TIMING.phase4MicroSettle + TIMING.phase5Rest,
} as const;

export interface UseCountdownHeroEntranceOptions {
  /** Delay (ms) before hero entrance starts. Use after background fade so we land on brand background. */
  startDelay?: number;
}

/**
 * Orchestrates the cinematic hero entrance for the countdown page.
 * Both entry flows (Card→Join→Countdown and Know your cloud→Countdown) land on
 * the countdown page; mounting runs enterCountdownHero() automatically.
 * When startDelay is set (e.g. 1000), phases start after that delay so background can fade to brand color first.
 */
export function useCountdownHeroEntrance(options?: UseCountdownHeroEntranceOptions) {
  const [phase, setPhase] = useState<HeroEntrancePhase>("hidden");
  const startDelay = options?.startDelay ?? 0;

  useEffect(() => {
    const run = () => {
      const start = performance.now();

      const advance = () => {
        const elapsed = performance.now() - start;
        if (elapsed < CUMULATIVE.hidden) setPhase("hidden");
        else if (elapsed < CUMULATIVE.phase1Scale) setPhase("phase1-scale");
        else if (elapsed < CUMULATIVE.phase2Pause) setPhase("phase2-pause");
        else if (elapsed < CUMULATIVE.phase3Settle) setPhase("phase3-settle");
        else if (elapsed < CUMULATIVE.phase4MicroSettle) setPhase("phase4-micro-settle");
        else if (elapsed < CUMULATIVE.phase5Rest) setPhase("phase5-rest");
        else setPhase("content");
      };

      advance();
      const ids: ReturnType<typeof setTimeout>[] = [
        setTimeout(advance, CUMULATIVE.hidden + 10),
        setTimeout(advance, CUMULATIVE.phase1Scale + 10),
        setTimeout(advance, CUMULATIVE.phase2Pause + 10),
        setTimeout(advance, CUMULATIVE.phase3Settle + 10),
        setTimeout(advance, CUMULATIVE.phase4MicroSettle + 10),
        setTimeout(advance, CUMULATIVE.phase5Rest + 10),
      ];
      return () => ids.forEach(clearTimeout);
    };

    if (startDelay > 0) {
      let cleanup: (() => void) | undefined;
      const id = setTimeout(() => {
        cleanup = run();
      }, startDelay);
      return () => {
        clearTimeout(id);
        cleanup?.();
      };
    }
    return run();
  }, [startDelay]);

  return { phase };
}

/** Apple-level easing curves — do NOT use generic ease */
export const EASE_APPLE_IN_OUT = [0.22, 1, 0.36, 1];       // cubic-bezier(0.22, 1, 0.36, 1)
export const EASE_APPLE_SETTLE = [0.65, 0, 0.35, 1];       // cubic-bezier(0.65, 0, 0.35, 1) — move + scale together
export const EASE_MICRO_SETTLE = [0.33, 0, 0.2, 1];       // subtle ease into rest, no bounce

/** Stagger delays (ms) for content fade-in — top down, slower pace for ease into page */
export const CONTENT_STAGGER_MS = [0, 220, 440, 660, 880, 1100];
