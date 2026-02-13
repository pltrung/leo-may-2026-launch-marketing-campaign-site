"use client";

interface FogBackgroundProps {
  variant?: "soft" | "deep";
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
  return (
    <div
      className={`fog-root ${className}`}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
      aria-hidden
    >
      {/* Base: dark blue-grey gradient (depth) */}
      <div
        className="fog-base"
        style={{
          background:
            variant === "deep"
              ? "linear-gradient(180deg, #2a2e38 0%, #1e2228 40%, #181b22 100%)"
              : "linear-gradient(180deg, #3d4350 0%, #2e333d 50%, #22262e 100%)",
        }}
      />

      {/* Layer 1 — large radial, low opacity */}
      <div
        className="fog-parallax-wrap"
        style={{ transform: `translate(${mouse.x * 0.5}%, ${mouse.y * 0.5}%)` }}
        aria-hidden
      >
        <div
          className="fog-layer-float"
          style={{
            background:
              "radial-gradient(ellipse 120% 100% at 50% 70%, rgba(255,252,248,0.12) 0%, transparent 55%)",
          }}
        />
      </div>
      {/* Layer 2 — mid */}
      <div
        className="fog-parallax-wrap"
        style={{ transform: `translate(${mouse.x * -0.3}%, ${mouse.y * -0.3}%)` }}
      >
        <div
          className="fog-layer-float fog-layer-2"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 30% 50%, rgba(248,246,242,0.18) 0%, transparent 50%)",
          }}
        />
      </div>
      {/* Layer 3 */}
      <div
        className="fog-parallax-wrap"
        style={{ transform: `translate(${mouse.x * 0.4}%, ${mouse.y * 0.2}%)` }}
      >
        <div
          className="fog-layer-float fog-layer-3"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 70% 60%, rgba(255,252,248,0.1) 0%, transparent 50%)",
          }}
        />
      </div>
      {/* Layer 4 — subtle brand tint */}
      <div
        className="fog-parallax-wrap"
        style={{ transform: `translate(${mouse.x * -0.2}%, ${mouse.y * -0.2}%)` }}
      >
        <div
          className="fog-layer-float fog-layer-4"
          style={{
            background:
              "radial-gradient(ellipse 100% 60% at 50% 30%, rgba(2,66,255,0.03) 0%, transparent 45%)",
          }}
        />
      </div>

      {/* Noise texture overlay */}
      <div className="fog-noise" />

      {/* Floating dust particles */}
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
