"use client";

import React, { useState, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import OverlayUI from "./OverlayUI";
import { HOTSPOTS, type HotspotDef } from "./hotspots";
import { useResponsiveHero } from "./useResponsiveHero";
import { navigateToHotspotHref } from "./navigateToHotspot";

const WORLD_GLB = "/hero_glb/world.glb";

// Lazy-load Canvas and 3D scene to avoid SSR and reduce initial bundle
const Hero3DCanvas = dynamic(() => import("./Hero3DCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a1628]">
      <div className="text-white/60 text-sm">Loading…</div>
    </div>
  ),
});

export interface Hero3DProps {
  onJoin: () => void;
}

export default function Hero3D({ onJoin }: Hero3DProps) {
  const { heightVh, isMobile } = useResponsiveHero();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [showTapHint, setShowTapHint] = useState(isMobile);
  const [mouseNorm, setMouseNorm] = useState({ x: 0, y: 0 });
  const tapHintTimer = useRef<ReturnType<typeof setTimeout>>();

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (isMobile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMouseNorm({ x: (x - 0.5) * 2, y: (y - 0.5) * 2 });
  }, [isMobile]);
  const onMouseLeave = useCallback(() => setMouseNorm({ x: 0, y: 0 }), []);

  const handleFocus = useCallback((id: string | null) => {
    setFocusedId(id);
  }, []);

  const handleHover = useCallback((id: string | null) => {
    if (isMobile) return;
    setHoveredHotspotId(id);
  }, [isMobile]);

  const handleAscend = useCallback(() => {
    setFocusedId("monument");
    onJoin();
  }, [onJoin]);

  const handleResetView = useCallback(() => {
    setFocusedId(null);
  }, []);

  const handleCtaClick = useCallback((href: string) => {
    navigateToHotspotHref(href);
    setFocusedId(null);
  }, []);

  // Mobile: hide "Tap to explore" after 2s
  React.useEffect(() => {
    if (!isMobile) return;
    tapHintTimer.current = setTimeout(() => setShowTapHint(false), 2000);
    return () => {
      if (tapHintTimer.current) clearTimeout(tapHintTimer.current);
    };
  }, [isMobile]);

  const focusedHotspot = focusedId ? HOTSPOTS.find((h) => h.id === focusedId) : null;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFocusedId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section
      className="hero3d relative w-full overflow-hidden bg-[#0a1628]"
      style={{
        height: `${heightVh}vh`,
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a1628]">
            <div className="text-white/60 text-sm">Loading…</div>
          </div>
        }
      >
        <Hero3DCanvas
          worldUrl={WORLD_GLB}
          hotspots={HOTSPOTS}
          focusedId={focusedId}
          hoveredHotspotId={hoveredHotspotId}
          isMobile={isMobile}
          mouseNorm={mouseNorm}
          onFocus={handleFocus}
          onHover={handleHover}
          onCtaClick={handleCtaClick}
          onReady={() => setReady(true)}
        />
      </Suspense>

      <OverlayUI
        onAscend={handleAscend}
        onResetView={handleResetView}
        showTapHint={showTapHint}
        ready={ready}
        isMobile={isMobile}
      />

      {/* Selection vignette: subtle dim on rest of scene when a hotspot is selected */}
      {focusedHotspot && (
        <div
          className="pointer-events-none fixed inset-0 z-[17]"
          style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.35) 100%)" }}
          aria-hidden
        />
      )}
      {/* Backdrop when panel open — tap/click to close */}
      {focusedHotspot && (
        <button
          type="button"
          className="fixed inset-0 z-[18] bg-black/30 backdrop-blur-sm"
          onClick={() => setFocusedId(null)}
          aria-label="Close"
        />
      )}
      {focusedHotspot && (
        <InfoPanel
          hotspot={focusedHotspot}
          isMobile={isMobile}
          onClose={() => setFocusedId(null)}
          onAscend={handleAscend}
          onResetView={handleResetView}
          onCtaClick={() => handleCtaClick(focusedHotspot.href)}
        />
      )}
    </section>
  );
}

function InfoPanel({
  hotspot,
  isMobile,
  onClose,
  onAscend,
  onResetView,
  onCtaClick,
}: {
  hotspot: HotspotDef;
  isMobile: boolean;
  onClose: () => void;
  onAscend: () => void;
  onResetView: () => void;
  onCtaClick: () => void;
}) {
  const bullets = hotspot.highlights ?? [];

  const primaryCta = () => {
    onCtaClick();
  };

  if (isMobile) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-20 bg-white/98 backdrop-blur-md rounded-t-2xl shadow-2xl transition-transform duration-500 ease-out flex flex-col"
        style={{
          height: "65vh",
          maxHeight: "65vh",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex flex-col items-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-storm/20" aria-hidden />
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-headline text-lg text-storm">{hotspot.label}</h3>
            <button
              type="button"
              className="shrink-0 w-10 h-10 rounded-full border border-storm/20 flex items-center justify-center text-storm hover:bg-storm/5"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="mt-2 text-storm/80 text-sm">{hotspot.shortDescription}</p>
          {bullets.length > 0 && (
            <ul className="mt-4 space-y-2">
              {bullets.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-storm/90 text-sm">
                  <span className="text-storm/50">•</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={primaryCta}
              className="w-full rounded-full bg-storm text-white font-medium py-3 text-sm"
              aria-label={hotspot.ctaLabel}
            >
              {hotspot.ctaLabel}
            </button>
            <button
              type="button"
              onClick={() => { onResetView(); onClose(); }}
              className="w-full rounded-full border border-storm/30 text-storm font-medium py-3 text-sm"
              aria-label="Reset view"
            >
              Reset View
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-1/2 right-8 z-20 w-full max-w-md -translate-y-1/2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6 transition-all duration-500 ease-in-out">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-headline text-lg text-storm">{hotspot.label}</h3>
          <p className="mt-2 text-storm/80 text-sm">{hotspot.shortDescription}</p>
        </div>
        <button
          type="button"
          className="shrink-0 w-10 h-10 rounded-full border border-storm/20 flex items-center justify-center text-storm hover:bg-storm/5"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={primaryCta}
          className="w-full rounded-full bg-storm text-white font-medium py-2.5 text-sm"
          aria-label={hotspot.ctaLabel}
        >
          {hotspot.ctaLabel}
        </button>
        <button
          type="button"
          onClick={() => { onResetView(); onClose(); }}
          className="w-full rounded-full border border-storm/30 text-storm font-medium py-2.5 text-sm"
          aria-label="Reset view"
        >
          Reset View
        </button>
      </div>
    </div>
  );
}
