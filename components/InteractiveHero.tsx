"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";

const DIORAMA_SRC = "/leo-may-interactive-website-background.jpg";

// Config-based hotspots: x, y, w, h in percentage (0–100)
export interface HotspotConfig {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const HOTSPOTS: HotspotConfig[] = [
  { id: "main", label: "Main Arena", x: 26, y: 8, w: 48, h: 45 },
  { id: "left", label: "Training", x: 8, y: 18, w: 28, h: 40 },
  { id: "right", label: "Community", x: 64, y: 18, w: 28, h: 40 },
  { id: "pads", label: "Membership", x: 20, y: 55, w: 30, h: 30 },
  { id: "lounge", label: "Founding Circle", x: 55, y: 55, w: 35, h: 30 },
];

export interface InteractiveHeroProps {
  onJoin: () => void;
}

const PARALLAX_MAX = 10;
const FOCUS_SCALE = 1.08;
const FOCUS_DURATION_MS = 500;
const FOCUS_TRANSLATE_MAX_PX = 24;

export default function InteractiveHero({ onJoin }: InteractiveHeroProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef(0);
  const parallaxRef = useRef({ x: 0, y: 0 });
  const [, setParallaxTick] = useState(0);
  const panelTouchStartY = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ESC closes modal/panel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Desktop-only parallax: mouse move, max 10px
  useEffect(() => {
    if (isMobile) return;
    const el = sectionRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      parallaxRef.current = {
        x: Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, dx * PARALLAX_MAX)),
        y: Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, dy * PARALLAX_MAX)),
      };
      setParallaxTick((t) => t + 1);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [isMobile]);

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

  const scrollToNext = useCallback(() => {
    const next = document.getElementById("final-cta") ?? document.querySelector("[data-hero-next]");
    next?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const focusedHotspot = focusedId ? HOTSPOTS.find((h) => h.id === focusedId) : null;

  // Focus mode: translate diorama toward hotspot center (pixels, smooth)
  const focusTranslate = focusedHotspot
    ? {
        x: -((focusedHotspot.x + focusedHotspot.w / 2 - 50) / 50) * FOCUS_TRANSLATE_MAX_PX,
        y: -((focusedHotspot.y + focusedHotspot.h / 2 - 50) / 50) * FOCUS_TRANSLATE_MAX_PX,
      }
    : { x: 0, y: 0 };

  const parallax = isMobile ? { x: 0, y: 0 } : parallaxRef.current;
  const dioramaScale = focusedId ? FOCUS_SCALE : 1;
  const dioramaTransform = `translate(${parallax.x + focusTranslate.x}px, ${parallax.y + focusTranslate.y}px) scale(${dioramaScale})`;

  return (
    <section
      ref={sectionRef}
      className="interactive-hero relative min-h-[100dvh] h-[100dvh] w-full overflow-hidden flex flex-col"
      style={{ scrollSnapAlign: "start" }}
      data-hero="interactive"
    >
      {/* Layer A: Animated sky background — 2–3 radial gradient layers, horizontal drift, opacity breathing */}
      <div className="interactive-hero__sky absolute inset-0 z-0" aria-hidden>
        <div className="interactive-hero__sky-layer interactive-hero__sky-layer--1" />
        <div className="interactive-hero__sky-layer interactive-hero__sky-layer--2" />
        <div className="interactive-hero__sky-layer interactive-hero__sky-layer--3" />
      </div>

      {/* Layer B: Diorama — centered, float + parallax (desktop), focus zoom+translate */}
      <div className="interactive-hero__diorama-wrap absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
        <div
          className="interactive-hero__diorama-transform relative w-full h-full flex items-center justify-center"
          style={{
            transform: dioramaTransform,
            transition: focusedId ? `transform ${FOCUS_DURATION_MS}ms ease-in-out` : "transform 500ms ease-out",
          }}
        >
          <div className="interactive-hero__diorama-float relative w-full h-full">
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

      {/* Layer C: Hotspots + UI */}
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
              isActive={
                !isMobile && focusedId === null ? false : activeIndex === HOTSPOTS.findIndex((x) => x.id === h.id)
              }
              onClick={() => handleHotspotClick(h.id)}
              disabled={false}
            />
          ))}
        </div>
      </div>

      {/* Focus overlay: dim + backdrop blur */}
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

      {/* CTA: Ascend With Us — bottom-right, soft glow pulse (opacity only), hover scale 1.03 */}
      <div className="interactive-hero__cta-wrap fixed bottom-6 right-6 z-[5] pointer-events-auto">
        <span className="interactive-hero__cta-glow" aria-hidden />
        <button
          type="button"
          className="interactive-hero__cta rounded-full bg-white/90 text-storm font-medium px-6 py-3 text-sm tracking-wide hover:bg-white transition-transform duration-200"
          onClick={onJoin}
        >
          Ascend With Us
        </button>
      </div>

      {/* Scroll arrow — bottom center */}
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
          animation: ih-sky-drift-1 35s ease-in-out infinite, ih-sky-breathe 8s ease-in-out infinite;
        }
        .interactive-hero__sky-layer--2 {
          background: radial-gradient(ellipse 60% 40% at 70% 30%, rgba(255, 255, 255, 0.03) 0%, transparent 50%);
          animation: ih-sky-drift-2 40s ease-in-out infinite, ih-sky-breathe 8s ease-in-out infinite 0.5s;
        }
        .interactive-hero__sky-layer--3 {
          background: radial-gradient(ellipse 50% 60% at 50% 70%, rgba(255, 255, 255, 0.025) 0%, transparent 45%);
          animation: ih-sky-drift-3 32s ease-in-out infinite, ih-sky-breathe 8s ease-in-out infinite 1s;
        }
        @keyframes ih-sky-drift-1 {
          0%, 100% { transform: translateX(-2%); }
          50% { transform: translateX(2%); }
        }
        @keyframes ih-sky-drift-2 {
          0%, 100% { transform: translateX(1.5%); }
          50% { transform: translateX(-1.5%); }
        }
        @keyframes ih-sky-drift-3 {
          0%, 100% { transform: translateX(1%); }
          50% { transform: translateX(-1%); }
        }
        @keyframes ih-sky-breathe {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 1; }
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
        .interactive-hero__cta-wrap {
          position: relative;
        }
        .interactive-hero__cta {
          position: relative;
          z-index: 1;
        }
        .interactive-hero__cta:hover {
          transform: scale(1.03);
        }
        .interactive-hero__cta-glow {
          position: absolute;
          inset: -8px;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(79, 163, 255, 0.35) 0%, transparent 70%);
          animation: ih-cta-glow 5s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes ih-cta-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
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
        .interactive-hero__hotspot-glow.interactive-hero__hotspot-glow--active {
          animation: ih-hotspot-pulse 2.5s ease-in-out infinite;
        }
        @keyframes ih-hotspot-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
  );
}

function Panel({
  label,
  isMobile,
  open,
  onClose,
  onTouchStart,
  onTouchEnd,
}: {
  label: string;
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}) {
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
          <p className="mt-2 text-storm/80 text-sm">Content placeholder.</p>
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
  isActive,
  onClick,
  disabled,
}: {
  config: HotspotConfig;
  isFocused: boolean;
  isDimmed: boolean;
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      className="interactive-hero__hotspot absolute rounded-full transition-all duration-500 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      style={{
        left: `${config.x}%`,
        top: `${config.y}%`,
        width: `max(${config.w}%, 48px)`,
        minWidth: 48,
        height: `max(${config.h}%, 48px)`,
        minHeight: 48,
        transform: `translate(-50%, -50%) scale(${isFocused ? 1.08 : 1})`,
        opacity: isDimmed ? 0.6 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={config.label}
    >
      {/* Radial glow — soft sky blue, not harsh outline */}
      <span
        className={`interactive-hero__hotspot-glow absolute inset-0 rounded-full pointer-events-none ${
          isActive && !isFocused ? "interactive-hero__hotspot-glow--active" : ""
        }`}
        style={{
          background:
            isFocused || isActive
              ? "radial-gradient(circle at center, rgba(79, 163, 255, 0.25) 0%, rgba(79, 163, 255, 0.08) 40%, transparent 70%)"
              : "none",
          opacity: isFocused || isActive ? 1 : 0,
          transform: isFocused || isActive ? "scale(1.02)" : "scale(1)",
        }}
        aria-hidden
      />
      {/* Pill label — fade in on hover / focus */}
      <span
        className="interactive-hero__hotspot-label absolute left-1/2 -translate-x-1/2 -bottom-9 whitespace-nowrap rounded-full bg-black/40 px-3 py-1.5 text-white/95 text-xs font-medium backdrop-blur-sm transition-opacity duration-300 pointer-events-none"
        style={{ opacity: isFocused || isActive ? 1 : 0 }}
      >
        {config.label}
      </span>
    </button>
  );
}
