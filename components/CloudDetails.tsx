"use client";

import { CloudPersonality } from "@/lib/cloudData";

interface CloudDetailsProps {
  cloud: CloudPersonality;
  onPick: () => void;
}

export default function CloudDetails({ cloud, onPick }: CloudDetailsProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 px-6 max-w-md text-center">
      <h2 className="text-2xl font-medium text-white" style={{ fontFamily: "var(--font-leo)" }}>
        {cloud.name}
      </h2>
      <p className="text-white/70 text-base whitespace-pre-line" style={{ fontFamily: "var(--font-leo)" }}>
        {cloud.description}
      </p>
      <button
        type="button"
        onClick={onPick}
        className="px-8 py-3 rounded-lg bg-[#0242FF] hover:bg-[#0338dd] text-white text-sm font-medium transition-colors"
        style={{ fontFamily: "var(--font-leo)" }}
      >
        Pick This Cloud
      </button>
    </div>
  );
}
