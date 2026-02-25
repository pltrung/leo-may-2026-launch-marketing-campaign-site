"use client";

import React from "react";

export interface OverlayUIProps {
  onResetView: () => void;
  showTapHint: boolean;
  ready: boolean;
  isMobile?: boolean;
}

export default function OverlayUI({
  onResetView,
  showTapHint,
  ready,
  isMobile = false,
}: OverlayUIProps) {
  return (
    <div
      className="hero3d-overlay absolute inset-0 pointer-events-none z-10 flex flex-col"
      aria-hidden
    >
      <div
        className="pointer-events-auto flex items-center justify-center pt-6 md:pt-8"
        style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
      >
        <img
          src="/logo-white.svg"
          alt="Leo Mây"
          className="h-12 md:h-14 w-auto object-contain opacity-90"
          style={{ opacity: ready ? 1 : 0, transition: "opacity 400ms ease-out" }}
        />
      </div>

      {showTapHint && (
        <div className="absolute bottom-[18vh] left-1/2 -translate-x-1/2 text-white/70 text-sm tracking-wide">
          Tap to explore
        </div>
      )}

      {/* Subtle Reset view link in corner; Ascend CTA is in-scene on center island */}
      <div
        className={`absolute left-6 pointer-events-auto ${
          isMobile ? "bottom-6 pb-[env(safe-area-inset-bottom)]" : "bottom-6"
        }`}
        style={{ opacity: ready ? 1 : 0, transition: "opacity 400ms ease-out" }}
      >
        <button
          type="button"
          onClick={onResetView}
          className="text-white/60 hover:text-white/90 text-xs transition-colors"
        >
          Reset view
        </button>
      </div>
    </div>
  );
}
