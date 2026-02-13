"use client";

/**
 * Dreamlike background layer. Always present.
 * Deep gradient, subtle grain. pointer-events: none.
 */
export default function Atmosphere() {
  return (
    <div
      className="absolute inset-0 -z-10 pointer-events-none overflow-hidden"
      aria-hidden
    >
      {/* Base gradient — deep indigo, softer center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 100% at 50% 40%, rgba(15, 23, 42, 0.7) 0%, #050810 50%, #030508 100%)",
        }}
      />
      {/* Soft vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)",
        }}
      />
      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
