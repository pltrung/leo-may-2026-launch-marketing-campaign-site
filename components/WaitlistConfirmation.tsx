"use client";

import { useEffect, useState } from "react";
import BrandLogo from "./BrandLogo";

interface WaitlistConfirmationProps {
  position: number;
  onClose: () => void;
}

export default function WaitlistConfirmation({
  position,
  onClose,
}: WaitlistConfirmationProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1a1d21]/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative max-w-md animate-[countUp_0.6s_ease-out_forwards] rounded-2xl bg-white p-8 text-center shadow-2xl opacity-0"
        style={{ animationFillMode: "forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#6b7280] hover:text-[#1a1d21]"
          aria-label="Close"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <BrandLogo show withGlow className="mx-auto mb-6" />

        <h2 className="font-leo text-xl font-semibold text-[#1a1d21]">
          You&apos;re in.
        </h2>
        <p className="mt-4 text-[#4a4d52]">
          You are number{" "}
          <span className="font-semibold text-[#0242FF]">{displayPosition}</span>{" "}
          in the Founding Circle.
        </p>
        <p className="mt-6 text-sm font-light text-[#6b7280]">
          We&apos;ll reach out when it&apos;s time to climb the clouds.
        </p>

        <button
          onClick={onClose}
          className="mt-8 w-full rounded-xl border border-[#e5e7eb] bg-white py-3 font-medium text-[#1a1d21] transition-colors hover:border-[#00CB4D] hover:bg-[#00CB4D]/5 hover:text-[#00CB4D]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
