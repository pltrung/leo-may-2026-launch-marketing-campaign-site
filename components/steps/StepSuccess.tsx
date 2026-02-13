"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface StepSuccessProps {
  position: number;
}

export default function StepSuccess({ position }: StepSuccessProps) {
  const [displayPosition, setDisplayPosition] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = position / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= position) {
        setDisplayPosition(position);
        clearInterval(timer);
      } else {
        setDisplayPosition(Math.floor(current));
      }
    }, stepDuration);
    return () => clearInterval(timer);
  }, [position]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#f0f2f5] via-[#f5f7fa] to-[#e8eaed]">
      {/* Fog */}
      <div
        className="fog-layer"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 30%, rgba(255,255,255,0.9) 0%, transparent 50%),
            radial-gradient(ellipse 100% 120% at 80% 70%, rgba(230,235,245,0.7) 0%, transparent 45%)
          `,
          animation: "fogDrift 25s ease-in-out infinite",
        }}
      />
      <div className="grain-overlay" />

      {/* Subtle logo with blue glow */}
      <div
        className="relative z-10 flex flex-col items-center px-6 text-center"
        style={{ animation: "countUp 0.8s ease-out forwards" }}
      >
        <div
          className="relative mb-8"
          style={{
            padding: "clamp(1.5rem, 4vw, 3rem)",
            maxWidth: "min(200px, 60vw)",
            filter: "drop-shadow(0 0 24px rgba(2,66,255,0.2))",
          }}
        >
          <Image
            src="/logo.svg"
            alt="Leo Mây"
            width={322}
            height={143}
            className="h-auto w-full object-contain"
          />
        </div>

        <h2 className="font-leo text-2xl font-semibold text-[#1a1d21] md:text-3xl">
          You&apos;re in.
        </h2>
        <p className="mt-4 text-[#4a4d52]">
          You are{" "}
          <span className="font-semibold text-[#0242FF]">#{displayPosition}</span>{" "}
          in the Founding Circle.
        </p>
        <p className="mt-6 text-sm font-light text-[#6b7280]">
          We&apos;ll reach out when it&apos;s time to climb the clouds.
        </p>
      </div>
    </div>
  );
}
