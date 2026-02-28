"use client";

import { HERO_BG } from "@/lib/heroConstants";

/**
 * Shown when the cinematic hero throws (e.g. WebGL/locale edge case).
 * Same look as hero (background, full viewport) so the page stays on-brand; retry re-mounts the hero.
 */
export default function HeroFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-[100dvh] w-full"
      style={{ background: HERO_BG }}
      role="alert"
    >
      <p className="text-white/70 text-sm mb-4">Something went wrong loading this view.</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-5 py-2.5 rounded-full border border-white/50 text-white/90 text-sm font-medium hover:bg-white/10 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
