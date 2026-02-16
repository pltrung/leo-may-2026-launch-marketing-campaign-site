"use client";

import { useEffect, useRef } from "react";

const MOBILE_BREAKPOINT = 768;

/** Viewport top when card stack is "settled" (progress 1) */
const SETTLE_TOP_PX = 120;
/** Stack top above this = progress 0 (deeper in space) */
const DEEP_TOP_PX = 380;
/** Inertia: lower = more lag (0.06–0.12) */
const SMOOTHING = 0.08;
/** Depth: translateY when progress 0 (px) */
const DEPTH_Y_PX = 20;
/** Scale when progress 0 */
const SCALE_MIN = 0.97;
/** Blur when progress 0 (px) */
const BLUR_MAX_PX = 2.5;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Mobile-only: scroll-coupled depth + inertia for the active "what type of cloud" card.
 * Uses GPU props only (transform, filter, box-shadow). Runs on rAF.
 * Targets .cloud-card.active inside the container; does not change DOM structure.
 */
export function useCloudCardScrollMotion(
  cardStackRef: React.RefObject<HTMLElement | null>
) {
  const smoothed = useRef(1);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const isMobile = () =>
      typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;
    const container = cardStackRef.current;
    if (!container) return;

    const getActiveCard = () =>
      container.querySelector<HTMLElement>(".cloud-card.active");

    const clearActiveCardStyles = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.transform = "";
      el.style.filter = "";
      el.style.boxShadow = "";
      el.style.willChange = "";
    };

    if (!isMobile()) {
      clearActiveCardStyles(getActiveCard());
      return;
    }

    const apply = (progress: number) => {
      const el = getActiveCard();
      if (!el) return;
      const y = (1 - progress) * DEPTH_Y_PX;
      const scale = SCALE_MIN + (1 - SCALE_MIN) * progress;
      const blur = (1 - progress) * BLUR_MAX_PX;
      const shadowMix = progress * progress;
      const shadow = `0 ${8 + shadowMix * 8}px ${28 + shadowMix * 20}px rgba(0,0,0,${0.14 + shadowMix * 0.08})`;
      el.style.transform = `translateY(${y}px) scale(${scale})`;
      el.style.filter = blur > 0.05 ? `blur(${blur}px)` : "none";
      el.style.boxShadow = shadow;
      el.style.willChange = "transform, filter, box-shadow";
    };

    const tick = () => {
      rafId.current = null;
      const rect = container.getBoundingClientRect();
      const stackTop = rect.top;
      const targetProgress = clamp01(
        (DEEP_TOP_PX - stackTop) / (DEEP_TOP_PX - SETTLE_TOP_PX)
      );
      smoothed.current += (targetProgress - smoothed.current) * SMOOTHING;
      apply(smoothed.current);
    };

    const schedule = () => {
      if (rafId.current == null) rafId.current = requestAnimationFrame(tick);
    };

    const onResize = () => {
      if (!isMobile()) {
        clearActiveCardStyles(getActiveCard());
      } else {
        schedule();
      }
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      clearActiveCardStyles(getActiveCard());
    };
  }, [cardStackRef]);
}
