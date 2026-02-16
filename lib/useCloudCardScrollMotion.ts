"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";

const MOBILE_BREAKPOINT = 768;

/** Viewport top when stack is "settled" (progress 1, inertia offset 0) */
const SETTLE_TOP_PX = 120;
/** Stack top above this = progress 0 (max inertia offset) */
const DEEP_TOP_PX = 380;
/** Inertia: higher = faster settle, more attached to scroll (0.15–0.3) */
const SMOOTHING = 0.22;
/** Max additive offset in px (subtle; finalY = baseY + offset * depthMult) */
const MAX_OFFSET_PX = 8;

/** Base positions from CSS — must match focus hierarchy; inertia is additive only */
const BASE = {
  active: { y: 0, scale: 1 },
  next: { y: 60, scale: 0.96 },
  prev: { y: -60, scale: 0.96 },
  far: { y: 88, scale: 0.9 },
} as const;

/** Depth dampening: top card moves most, deeper cards less */
const DEPTH_MULT: Record<string, number> = {
  active: 1,
  next: 0.6,
  prev: 0.6,
  far: 0.3,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Mobile-only: scroll-coupled inertia as a small additive offset to fixed stack positions.
 * When inertiaMotionValue is provided, only that value is updated (stack is driven by shared position in parent).
 * onTick is called each animation frame (from the same rAF loop) so the parent can sync CSS vars from stackPosition.
 */
export function useCloudCardScrollMotion(
  cardStackRef: React.RefObject<HTMLElement | null>,
  inertiaEnabled: boolean = true,
  inertiaMotionValue?: MotionValue<number> | null,
  onTick?: () => void
) {
  const smoothedProgress = useRef(1);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const isMobile = () =>
      typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;
    const container = cardStackRef.current;
    if (!container) return;

    const clearAllCardTransforms = () => {
      container.querySelectorAll<HTMLElement>(".cloud-card").forEach((el) => {
        el.style.transform = "";
        el.style.willChange = "";
      });
    };

    if (!inertiaEnabled) {
      clearAllCardTransforms();
      return;
    }

    if (!isMobile()) {
      clearAllCardTransforms();
      return;
    }

    const apply = (progress: number) => {
      const wrapper = container.closest(".cloud-stack-wrapper");
      const hasSelection = wrapper?.classList.contains("has-selection") ?? false;
      const dragging = container.classList.contains("dragging");
      const stackAnimating = container.classList.contains("stack-animating");
      const inertiaOffsetY = (1 - progress) * MAX_OFFSET_PX;

      if (inertiaMotionValue) {
        inertiaMotionValue.set(stackAnimating || dragging ? 0 : inertiaOffsetY);
        return;
      }

      if (hasSelection || dragging || stackAnimating) {
        clearAllCardTransforms();
        return;
      }

      container.querySelectorAll<HTMLElement>(".cloud-card").forEach((el) => {
        const pos = el.classList.contains("active")
          ? "active"
          : el.classList.contains("next")
            ? "next"
            : el.classList.contains("prev")
              ? "prev"
              : el.classList.contains("far")
                ? "far"
                : null;
        if (!pos) return;
        const base = BASE[pos];
        const mult = DEPTH_MULT[pos] ?? 0.3;
        const addY = inertiaOffsetY * mult;
        const y = base.y + addY;
        el.style.transform = `translateX(-50%) translateY(${y}px) scale(${base.scale})`;
        el.style.willChange = "transform";
      });
    };

    const tick = () => {
      rafId.current = null;
      const rect = container.getBoundingClientRect();
      const stackTop = rect.top;
      const targetProgress = clamp01(
        (DEEP_TOP_PX - stackTop) / (DEEP_TOP_PX - SETTLE_TOP_PX)
      );
      smoothedProgress.current +=
        (targetProgress - smoothedProgress.current) * SMOOTHING;
      const p = smoothedProgress.current;
      if (p >= 0.998) {
        if (!inertiaMotionValue) clearAllCardTransforms();
        else inertiaMotionValue.set(0);
      } else {
        apply(p);
      }
      onTick?.();
    };

    const schedule = () => {
      if (rafId.current == null) rafId.current = requestAnimationFrame(tick);
    };

    const onResize = () => {
      if (!isMobile()) clearAllCardTransforms();
      else schedule();
    };

    const onVisibilityChange = () => {
      if (document.hidden) return;
      schedule();
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      clearAllCardTransforms();
    };
  }, [cardStackRef, inertiaEnabled, inertiaMotionValue, onTick]);
}
