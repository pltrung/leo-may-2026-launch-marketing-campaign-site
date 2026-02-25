"use client";

import React from "react";

export interface OverlayUIProps {
  onAscend: () => void;
  onResetView: () => void;
  showTapHint: boolean;
  ready: boolean;
  isMobile?: boolean;
}

export default function OverlayUI({
  onAscend,
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
      <div className="pointer-events-auto flex items-center justify-center pt-8">
        {/* Logo / title area — minimal */}
        <img
          src="/logo-white.svg"
          alt="Leo Mây"
          className="h-8 w-auto object-contain opacity-90"
          style={{ opacity: ready ? 1 : 0, transition: "opacity 400ms ease-out" }}
        />
      </div>

      {/* Tap to explore — mobile only, fades after 2s via parent */}
      {showTapHint && (
        <div className="absolute bottom-[18vh] left-1/2 -translate-x-1/2 text-white/70 text-sm tracking-wide">
          Tap to explore
        </div>
      )}

      {/* Bottom row: Reset view (left), CTA (right); safe-area on mobile */}
      <div
        className={`absolute left-6 right-6 flex items-center justify-between pointer-events-auto ${
          isMobile ? "bottom-6 pb-[env(safe-area-inset-bottom)]" : "bottom-6"
        }`}
        style={{ opacity: ready ? 1 : 0, transition: "opacity 400ms ease-out" }}
      >
        <button
          type="button"
          onClick={onResetView}
          className="text-white/70 hover:text-white text-xs transition-colors"
        >
          Reset view
        </button>
        <button
          type="button"
          onClick={onAscend}
          className="rounded-full bg-white/90 text-storm font-medium px-6 py-3 text-sm tracking-wide hover:bg-white transition-colors"
          aria-label="Ascend With Us — Founding Circle"
        >
          Ascend With Us
        </button>
      </div>
    </div>
  );
}
