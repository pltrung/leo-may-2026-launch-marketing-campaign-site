"use client";

import { cloudPersonalities, CloudPersonality } from "@/lib/cloudData";

const COLORS: Record<string, string> = {
  neutral: "#94a3b8",
  blue: "#0242FF",
  yellow: "#FDFF52",
  green: "#00CB4D",
};

export default function CloudSelection({
  onSelect,
}: {
  onSelect: (cloud: CloudPersonality) => void;
}) {
  const clouds = cloudPersonalities.slice(0, 5);

  return (
    <div className="flex flex-col items-center justify-center gap-16 px-6 fade-in">
      <h2 className="text-white/90 text-xl sm:text-2xl font-light tracking-wide text-center max-w-md">
        What type of cloud are you?
      </h2>
      <div className="flex flex-wrap gap-6 sm:gap-10 justify-center">
        {clouds.map((cloud) => (
          <button
            key={cloud.id}
            type="button"
            onClick={() => onSelect(cloud)}
            className="flex flex-col items-center gap-3 group"
          >
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl transition-transform duration-300 group-hover:scale-105"
              style={{
                backgroundColor: COLORS[cloud.tint] ?? COLORS.neutral,
              }}
            />
            <span className="text-white/60 text-sm group-hover:text-white/90 transition-colors">
              {cloud.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
