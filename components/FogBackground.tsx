"use client";

interface FogBackgroundProps {
  variant?: "soft" | "deep" | "reveal";
  /** Mouse offset for parallax (-2..2). Parent passes from onMouseMove when needed. */
  mouse?: { x: number; y: number };
  className?: string;
}

const DUST_COUNT = 48;

export default function FogBackground({
  variant = "soft",
  mouse = { x: 0, y: 0 },
  className = "",
}: FogBackgroundProps) {
  const isReveal = variant === "reveal";

  return (
    <div
      className={`fog-root ${isReveal ? "fog-reveal" : ""} ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      {/* Base: only for soft/deep (reveal uses page's deep navy, no base) */}
      {!isReveal && (
        <div
          className="fog-base"
          style={{
            background:
              variant === "deep"
                ? "linear-gradient(180deg, #2a2e38 0%, #1e2228 40%, #181b22 100%)"
                : "linear-gradient(180deg, #3d4350 0%, #2e333d 50%, #22262e 100%)",
          }}
        />
      )}

      {/* Fog layers — reveal: 40% opacity, mix-blend-mode, avoid logo area (center) */}
      <div
        className={`fog-parallax-wrap ${isReveal ? "fog-reveal-layer" : ""}`}
        style={{ transform: `translate(${mouse.x * 0.5}%, ${mouse.y * 0.5}%)` }}
      >
        <div
          className="fog-layer-float"
          style={{
            background: isReveal
              ? "radial-gradient(ellipse 80% 60% at 30% 80%, rgba(255,252,248,0.04) 0%, transparent 50%)"
              : "radial-gradient(ellipse 120% 100% at 50% 70%, rgba(255,252,248,0.12) 0%, transparent 55%)",
          }}
        />
      </div>
      <div
        className={`fog-parallax-wrap ${isReveal ? "fog-reveal-layer" : ""}`}
        style={{ transform: `translate(${mouse.x * -0.3}%, ${mouse.y * -0.3}%)` }}
      >
        <div
          className="fog-layer-float fog-layer-2"
          style={{
            background: isReveal
              ? "radial-gradient(ellipse 70% 70% at 70% 20%, rgba(248,250,255,0.05) 0%, transparent 45%)"
              : "radial-gradient(ellipse 90% 80% at 30% 50%, rgba(248,246,242,0.18) 0%, transparent 50%)",
          }}
        />
      </div>
      <div
        className={`fog-parallax-wrap ${isReveal ? "fog-reveal-layer" : ""}`}
        style={{ transform: `translate(${mouse.x * 0.4}%, ${mouse.y * 0.2}%)` }}
      >
        <div
          className="fog-layer-float fog-layer-3"
          style={{
            background: isReveal
              ? "radial-gradient(ellipse 60% 80% at 20% 60%, rgba(255,252,248,0.03) 0%, transparent 50%)"
              : "radial-gradient(ellipse 80% 100% at 70% 60%, rgba(255,252,248,0.1) 0%, transparent 50%)",
          }}
        />
      </div>
      <div
        className={`fog-parallax-wrap ${isReveal ? "fog-reveal-layer" : ""}`}
        style={{ transform: `translate(${mouse.x * -0.2}%, ${mouse.y * -0.2}%)` }}
      >
        <div
          className="fog-layer-float fog-layer-4"
          style={{
            background: isReveal
              ? "radial-gradient(ellipse 50% 40% at 80% 70%, rgba(2,66,255,0.02) 0%, transparent 45%)"
              : "radial-gradient(ellipse 100% 60% at 50% 30%, rgba(2,66,255,0.03) 0%, transparent 45%)",
          }}
        />
      </div>

      {/* Noise — reduced for reveal */}
      <div className={isReveal ? "fog-noise fog-noise-subtle" : "fog-noise"} />

      {/* Dust — reduced for reveal */}
      <div className="fog-dust-container">
        {Array.from({ length: DUST_COUNT }).map((_, i) => (
          <div
            key={i}
            className="fog-dust"
            style={{
              left: `${(i * 17 + 13) % 100}%`,
              top: `${(i * 23 + 7) % 100}%`,
              animationDelay: `${(i % 20) * 0.25}s`,
              width: i % 3 === 0 ? 2 : 1,
              height: i % 3 === 0 ? 2 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
