"use client";

import { useEffect, useState } from "react";
import BrandLogo from "./BrandLogo";

export default function FogIntro() {
  const [phase, setPhase] = useState<"fog" | "logo" | "headline" | "complete">(
    "fog"
  );

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("logo"), 2500);
    const t2 = setTimeout(() => setPhase("headline"), 4000);
    const t3 = setTimeout(() => setPhase("complete"), 5500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#f0f2f5] via-[#f5f7fa] to-[#e8eaed]">
      {/* Layered fog gradients */}
      <div
        className="fog-layer animate-[fogDrift_25s_ease-in-out_infinite]"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 30%, rgba(255,255,255,0.9) 0%, transparent 50%),
            radial-gradient(ellipse 100% 120% at 80% 70%, rgba(230,235,245,0.7) 0%, transparent 45%),
            radial-gradient(ellipse 80% 100% at 50% 50%, rgba(248,249,251,0.8) 0%, transparent 40%)
          `,
        }}
      />
      <div
        className="fog-layer animate-[fogDrift_30s_ease-in-out_infinite_reverse]"
        style={{
          background: `
            radial-gradient(ellipse 90% 90% at 70% 20%, rgba(255,255,255,0.6) 0%, transparent 40%),
            radial-gradient(ellipse 110% 90% at 30% 80%, rgba(235,240,250,0.5) 0%, transparent 50%)
          `,
          animationDelay: "-5s",
        }}
      />
      {/* Subtle parallax depth */}
      <div
        className="fog-layer transition-transform duration-1000"
        style={{
          background: `radial-gradient(ellipse 150% 100% at 50% 50%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
          animation: "fogDrift 20s ease-in-out infinite",
          animationDelay: "-2s",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        {phase !== "fog" && (
          <BrandLogo
            show={phase >= "logo"}
            withGlow={false}
            className="mb-8 opacity-0 transition-opacity duration-[1500ms]"
            style={{
              opacity: phase >= "logo" ? 1 : 0,
              filter: phase === "logo" ? "blur(4px)" : "blur(0)",
              transition: "opacity 1.5s ease-out, filter 1s ease-out",
            }}
          />
        )}
        {phase >= "headline" && (
          <div
            className="animate-[countUp_1s_ease-out_forwards] opacity-0"
            style={{ animationFillMode: "forwards" }}
          >
            <h1
              className="font-leo text-4xl font-semibold tracking-tight text-[#1a1d21] md:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-leo)" }}
            >
              Leo Mây
            </h1>
            <p className="mt-3 font-light tracking-wide text-[#4a4d52] md:text-lg">
              Climb the Clouds.
            </p>
          </div>
        )}
      </div>

      {/* Optional particle drift - subtle dots */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[#0242FF]/[0.08]"
            style={{
              left: `${15 + (i * 7) % 70}%`,
              top: `${10 + (i * 11) % 80}%`,
              animation: `fogDrift ${15 + (i % 5) * 3}s ease-in-out infinite`,
              animationDelay: `-${i * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
