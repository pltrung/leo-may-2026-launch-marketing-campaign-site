"use client";

import { cloudPersonalities, CloudPersonality } from "@/lib/cloudData";

const TINT_COLORS: Record<string, string> = {
  neutral: "#94a3b8",
  blue: "#0242FF",
  yellow: "#FDFF52",
  green: "#00CB4D",
};

interface CloudSelectionProps {
  onSelect: (cloud: CloudPersonality) => void;
}

export default function CloudSelection({ onSelect }: CloudSelectionProps) {
  const clouds = cloudPersonalities.slice(0, 5);

  return (
    <div className="flex flex-col items-center justify-center gap-12 px-4">
      <p className="text-white/80 text-lg" style={{ fontFamily: "var(--font-leo)" }}>
        What type of cloud are you?
      </p>
      <div className="flex flex-wrap gap-8 justify-center">
        {clouds.map((cloud) => (
          <button
            key={cloud.id}
            type="button"
            onClick={() => onSelect(cloud)}
            className="flex flex-col items-center gap-2 transition-transform hover:scale-110"
          >
            <div
              className="w-24 h-24 rounded-2xl"
              style={{
                backgroundColor: TINT_COLORS[cloud.tint] ?? TINT_COLORS.neutral,
              }}
            />
            <span className="text-white/70 text-sm" style={{ fontFamily: "var(--font-leo)" }}>
              {cloud.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
