"use client";

import React, { useState, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import OverlayUI from "./OverlayUI";
import { HOTSPOTS, type HotspotDef } from "./hotspots";
import { useResponsiveHero } from "./useResponsiveHero";
import { navigateToHotspotHref } from "./navigateToHotspot";

const WORLD_GLB = "/hero_glb/world.glb";

/** Toggle to show hero outline, safe-area, and hotspot hitboxes. Use ?debug=1 in URL. */
function getDebugUi(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "1";
}

// Lazy-load Canvas and 3D scene to avoid SSR and reduce initial bundle
const Hero3DCanvas = dynamic(() => import("./Hero3DCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0e1623]">
      <div className="text-white/60 text-sm">Loading…</div>
    </div>
  ),
});

export interface Hero3DProps {
  onJoin: () => void;
}

export default function Hero3D({ onJoin }: Hero3DProps) {
  const { isMobile } = useResponsiveHero();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [showTapHint, setShowTapHint] = useState(isMobile);
  const [mouseNorm, setMouseNorm] = useState({ x: 0, y: 0 });
  const [userInteracting, setUserInteracting] = useState(false);
  const [ascendPanelOpen, setAscendPanelOpen] = useState(false);
  const [ascendTransitioning, setAscendTransitioning] = useState(false);
  const [debugUi, setDebugUi] = useState(false);
  const [resetViewTrigger, setResetViewTrigger] = useState(0);
  const [showCenterPulse, setShowCenterPulse] = useState(false);
  const [panelRevealed, setPanelRevealed] = useState(false);
  const [entranceProgress, setEntranceProgress] = useState(0);
  const tapHintTimer = useRef<ReturnType<typeof setTimeout>>();
  const centerPulseTimer = useRef<ReturnType<typeof setTimeout>>();
  const panelRevealTimer = useRef<ReturnType<typeof setTimeout>>();
  const heroStageRef = useRef<HTMLElement>(null);
  const entranceStart = useRef<number | null>(null);
  const entranceRaf = useRef<number>(0);

  React.useEffect(() => {
    setDebugUi(getDebugUi());
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (isMobile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMouseNorm({ x: (x - 0.5) * 2, y: (y - 0.5) * 2 });
  }, [isMobile]);
  const onMouseLeave = useCallback(() => setMouseNorm({ x: 0, y: 0 }), []);

  const handleFocus = useCallback((id: string | null) => {
    setShowCenterPulse(false);
    if (centerPulseTimer.current) clearTimeout(centerPulseTimer.current);
    setFocusedId(id);
    if (id) {
      setPanelRevealed(false);
      if (panelRevealTimer.current) clearTimeout(panelRevealTimer.current);
      panelRevealTimer.current = setTimeout(() => setPanelRevealed(true), 700);
    } else {
      setPanelRevealed(false);
      if (panelRevealTimer.current) clearTimeout(panelRevealTimer.current);
    }
  }, []);

  const handleHover = useCallback((id: string | null) => {
    if (isMobile) return;
    setHoveredHotspotId(id);
  }, [isMobile]);

  /** In-scene Ascend CTA click: focus camera to main wall + show confirm panel (Vision-style 2-step). */
  const handleAscendCtaClick = useCallback(() => {
    setAscendPanelOpen(true);
  }, []);

  /** Panel "Ascend": 700ms transition overlay then scroll to #know-your-cloud, reveal fade-up, call onJoin. */
  const handleAscendConfirm = useCallback(() => {
    setAscendTransitioning(true);
    setTimeout(() => {
      const el = document.getElementById("know-your-cloud");
      if (el) {
        el.classList.add("ascend-reveal");
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      onJoin();
      setAscendTransitioning(false);
      setAscendPanelOpen(false);
    }, 700);
  }, [onJoin]);

  const handleExploreFirst = useCallback(() => {
    setAscendPanelOpen(false);
  }, []);

  const handleResetView = useCallback(() => {
    setFocusedId(null);
    setResetViewTrigger((t) => t + 1);
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

  // Mobile: show center pulse after 2.5s idle (discoverability)
  React.useEffect(() => {
    if (!isMobile || focusedId) return;
    centerPulseTimer.current = setTimeout(() => setShowCenterPulse(true), 2500);
    return () => {
      if (centerPulseTimer.current) clearTimeout(centerPulseTimer.current);
    };
  }, [isMobile, focusedId]);

  React.useEffect(() => {
    return () => {
      if (panelRevealTimer.current) clearTimeout(panelRevealTimer.current);
      if (entranceRaf.current) cancelAnimationFrame(entranceRaf.current);
    };
  }, []);

  React.useEffect(() => {
    if (!ready || entranceProgress >= 1) return;
    const duration = 1100;
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
    const tick = (now: number) => {
      if (entranceStart.current === null) entranceStart.current = now;
      const elapsed = now - entranceStart.current;
      const t = Math.min(elapsed / duration, 1);
      setEntranceProgress(easeOutCubic(t));
      if (t < 1) entranceRaf.current = requestAnimationFrame(tick);
    };
    entranceRaf.current = requestAnimationFrame(tick);
    return () => {
      if (entranceRaf.current) cancelAnimationFrame(entranceRaf.current);
    };
  }, [ready, entranceProgress]);

  const focusedHotspot = focusedId ? HOTSPOTS.find((h) => h.id === focusedId) : null;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocusedId(null);
        setAscendPanelOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    const el = heroStageRef.current;
    if (!el) return;
    const onPointerDown = (e: PointerEvent) => {
      document.body.style.overflow = "hidden";
      if (e.pointerType === "touch") e.preventDefault();
    };
    const onPointerUp = () => {
      document.body.style.overflow = "";
    };
    const onPointerLeave = () => {
      document.body.style.overflow = "";
    };
    el.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { passive: false });
    el.addEventListener("pointerleave", onPointerLeave, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onPointerLeave);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <section
      ref={heroStageRef}
      id="hero-stage"
      className={`hero3d relative w-full overflow-hidden isolate ${debugUi ? "debug-ui" : ""}`}
      style={{
        touchAction: "none",
        width: "100%",
        height: "100dvh",
        minHeight: 640,
        overflow: "hidden",
        position: "relative",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "#000",
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white/60 text-sm">Loading…</div>
          </div>
        }
      >
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: entranceProgress < 0.2 ? entranceProgress / 0.2 : 1,
            pointerEvents: "none",
          }}
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
            onAscendCtaClick={handleAscendCtaClick}
            cameraFocusMainWall={ascendPanelOpen}
            onReady={() => setReady(true)}
            userInteracting={userInteracting}
            onUserInteractingChange={setUserInteracting}
            debugUi={debugUi}
            resetViewTrigger={resetViewTrigger}
            showCenterPulse={showCenterPulse}
            entranceProgress={entranceProgress}
          />
        </div>
      </Suspense>

      <OverlayUI
        onResetView={handleResetView}
        showTapHint={showTapHint}
        ready={ready}
        isMobile={isMobile}
        entranceProgress={entranceProgress}
        glassStyle
      />

      {focusedHotspot && (
        <div
          className="pointer-events-none fixed inset-0 z-[16]"
          style={{ background: "rgba(0,0,0,0.2)" }}
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
      {focusedHotspot && panelRevealed && (
        <InfoPanel
          hotspot={focusedHotspot}
          isMobile={isMobile}
          onClose={() => setFocusedId(null)}
          onResetView={handleResetView}
          onCtaClick={() => handleCtaClick(focusedHotspot.href)}
          glassStyle
        />
      )}

      {ascendPanelOpen && (
        <AscendConfirmPanel
          isMobile={isMobile}
          onClose={handleExploreFirst}
          onAscend={handleAscendConfirm}
          onExploreFirst={handleExploreFirst}
          glassStyle
        />
      )}

      {ascendTransitioning && (
        <div
          className="fixed inset-0 z-[30] pointer-events-none bg-black/60"
          aria-hidden
          style={{ animation: "ascend-overlay-in 0.7s ease-out forwards" }}
        />
      )}
    </section>
  );
}

const GLASS_STYLES = {
  panel: {
    background: "rgba(255,255,255,0.10)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.14)",
  },
  title: { color: "rgba(255,255,255,0.93)" },
  body: { color: "rgba(255,255,255,0.72)" },
  primaryButton: {
    background: "rgba(255,255,255,0.95)",
    color: "#1a1a1a",
  },
  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.3)",
    color: "rgba(255,255,255,0.9)",
  },
} as const;

function AscendConfirmPanel({
  isMobile,
  onClose,
  onAscend,
  onExploreFirst,
  glassStyle = true,
}: {
  isMobile: boolean;
  onClose: () => void;
  onAscend: () => void;
  onExploreFirst: () => void;
  glassStyle?: boolean;
}) {
  if (isMobile) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-20 rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          ...(glassStyle ? GLASS_STYLES.panel : {}),
          paddingBottom: "env(safe-area-inset-bottom)",
          animation: "slide-up 0.4s ease-out",
        }}
      >
        <div className="flex flex-col items-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/30" aria-hidden />
        </div>
        <div className="px-6 pb-6 pt-2">
          <h3 className="font-headline text-lg" style={glassStyle ? GLASS_STYLES.title : undefined}>Ascend With Us</h3>
          <p className="mt-1 text-sm" style={glassStyle ? GLASS_STYLES.body : undefined}>Join the founding circle and become part of Leo Mây.</p>
          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={onAscend}
              className="w-full rounded-full font-medium py-3 text-sm"
              style={glassStyle ? GLASS_STYLES.primaryButton : undefined}
              aria-label="Ascend"
            >
              Ascend
            </button>
            <button
              type="button"
              onClick={onExploreFirst}
              className="w-full rounded-full font-medium py-3 text-sm"
              style={glassStyle ? GLASS_STYLES.secondaryButton : undefined}
              aria-label="Explore first"
            >
              Explore first
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className="fixed top-1/2 right-8 z-20 w-full max-w-sm -translate-y-1/2 rounded-2xl shadow-xl p-6"
      style={{ ...(glassStyle ? GLASS_STYLES.panel : {}), animation: "fade-in 0.3s ease-out" }}
    >
      <h3 className="font-headline text-lg" style={glassStyle ? GLASS_STYLES.title : undefined}>Ascend With Us</h3>
      <p className="mt-2 text-sm" style={glassStyle ? GLASS_STYLES.body : undefined}>Join the founding circle and become part of Leo Mây.</p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onAscend}
          className="w-full rounded-full font-medium py-2.5 text-sm"
          style={glassStyle ? GLASS_STYLES.primaryButton : undefined}
          aria-label="Ascend"
        >
          Ascend
        </button>
        <button
          type="button"
          onClick={onExploreFirst}
          className="w-full rounded-full font-medium py-2.5 text-sm"
          style={glassStyle ? GLASS_STYLES.secondaryButton : undefined}
          aria-label="Explore first"
        >
          Explore first
        </button>
      </div>
    </div>
  );
}

function InfoPanel({
  hotspot,
  isMobile,
  onClose,
  onResetView,
  onCtaClick,
  glassStyle = true,
}: {
  hotspot: HotspotDef;
  isMobile: boolean;
  onClose: () => void;
  onResetView: () => void;
  onCtaClick: () => void;
  glassStyle?: boolean;
}) {
  const bullets = hotspot.highlights ?? [];

  if (isMobile) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-20 rounded-t-2xl shadow-2xl transition-transform duration-500 ease-out flex flex-col"
        style={{
          ...(glassStyle ? GLASS_STYLES.panel : {}),
          height: "65vh",
          maxHeight: "65vh",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex flex-col items-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/30" aria-hidden />
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-headline text-lg" style={glassStyle ? GLASS_STYLES.title : undefined}>{hotspot.label}</h3>
            <button
              type="button"
              className="shrink-0 w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white/90 hover:bg-white/10"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="mt-2 text-sm" style={glassStyle ? GLASS_STYLES.body : undefined}>{hotspot.shortDescription}</p>
          {bullets.length > 0 && (
            <ul className="mt-4 space-y-2">
              {bullets.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={glassStyle ? GLASS_STYLES.body : undefined}>
                  <span className="text-white/50">•</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onCtaClick()}
              className="w-full rounded-full font-medium py-3 text-sm"
              style={glassStyle ? GLASS_STYLES.primaryButton : undefined}
              aria-label={hotspot.ctaLabel}
            >
              {hotspot.ctaLabel}
            </button>
            <button
              type="button"
              onClick={() => { onResetView(); onClose(); }}
              className="w-full rounded-full font-medium py-3 text-sm"
              style={glassStyle ? GLASS_STYLES.secondaryButton : undefined}
              aria-label="Reset view"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed top-1/2 right-8 z-20 w-full max-w-md -translate-y-1/2 rounded-2xl shadow-xl p-6 transition-all duration-500 ease-in-out"
      style={glassStyle ? GLASS_STYLES.panel : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-headline text-lg" style={glassStyle ? GLASS_STYLES.title : undefined}>{hotspot.label}</h3>
          <p className="mt-2 text-sm" style={glassStyle ? GLASS_STYLES.body : undefined}>{hotspot.shortDescription}</p>
        </div>
        <button
          type="button"
          className="shrink-0 w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white/90 hover:bg-white/10"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onCtaClick()}
          className="w-full rounded-full font-medium py-2.5 text-sm"
          style={glassStyle ? GLASS_STYLES.primaryButton : undefined}
          aria-label={hotspot.ctaLabel}
        >
          {hotspot.ctaLabel}
        </button>
        <button
          type="button"
          onClick={() => { onResetView(); onClose(); }}
          className="w-full rounded-full font-medium py-2.5 text-sm"
          style={glassStyle ? GLASS_STYLES.secondaryButton : undefined}
          aria-label="Reset view"
        >
          Back
        </button>
      </div>
    </div>
  );
}
