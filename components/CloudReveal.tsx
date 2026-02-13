"use client";

import { CloudPersonality } from "@/lib/cloudData";

interface CloudRevealProps {
  personality: CloudPersonality;
  onClose: () => void;
  onJoinWaitlist: () => void;
}

export default function CloudReveal({
  personality,
  onClose,
  onJoinWaitlist,
}: CloudRevealProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Dimmed backdrop */}
      <div
        className="absolute inset-0 bg-[#1a1d21]/30 backdrop-blur-sm transition-opacity duration-500"
        onClick={onClose}
      />

      {/* Reveal card */}
      <div
        className="relative max-w-lg animate-[countUp_0.6s_ease-out_forwards] rounded-2xl bg-white/95 p-8 shadow-2xl opacity-0"
        style={{ animationFillMode: "forwards" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#6b7280] transition-colors hover:text-[#1a1d21]"
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

        <h3 className="font-leo text-2xl font-semibold text-[#1a1d21]">
          {personality.name}
        </h3>
        <p className="mt-1 text-sm text-[#6b7280]">{personality.nameVi}</p>

        <p className="mt-6 whitespace-pre-line font-light leading-relaxed text-[#4a4d52]">
          {personality.description}
        </p>

        <button
          onClick={onJoinWaitlist}
          className="mt-8 w-full rounded-xl bg-[#0242FF] py-4 font-medium text-white transition-all hover:bg-[#0242FF]/90 hover:shadow-lg hover:shadow-[#0242FF]/25 active:scale-[0.98]"
        >
          {personality.cta}
        </button>
      </div>
    </div>
  );
}
