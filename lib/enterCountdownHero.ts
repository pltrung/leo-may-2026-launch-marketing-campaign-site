"use client";

import { useState, useEffect } from "react";

/**
 * Hero entrance phases for the countdown page.
 * Both entry flows (Card→Join→Countdown and Know your cloud→Countdown) land here;
 * this hook orchestrates the SAME cinematic entrance for every arrival.
 */
export type HeroEntrancePhase =
  | "hidden"      // Phase 0: Page loads invisible
  | "ip-appear"   // Phase 1: IP appears small at center
  | "ip-grow"     // Phase 2: IP grows larger smoothly
  | "ip-peak"     // Phase 3: IP at maximum scale (cinematic pause)
  | "ip-settle"   // Phase 4: IP settles to final resting position
  | "content";    // Phase 5: UI fades in

/** Calm, premium, cinematic timing (ms) */
const TIMING = {
  hidden: 180,
  ipAppear: 400,
  ipGrow: 1400,
  ipPeak: 650,
  ipSettle: 950,
} as const;

const CUMULATIVE = {
  hidden: TIMING.hidden,
  ipAppear: TIMING.hidden + TIMING.ipAppear,
  ipGrow: TIMING.hidden + TIMING.ipAppear + TIMING.ipGrow,
  ipPeak: TIMING.hidden + TIMING.ipAppear + TIMING.ipGrow + TIMING.ipPeak,
  ipSettle: TIMING.hidden + TIMING.ipAppear + TIMING.ipGrow + TIMING.ipPeak + TIMING.ipSettle,
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
      else if (elapsed < CUMULATIVE.ipAppear) setPhase("ip-appear");
      else if (elapsed < CUMULATIVE.ipGrow) setPhase("ip-grow");
      else if (elapsed < CUMULATIVE.ipPeak) setPhase("ip-peak");
      else if (elapsed < CUMULATIVE.ipSettle) setPhase("ip-settle");
      else setPhase("content");
    };

    advance();
    const ids: ReturnType<typeof setTimeout>[] = [
      setTimeout(advance, CUMULATIVE.hidden + 10),
      setTimeout(advance, CUMULATIVE.ipAppear + 10),
      setTimeout(advance, CUMULATIVE.ipGrow + 10),
      setTimeout(advance, CUMULATIVE.ipPeak + 10),
      setTimeout(advance, CUMULATIVE.ipSettle + 10),
    ];
    return () => ids.forEach(clearTimeout);
  }, []);

  return { phase };
}

/** Stagger delays (ms) for content fade-in: Team name, Logo, Energy bar, Countdown, Leaderboard, Buttons */
export const CONTENT_STAGGER_MS = [0, 80, 160, 240, 320, 400];
