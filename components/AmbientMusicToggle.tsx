"use client";

import { useSyncExternalStore } from "react";
import { getAmbientMuted, setAmbientMuted, subscribeAmbientMuted } from "@/lib/ambientMusic";

type Props = {
  className?: string;
  /** Visual variant for light-on-dark vs dark headers */
  variant?: "light" | "dark";
  labels?: { mute: string; unmute: string };
};

export default function AmbientMusicToggle({ className = "", variant = "light", labels }: Props) {
  const muted = useSyncExternalStore(subscribeAmbientMuted, () => getAmbientMuted(), () => false);

  const base =
    variant === "light"
      ? "border-white/40 text-white/90 hover:bg-white/10 hover:border-white/60"
      : "border-slate-600 text-slate-200 hover:bg-white/10 hover:border-slate-500";

  const muteLabel = labels?.mute ?? "Mute music";
  const unmuteLabel = labels?.unmute ?? "Unmute music";

  return (
    <button
      type="button"
      onClick={() => setAmbientMuted(!muted)}
      className={`shrink-0 flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full border transition-colors ${base} ${className}`}
      aria-label={muted ? unmuteLabel : muteLabel}
      title={muted ? unmuteLabel : muteLabel}
    >
      {muted ? (
        <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M23 9l-6 6M17 9l6 6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a9 9 0 010 14.14" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
