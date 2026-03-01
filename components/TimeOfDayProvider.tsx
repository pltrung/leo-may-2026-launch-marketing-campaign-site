"use client";

import { useEffect } from "react";
import { getTimeState, getMsUntilNextBoundary } from "@/lib/timeOfDay";

/**
 * Syncs body class with local time and schedules update at next boundary (6, 12, 17, 20).
 * Prefer the inline script in layout for first paint; this handles hydration and transitions.
 */
export default function TimeOfDayProvider() {
  useEffect(() => {
    const apply = () => {
      const state = getTimeState(new Date());
      document.body.classList.remove("time-morning", "time-sunset", "time-night");
      document.body.classList.add(state);
    };

    apply();
    const ms = getMsUntilNextBoundary(new Date());
    const t = setTimeout(apply, Math.min(ms, 60 * 60 * 1000));
    return () => clearTimeout(t);
  }, []);

  return null;
}
