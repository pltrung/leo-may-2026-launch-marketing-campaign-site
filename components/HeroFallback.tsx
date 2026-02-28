"use client";

import { usePathname } from "next/navigation";
import { HERO_BG } from "@/lib/heroConstants";

/**
 * Shown when the cinematic hero throws (e.g. after logout→home on mobile, WebGL/locale edge case).
 * Same look as hero (background, full viewport). "Try again" does a full page reload so we get
 * a clean state (avoids re-render throwing again and button seeming to do nothing).
 */
export default function HeroFallback({ onRetry }: { onRetry: () => void }) {
  const pathname = usePathname();

  const handleRetry = () => {
    if (typeof window !== "undefined" && pathname) {
      window.location.href = pathname;
      return;
    }
    onRetry();
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-[100dvh] w-full"
      style={{ background: HERO_BG }}
      role="alert"
    >
      <p className="text-white/70 text-sm mb-4">Something went wrong loading this view.</p>
      <button
        type="button"
        onClick={handleRetry}
        className="px-5 py-2.5 rounded-full border border-white/50 text-white/90 text-sm font-medium hover:bg-white/10 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
