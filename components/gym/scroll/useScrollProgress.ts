"use client";

import { useState, useEffect, useCallback } from "react";
import { remap, clamp01 } from "@/lib/easing";

export interface ScrollProgressState {
  scrollY: number;
  viewportHeight: number;
  totalScrollHeight: number;
  /** Global progress 0..1 over the scroll story */
  progress: number;
  /** Chapter-local progress 0..1 */
  p1: number;
  p2: number;
  p3: number;
  p4: number;
}

const CHAPTER_BREAKPOINTS = {
  c1: [0, 0.25],
  c2: [0.25, 0.5],
  c3: [0.5, 0.8],
  c4: [0.8, 1],
} as const;

export function useScrollProgress(totalStoryHeightVh: number): ScrollProgressState {
  const [state, setState] = useState<ScrollProgressState>({
    scrollY: 0,
    viewportHeight: 800,
    totalScrollHeight: 800,
    progress: 0,
    p1: 0,
    p2: 0,
    p3: 0,
    p4: 0,
  });

  const update = useCallback(() => {
    if (typeof window === "undefined") return;
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const vh = (viewportHeight * totalStoryHeightVh) / 100;
    const totalScrollHeight = vh;
    const maxScroll = Math.max(0, totalScrollHeight - viewportHeight);
    const progress = maxScroll > 0 ? clamp01(scrollY / maxScroll) : 0;

    setState({
      scrollY,
      viewportHeight,
      totalScrollHeight,
      progress,
      p1: remap(progress, CHAPTER_BREAKPOINTS.c1[0], CHAPTER_BREAKPOINTS.c1[1]),
      p2: remap(progress, CHAPTER_BREAKPOINTS.c2[0], CHAPTER_BREAKPOINTS.c2[1]),
      p3: remap(progress, CHAPTER_BREAKPOINTS.c3[0], CHAPTER_BREAKPOINTS.c3[1]),
      p4: remap(progress, CHAPTER_BREAKPOINTS.c4[0], CHAPTER_BREAKPOINTS.c4[1]),
    });
  }, [totalStoryHeightVh]);

  useEffect(() => {
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  return state;
}

export { CHAPTER_BREAKPOINTS };
