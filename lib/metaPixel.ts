/**
 * Meta Pixel helpers (client-only). Pixel bootstrap lives in app/layout.tsx.
 * Maps to standard events for acquisition reporting (Lead, CompleteRegistration, Purchase).
 */

export const META_PIXEL_ID =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()
    ? process.env.NEXT_PUBLIC_META_PIXEL_ID.trim()
    : "YOUR_PIXEL_ID";

function fbq(): ((...args: unknown[]) => void) | undefined {
  if (typeof window === "undefined") return undefined;
  const fn = window.fbq;
  return typeof fn === "function" ? fn : undefined;
}

import { safeExecute } from "./safeExecute";

/** SPA / client navigations (initial load PageView is fired from layout script). */
export function trackPageView(): void {
  safeExecute(() => {
    const f = fbq();
    if (!f) return;
    f("track", "PageView");
  });
}

/** Gym: visit request, membership interest, corporate interest, etc. */
export function trackLead(): void {
  safeExecute(() => {
    const f = fbq();
    if (!f) return;
    f("track", "Lead");
  });
}

/** Gym: account created + onboarded (member signup). */
export function trackCompleteRegistration(): void {
  safeExecute(() => {
    const f = fbq();
    if (!f) return;
    f("track", "CompleteRegistration");
  });
}

/** Membership / pass checkout completion (value in major currency units). */
export function trackPurchase(value: number, currency = "VND"): void {
  safeExecute(() => {
    const f = fbq();
    if (!f) return;
    f("track", "Purchase", { value, currency });
  });
}
