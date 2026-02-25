"use client";

import React from "react";

const GLASS = {
  panel: {
    background: "rgba(255,255,255,0.10)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.14)",
  },
  title: { color: "rgba(255,255,255,0.92)" },
  body: { color: "rgba(255,255,255,0.72)" },
} as const;

export interface OverlayUIProps {
  onResetView: () => void;
  showTapHint: boolean;
  ready: boolean;
  isMobile?: boolean;
  entranceProgress?: number;
  glassStyle?: boolean;
}

export default function OverlayUI({
  onResetView,
  showTapHint,
  ready,
  isMobile = false,
  entranceProgress = 1,
  glassStyle = true,
}: OverlayUIProps) {
  const uiOpacity = ready ? (entranceProgress > 0.5 ? (entranceProgress - 0.5) / 0.5 : 0) : 0;
  const visibleOpacity = 1;

  return (
    <div
      className="hero3d-overlay absolute inset-0 pointer-events-none z-10 flex flex-col"
      aria-hidden
    >
      <div
        className="pointer-events-auto flex items-center justify-center pt-6 md:pt-8"
        style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))", opacity: visibleOpacity, transition: "opacity 400ms ease-out" }}
      >
        <img
          src="/logo-white.svg"
          alt="Leo Mây"
          className="h-12 md:h-14 w-auto object-contain opacity-90"
        />
      </div>

      {showTapHint && (
        <div
          className="absolute bottom-[18vh] left-1/2 -translate-x-1/2 text-sm tracking-wide"
          style={{ color: "rgba(255,255,255,0.75)", opacity: visibleOpacity }}
        >
          Tap to explore
        </div>
      )}

      <div
        className={`absolute left-6 pointer-events-auto ${
          isMobile ? "bottom-6 pb-[env(safe-area-inset-bottom)]" : "bottom-6"
        }`}
        style={{ opacity: visibleOpacity, transition: "opacity 400ms ease-out" }}
      >
        <button
          type="button"
          onClick={onResetView}
          className="rounded-full px-4 py-2 text-xs font-medium transition-colors"
          style={
            glassStyle
              ? { ...GLASS.panel, color: "rgba(255,255,255,0.9)" }
              : { color: "rgba(255,255,255,0.6)" }
          }
        >
          Reset view
        </button>
      </div>
    </div>
  );
}
