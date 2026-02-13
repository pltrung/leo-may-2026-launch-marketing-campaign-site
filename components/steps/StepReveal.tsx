"use client";

import Image from "next/image";

interface StepRevealProps {
  onEnter: () => void;
}

export default function StepReveal({ onEnter }: StepRevealProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#f0f2f5] via-[#f5f7fa] to-[#e8eaed]">
      {/* Fog layers */}
      <div
        className="fog-layer"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 30%, rgba(255,255,255,0.9) 0%, transparent 50%),
            radial-gradient(ellipse 100% 120% at 80% 70%, rgba(230,235,245,0.7) 0%, transparent 45%)
          `,
          animation: "fogDrift 28s ease-in-out infinite",
        }}
      />
      <div
        className="fog-layer"
        style={{
          background: `radial-gradient(ellipse 110% 90% at 30% 80%, rgba(235,240,250,0.5) 0%, transparent 50%)`,
          animation: "fogDrift 32s ease-in-out infinite reverse",
          animationDelay: "-6s",
        }}
      />
      <div className="grain-overlay" />

      {/* Logo + tagline — blur to sharp */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div
          className="flex items-center justify-center transition-all duration-[1500ms] ease-out"
          style={{
            opacity: 1,
            filter: "blur(0)",
            animation: "logoReveal 1.5s ease-out forwards",
          }}
        >
          <div className="relative" style={{ padding: "clamp(2rem, 6vw, 4rem)", maxWidth: "min(280px, 80vw)" }}>
            <Image
              src="/logo.svg"
              alt="Leo Mây"
              width={322}
              height={143}
              className="h-auto w-full object-contain"
              priority
            />
          </div>
        </div>
        <h1
          className="mt-6 font-leo text-3xl font-semibold tracking-tight text-[#1a1d21] opacity-0 md:text-5xl"
          style={{
            fontFamily: "var(--font-leo)",
            animation: "countUp 1s ease-out 0.5s forwards",
          }}
        >
          Leo Mây
        </h1>
        <p
          className="mt-2 font-light tracking-wide text-[#4a4d52] opacity-0 md:text-lg"
          style={{ animation: "countUp 1s ease-out 0.7s forwards" }}
        >
          Climb the Clouds. Build a Culture.
        </p>

        <button
          onClick={onEnter}
          className="mt-12 rounded-full bg-[#0242FF] px-8 py-3 font-medium text-white opacity-0 transition-all hover:bg-[#0242FF]/90 hover:shadow-lg hover:shadow-[#0242FF]/25 active:scale-[0.98]"
          style={{ animation: "countUp 0.6s ease-out 1.2s forwards" }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
