"use client";

import { useEffect, useRef } from "react";

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
  next: { y: 65, scale: 0.95 },
  prev: { y: -65, scale: 0.95 },
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
 * Cards stay anchored to base positions; inertia is finalY = baseY + (offset * depthMult).
 * Pass inertiaEnabled: false until entry animation + settle phase complete so cards feel grounded first.
 */
export function useCloudCardScrollMotion(
  cardStackRef: React.RefObject<HTMLElement | null>,
  inertiaEnabled: boolean = true
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
      if (hasSelection || dragging) {
        clearAllCardTransforms();
        return;
      }

      const inertiaOffsetY = (1 - progress) * MAX_OFFSET_PX;

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
        clearAllCardTransforms();
        return;
      }
      apply(p);
    };

    const schedule = () => {
      if (rafId.current == null) rafId.current = requestAnimationFrame(tick);
    };

    const onResize = () => {
      if (!isMobile()) clearAllCardTransforms();
      else schedule();
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      clearAllCardTransforms();
    };
  }, [cardStackRef, inertiaEnabled]);
}
