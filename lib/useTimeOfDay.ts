"use client";

import { useState, useEffect } from "react";
import type { TimeState } from "@/lib/timeOfDay";

/** Current time state from body class (for conditional starfield, transparent stage, etc.). */
export function useTimeOfDay(): TimeState {
  const [state, setState] = useState<TimeState>("time-night");
  useEffect(() => {
    const read = () => {
      if (typeof document === "undefined") return;
      if (document.body.classList.contains("time-morning")) setState("time-morning");
      else if (document.body.classList.contains("time-sunset")) setState("time-sunset");
      else setState("time-night");
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return state;
}
