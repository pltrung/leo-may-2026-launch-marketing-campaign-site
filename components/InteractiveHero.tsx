"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";

const DIORAMA_SRC = "/leo-may-interactive-website-background.jpg";

// Hotspot config: x, y, w, h in percentage. primary = Main Arena (breathing glow, larger tap).
export interface HotspotConfig {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  primary?: boolean;
}

const HOTSPOTS: HotspotConfig[] = [
  { id: "main", label: "Main Arena", x: 26, y: 8, w: 48, h: 45, primary: true },
  { id: "left", label: "Training", x: 8, y: 18, w: 28, h: 40 },
  { id: "right", label: "Community", x: 64, y: 18, w: 28, h: 40 },
  { id: "pads", label: "Membership", x: 20, y: 55, w: 30, h: 30 },
  { id: "lounge", label: "Founding Circle", x: 55, y: 55, w: 35, h: 30 },
];

const PRIMARY_ID = "main";
const FOUNDING_CIRCLE_ID = "lounge";

export interface InteractiveHeroProps {
  onJoin: () => void;
}

const FOCUS_SCALE = 1.08;
const FOCUS_DURATION_MS = 500;
const FOCUS_TRANSLATE_MAX_PX = 24;
const ENTRY_ZOOM_START = 1.02;
const ENTRY_ZOOM_DURATION_MS = 800;
const LOGO_FADE_MS = 300;
const DIORAMA_FADE_MS = 500;
const PRIMARY_GLOW_DELAY_MS = 1000;
const MOBILE_HINT_DURATION_MS = 3000;
const MIN_TAP_PX = 60;

export default function InteractiveHero({ onJoin }: InteractiveHeroProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [entryPhase, setEntryPhase] = useState<"logo" | "diorama" | "ready">("logo");
  const [logoVisible, setLogoVisible] = useState(false);
  const [dioramaReveal, setDioramaReveal] = useState(false);
  const [initialZoom, setInitialZoom] = useState(ENTRY_ZOOM_START);
  const [primaryGlowOn, setPrimaryGlowOn] = useState(false);
  const [showMobileHint, setShowMobileHint] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef(0);
  const panelTouchStartY = useRef(0);

  // Entry choreography: logo fades in 300ms, then diorama fades in 500ms, then ready; primary glow at 1s
  useEffect(() => {
    const r = requestAnimationFrame(() => setLogoVisible(true));
    return () => cancelAnimationFrame(r);
  }, []);
  useEffect(() => {
    const t1 = setTimeout(() => {
      setEntryPhase("diorama");
      setDioramaReveal(true);
    }, LOGO_FADE_MS);
    const t2 = setTimeout(() => setEntryPhase("ready"), LOGO_FADE_MS + DIORAMA_FADE_MS);
    const t3 = setTimeout(() => setPrimaryGlowOn(true), PRIMARY_GLOW_DELAY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Initial zoom 1.02 → 1 over 800ms once ready
  useEffect(() => {
    if (entryPhase !== "ready") return;
    const start = performance.now();
    const frame = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= ENTRY_ZOOM_DURATION_MS) {
        setInitialZoom(1);
        return;
      }
      const t = elapsed / ENTRY_ZOOM_DURATION_MS;
      setInitialZoom(ENTRY_ZOOM_START + (1 - ENTRY_ZOOM_START) * t);
      requestAnimationFrame(frame);
    };
    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [entryPhase]);

  // Mobile: hide "Tap to explore" after 3s
  useEffect(() => {
    if (!isMobile) return;
    const t = setTimeout(() => setShowMobileHint(false), MOBILE_HINT_DURATION_MS);
    return () => clearTimeout(t);
  }, [isMobile]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 50;
    if (Math.abs(dx) < threshold) return;
    setActiveIndex((i) => {
      if (dx > 0) return i === 0 ? HOTSPOTS.length - 1 : i - 1;
      return i === HOTSPOTS.length - 1 ? 0 : i + 1;
    });
  }, []);

  const handleHotspotClick = useCallback((id: string) => {
    setFocusedId((prev) => (prev === id ? null : id));
  }, []);

  const handleCloseFocus = useCallback(() => setFocusedId(null), []);

  // Ascend CTA: open Founding Circle focus + sheet (narrative); optional onJoin for analytics
  const handleAscendClick = useCallback(() => {
    setFocusedId(FOUNDING_CIRCLE_ID);
    onJoin();
  }, [onJoin]);

  const scrollToNext = useCallback(() => {
    const next = document.getElementById("final-cta") ?? document.querySelector("[data-hero-next]");
    next?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const focusedHotspot = focusedId ? HOTSPOTS.find((h) => h.id === focusedId) : null;
  const focusTranslate = focusedHotspot
    ? {
        x: -((focusedHotspot.x + focusedHotspot.w / 2 - 50) / 50) * FOCUS_TRANSLATE_MAX_PX,
        y: -((focusedHotspot.y + focusedHotspot.h / 2 - 50) / 50) * FOCUS_TRANSLATE_MAX_PX,
      }
    : { x: 0, y: 0 };

  const dioramaScale = focusedId ? FOCUS_SCALE : initialZoom;
  const dioramaTransform = `translate(${focusTranslate.x}px, ${focusTranslate.y}px) scale(${dioramaScale})`;

  return (
    <section
      ref={sectionRef}
      className="interactive-hero relative min-h-[100dvh] h-[100dvh] w-full overflow-hidden flex flex-col"
      style={{ scrollSnapAlign: "start" }}
      data-hero="interactive"
    >
      {/* Layer 1 — Anchored sky: 2 soft gradient layers, slow drift, opacity breathing */}
      <div className="interactive-hero__sky absolute inset-0 z-0" aria-hidden>
        <div className="interactive-hero__sky-layer interactive-hero__sky-layer--1" />
        <div className="interactive-hero__sky-layer interactive-hero__sky-layer--2" />
      </div>

      {/* Radial lighting behind center of image (visual anchor) */}
      <div
        className="interactive-hero__radial-light absolute inset-0 z-[0] pointer-events-none"
        aria-hidden
      />

      {/* Layer 2 — Diorama: grounded, float, entry zoom + fade */}
      <div className="interactive-hero__diorama-wrap absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
        <div
          className="interactive-hero__diorama-transform relative w-full h-full flex items-center justify-center"
          style={{
            transform: dioramaTransform,
            transition: focusedId
              ? `transform ${FOCUS_DURATION_MS}ms ease-in-out`
              : "transform 500ms ease-out",
          }}
        >
          <div
            className="interactive-hero__diorama-float relative w-full h-full"
            style={{
              opacity: dioramaReveal ? 1 : 0,
              transition: `opacity ${DIORAMA_FADE_MS}ms ease-out`,
            }}
          >
            <Image
              src={DIORAMA_SRC}
              alt=""
              fill
              className="object-contain max-w-full"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      </div>

      {/* Soft vignette at edges */}
      <div className="interactive-hero__vignette absolute inset-0 z-[1] pointer-events-none" aria-hidden />

      {/* Entry: logo fades in over 300ms */}
      <div
        className="interactive-hero__logo absolute top-8 left-1/2 -translate-x-1/2 z-[2] flex justify-center pointer-events-none"
        style={{
          opacity: logoVisible ? 1 : 0,
          transition: `opacity ${LOGO_FADE_MS}ms ease-out`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.svg" alt="Leo Mây" className="h-8 w-auto object-contain opacity-90" />
      </div>

      {/* Layer 3 — Guided interaction: hotspots */}
      <div
        className="interactive-hero__hotspots absolute inset-0 z-[2] pointer-events-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="absolute inset-0 pointer-events-auto">
          {HOTSPOTS.map((h) => (
            <HotspotButton
              key={h.id}
              config={h}
              isFocused={focusedId === h.id}
              isDimmed={focusedId !== null && focusedId !== h.id}
              isPrimaryGlow={
                h.primary === true &&
                primaryGlowOn &&
                !focusedId &&
                (isMobile ? activeIndex === HOTSPOTS.findIndex((x) => x.id === h.id) : true)
              }
              isActive={
                !isMobile && focusedId === null
                  ? false
                  : activeIndex === HOTSPOTS.findIndex((x) => x.id === h.id)
              }
              isMobile={isMobile}
              onClick={() => handleHotspotClick(h.id)}
            />
          ))}
        </div>
      </div>

      {/* Mobile: "Tap to explore the gym" — fades out after 3s */}
      {isMobile && (
        <div
          className="interactive-hero__mobile-hint absolute bottom-24 left-1/2 -translate-x-1/2 z-[3] text-center text-white/70 text-sm tracking-wide transition-opacity duration-700 pointer-events-none"
          style={{ opacity: showMobileHint ? 1 : 0 }}
        >
          Tap to explore the gym
        </div>
      )}

      {/* Focus overlay: dim + backdrop blur 6px */}
      {focusedId && (
        <button
          type="button"
          className="interactive-hero__focus-backdrop absolute inset-0 z-[3] bg-black/30 backdrop-blur-[6px] transition-opacity duration-500 ease-in-out hover:outline-none focus:outline-none"
          onClick={handleCloseFocus}
          aria-label="Close"
        />
      )}

      {/* Modal (desktop) / Bottom sheet (mobile) */}
      {focusedHotspot && (
        <Panel
          hotspotId={focusedHotspot.id}
          label={focusedHotspot.label}
          isMobile={isMobile}
          open={!!focusedId}
          onClose={handleCloseFocus}
          onTouchStart={(e) => {
            panelTouchStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            const dy = e.changedTouches[0].clientY - panelTouchStartY.current;
            if (dy > 80) handleCloseFocus();
          }}
        />
      )}

      {/* CTA: Ascend With Us — opens Founding Circle; minimal, breathing glow 6s, hover 1.02 */}
      <div className="interactive-hero__cta-wrap fixed bottom-6 right-6 z-[5] pointer-events-auto">
        <span className="interactive-hero__cta-glow" aria-hidden />
        <button
          type="button"
          className="interactive-hero__cta rounded-full bg-white/90 text-storm font-medium px-6 py-3 text-sm tracking-wide hover:bg-white transition-transform duration-200"
          onClick={handleAscendClick}
        >
          Ascend With Us
        </button>
      </div>

      {/* Scroll arrow — bottom center, camera-down feel */}
      <button
        type="button"
        className="interactive-hero__scroll-down absolute bottom-6 left-1/2 -translate-x-1/2 z-[5] w-10 h-10 flex items-center justify-center rounded-full border border-white/30 text-white/80 hover:text-white hover:border-white/50 transition-colors pointer-events-auto"
        onClick={scrollToNext}
        aria-label="Scroll to next section"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </button>

      <style jsx>{`
        .interactive-hero__sky {
          background: linear-gradient(180deg, #0a1628 0%, #1a2d4a 40%, #243b55 100%);
        }
        .interactive-hero__sky-layer {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
        }
        .interactive-hero__sky-layer--1 {
          background: radial-gradient(ellipse 80% 50% at 20% 40%, rgba(255, 255, 255, 0.04) 0%, transparent 55%);
          animation: ih-drift-1 35s ease-in-out infinite, ih-breathe 8s ease-in-out infinite;
        }
        .interactive-hero__sky-layer--2 {
          background: radial-gradient(ellipse 60% 40% at 70% 30%, rgba(255, 255, 255, 0.03) 0%, transparent 50%);
          animation: ih-drift-2 38s ease-in-out infinite, ih-breathe 8s ease-in-out infinite 0.5s;
        }
        @keyframes ih-drift-1 {
          0%, 100% { transform: translateX(-2%); }
          50% { transform: translateX(2%); }
        }
        @keyframes ih-drift-2 {
          0%, 100% { transform: translateX(1.5%); }
          50% { transform: translateX(-1.5%); }
        }
        @keyframes ih-breathe {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 1; }
        }
        .interactive-hero__radial-light {
          background: radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255, 255, 255, 0.06) 0%, transparent 55%);
        }
        .interactive-hero__vignette {
          background: radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(0, 0, 0, 0.25) 100%);
        }
        .interactive-hero__diorama-float {
          animation: ih-float 7s ease-in-out infinite;
        }
        @keyframes ih-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .interactive-hero__diorama-transform {
          will-change: transform;
        }
        .interactive-hero__cta-wrap { position: relative; }
        .interactive-hero__cta { position: relative; z-index: 1; }
        .interactive-hero__cta:hover { transform: scale(1.02); }
        .interactive-hero__cta-glow {
          position: absolute;
          inset: -8px;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(79, 163, 255, 0.3) 0%, transparent 70%);
          animation: ih-cta-glow 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes ih-cta-glow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
        .interactive-hero__panel { opacity: 0; pointer-events: none; transition: opacity 500ms ease-in-out, transform 500ms ease-in-out; }
        .interactive-hero__panel.interactive-hero__panel--open { opacity: 1; pointer-events: auto; }
        .interactive-hero__panel.interactive-hero__panel--open:not(.interactive-hero__panel--mobile) { transform: translate(-50%, -50%); }
        .interactive-hero__panel.interactive-hero__panel--mobile { transform: translateY(100%); }
        .interactive-hero__panel.interactive-hero__panel--mobile.interactive-hero__panel--open { transform: translateY(0); }
        @media (hover: hover) {
          .interactive-hero__hotspot:hover .interactive-hero__hotspot-glow { opacity: 1; transform: scale(1.02); }
          .interactive-hero__hotspot:hover .interactive-hero__hotspot-label { opacity: 1; }
        }
        .interactive-hero__hotspot-glow--primary {
          animation: ih-primary-pulse 3s ease-in-out infinite;
        }
        @keyframes ih-primary-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .interactive-hero__hotspot-glow--active {
          animation: ih-active-pulse 2.5s ease-in-out infinite;
        }
        @keyframes ih-active-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
  );
}

function Panel({
  hotspotId,
  label,
  isMobile,
  open,
  onClose,
  onTouchStart,
  onTouchEnd,
}: {
  hotspotId: string;
  label: string;
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}) {
  const isFoundingCircle = hotspotId === FOUNDING_CIRCLE_ID;
  return (
    <div
      className={`interactive-hero__panel fixed z-[4] left-4 right-4 md:left-1/2 md:right-auto md:max-w-md md:-translate-x-1/2 bg-white/95 backdrop-blur-[6px] rounded-2xl shadow-lg p-6 transition-all duration-500 ease-in-out ${
        isMobile ? "interactive-hero__panel--mobile bottom-0 rounded-b-none rounded-t-2xl pb-[env(safe-area-inset-bottom)]" : "top-1/2 -translate-y-1/2"
      } ${open ? "interactive-hero__panel--open" : ""}`}
      onTouchStart={isMobile ? onTouchStart : undefined}
      onTouchEnd={isMobile ? onTouchEnd : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-headline text-lg text-storm">{label}</h3>
          {isFoundingCircle ? (
            <p className="mt-2 text-storm/80 text-sm">
              Join the founding community. Your name becomes part of Leo Mây from day one.
            </p>
          ) : (
            <p className="mt-2 text-storm/80 text-sm">Content placeholder.</p>
          )}
        </div>
        <button
          type="button"
          className="interactive-hero__panel-close shrink-0 w-10 h-10 rounded-full border border-storm/20 flex items-center justify-center text-storm hover:bg-storm/5 transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <span aria-hidden>×</span>
        </button>
      </div>
    </div>
  );
}

function HotspotButton({
  config,
  isFocused,
  isDimmed,
  isPrimaryGlow,
  isActive,
  isMobile,
  onClick,
}: {
  config: HotspotConfig;
  isFocused: boolean;
  isDimmed: boolean;
  isPrimaryGlow: boolean;
  isActive: boolean;
  isMobile: boolean;
  onClick: () => void;
}) {
  const isPrimary = config.primary === true;
  const scaleTap = isPrimary ? 1.12 : 1;

  const showGlow = isFocused || isPrimaryGlow || (isActive && isMobile);
  const glowClass =
    isPrimaryGlow && !isFocused
      ? "interactive-hero__hotspot-glow--primary"
      : isActive && !isFocused && isMobile
        ? "interactive-hero__hotspot-glow--active"
        : "";

  return (
    <button
      type="button"
      className="interactive-hero__hotspot absolute rounded-full transition-all duration-500 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      style={{
        left: `${config.x}%`,
        top: `${config.y}%`,
        width: `max(${config.w * scaleTap}%, ${MIN_TAP_PX}px)`,
        minWidth: MIN_TAP_PX,
        height: `max(${config.h * scaleTap}%, ${MIN_TAP_PX}px)`,
        minHeight: MIN_TAP_PX,
        transform: `translate(-50%, -50%) scale(${isFocused ? 1.08 : 1})`,
        opacity: isDimmed ? 0.6 : 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={config.label}
    >
      <span
        className={`interactive-hero__hotspot-glow absolute inset-0 rounded-full pointer-events-none ${glowClass}`}
        style={{
          background:
            showGlow
              ? "radial-gradient(circle at center, rgba(79, 163, 255, 0.22) 0%, rgba(79, 163, 255, 0.06) 40%, transparent 70%)"
              : "none",
          opacity: showGlow ? 1 : 0,
          transform: showGlow ? "scale(1.02)" : "scale(1)",
        }}
        aria-hidden
      />
      <span
        className="interactive-hero__hotspot-label absolute left-1/2 -translate-x-1/2 -bottom-9 whitespace-nowrap rounded-full bg-black/40 px-3 py-1.5 text-white/95 text-xs font-medium backdrop-blur-sm transition-opacity duration-300 pointer-events-none"
        style={{ opacity: isFocused || isPrimaryGlow || (isActive && isMobile) ? 1 : 0 }}
      >
        {config.label}
      </span>
    </button>
  );
}
