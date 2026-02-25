"use client";

import { useState, useEffect } from "react";

/** Desktop hero height (vh). Tweak if needed. */
const DESKTOP_HEIGHT_VH = 70;
/** Mobile hero height (vh). */
const MOBILE_HEIGHT_VH = 80;
const MOBILE_BREAKPOINT_PX = 768;

export interface ResponsiveHeroState {
  heightVh: number;
  isMobile: boolean;
  width: number;
  height: number;
}

/**
 * Detect mobile: coarse pointer (touch) OR viewport width < 768.
 * Exposes isMobile for camera presets and UI (bottom sheet vs panel).
 */
function getIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < MOBILE_BREAKPOINT_PX;
  return coarse || narrow;
}

export function useResponsiveHero(): ResponsiveHeroState {
  const [state, setState] = useState<ResponsiveHeroState>(() => ({
    heightVh: typeof window !== "undefined" && getIsMobile() ? MOBILE_HEIGHT_VH : DESKTOP_HEIGHT_VH,
    isMobile: typeof window !== "undefined" ? getIsMobile() : false,
    width: typeof window !== "undefined" ? window.innerWidth : 800,
    height: typeof window !== "undefined" ? window.innerHeight : 600,
  }));

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isMobile = getIsMobile();
      setState({
        heightVh: isMobile ? MOBILE_HEIGHT_VH : DESKTOP_HEIGHT_VH,
        isMobile,
        width: w,
        height: h,
      });
    };
    update();
    window.addEventListener("resize", update);
    const mq = window.matchMedia("(pointer: coarse)");
    mq.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      mq.removeEventListener("change", update);
    };
  }, []);

  return state;
}
