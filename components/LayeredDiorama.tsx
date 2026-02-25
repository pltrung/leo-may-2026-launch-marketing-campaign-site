"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

const FALLBACK_SRC = "/leo-may-interactive-website-background.jpg";
const HERO_LAYERS_BASE = "/hero_layers";

export interface HeroLayerSpec {
  id: string;
  src: string;
  depthPx: number;
}

/** Layer order back-to-front. Depth in px for parallax (desktop). */
export const HERO_LAYERS: HeroLayerSpec[] = [
  { id: "sky", src: `${HERO_LAYERS_BASE}/sky.png`, depthPx: 2 },
  { id: "shell", src: `${HERO_LAYERS_BASE}/shell.png`, depthPx: 4 },
  { id: "left_zone", src: `${HERO_LAYERS_BASE}/left_zone.png`, depthPx: 8 },
  { id: "center_zone", src: `${HERO_LAYERS_BASE}/center_zone.png`, depthPx: 10 },
  { id: "right_zone", src: `${HERO_LAYERS_BASE}/right_zone.png`, depthPx: 8 },
  { id: "floor_foreground", src: `${HERO_LAYERS_BASE}/floor_foreground.png`, depthPx: 14 },
];

const PARALLAX_LERP = 0.08;
const FLOAT_DURATION_S = 7;
const FLOAT_PX = 3;

export interface LayeredDioramaProps {
  /** Opacity for entry reveal */
  opacity: number;
  /** Transform string from parent (focus zoom/translate) */
  transform: string;
  /** Transition for transform */
  transformTransition?: string;
  isMobile: boolean;
  /** Content to render inside each layer (e.g. hotspots) so it moves with parallax */
  layerContent?: Record<string, React.ReactNode>;
}

export default function LayeredDiorama({
  opacity,
  transform,
  transformTransition,
  isMobile,
  layerContent = {},
}: LayeredDioramaProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const targetNorm = useRef({ x: 0, y: 0 });
  const currentNorm = useRef({ x: 0, y: 0 });
  const rafId = useRef<number>(0);

  const handleLayerError = useCallback(() => {
    setUseFallback(true);
  }, []);

  // Mouse parallax: normalize to [-1, 1], smooth lerp in rAF, update state so layers re-render (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const x = (e.clientX - cx) / (rect.width / 2);
      const y = (e.clientY - cy) / (rect.height / 2);
      targetNorm.current = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      };
    };

    const tick = () => {
      const t = targetNorm.current;
      const c = currentNorm.current;
      c.x += (t.x - c.x) * PARALLAX_LERP;
      c.y += (t.y - c.y) * PARALLAX_LERP;
      setParallax({ x: c.x, y: c.y });
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [isMobile]);

  // Fallback: single JPG (no layers); hotspots still shown in one overlay so they work
  if (useFallback) {
    const allContent = Object.values(layerContent).flat().filter(Boolean);
    return (
      <div
        className="layered-diorama layered-diorama--fallback relative w-full h-full flex items-center justify-center"
        style={{
          opacity,
          transition: "opacity 500ms ease-out",
        }}
      >
        <div
          className="layered-diorama__stack relative w-full h-full"
          style={{
            transform,
            transition: transformTransition,
          }}
        >
          <div className="layered-diorama__float absolute inset-0">
            <Image
              src={FALLBACK_SRC}
              alt=""
              fill
              className="object-contain max-w-full"
              sizes="100vw"
              priority
            />
          </div>
          {allContent.length > 0 ? (
            <div className="absolute inset-0 pointer-events-auto">
              {allContent}
            </div>
          ) : null}
        </div>
        <style jsx>{`
          .layered-diorama__float {
            animation: ld-float 7s ease-in-out infinite;
          }
          @keyframes ld-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
        `}</style>
      </div>
    );
  }

  // Layered: each layer absolutely positioned, same anchor; parallax translate3d per layer
  return (
    <div
      ref={containerRef}
      className="layered-diorama relative w-full h-full flex items-center justify-center"
      style={{
        opacity,
        transition: "opacity 500ms ease-out",
      }}
    >
      {/* Contact shadow under the diorama */}
      <div
        className="layered-diorama__contact-shadow absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[85%] h-[12%] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 100% at 50% 50%, rgba(0,0,0,0.35) 0%, transparent 70%)",
          filter: "blur(12px)",
        }}
      />
      <div
        className="layered-diorama__stack relative w-full h-full"
        style={{
          transform,
          transition: transformTransition,
        }}
      >
        <div className="layered-diorama__float absolute inset-0 w-full h-full">
          {HERO_LAYERS.map((layer) => {
            const depth = layer.depthPx;
            const nx = isMobile ? 0 : parallax.x;
            const ny = isMobile ? 0 : parallax.y;
            const tx = nx * depth;
            const ty = ny * depth;
            return (
              <div
                key={layer.id}
                className="layered-diorama__layer absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `translate3d(${tx}px, ${ty}px, 0)`,
                  willChange: isMobile ? "auto" : "transform",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={layer.src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain max-w-full pointer-events-none"
                  onError={handleLayerError}
                />
                {layerContent[layer.id] != null ? (
                  <div className="absolute inset-0 pointer-events-auto">{layerContent[layer.id]}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .layered-diorama__float {
          animation: ld-float 7s ease-in-out infinite;
        }
        @keyframes ld-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
