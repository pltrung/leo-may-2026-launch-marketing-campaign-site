"use client";

import { CloudPersonality } from "@/lib/cloudData";

const COLORS: Record<string, string> = {
  neutral: "#94a3b8",
  blue: "#0242FF",
  yellow: "#FDFF52",
  green: "#00CB4D",
};

export default function CloudDetails({
  cloud,
  onPick,
}: {
  cloud: CloudPersonality;
  onPick: () => void;
}) {
  const accent = COLORS[cloud.tint] ?? COLORS.neutral;
  const isLight = cloud.tint === "yellow";

  return (
    <div className="flex flex-col items-center justify-center gap-12 px-8 max-w-lg text-center fade-in">
      <div
        className="w-16 h-16 rounded-2xl"
        style={{ backgroundColor: accent }}
      />
      <div>
        <h2 className="text-white text-2xl sm:text-3xl font-light tracking-tight">
          {cloud.name}
        </h2>
        <p className="text-white/50 text-sm mt-1">{cloud.nameVi} · {cloud.mood}</p>
      </div>
      <p className="text-white/80 text-base leading-relaxed whitespace-pre-line">
        {cloud.description}
      </p>
      <button
        type="button"
        onClick={onPick}
        className="px-10 py-4 rounded-full text-sm font-medium tracking-wider transition-all duration-300 hover:opacity-90"
        style={{
          backgroundColor: accent,
          color: isLight ? "#0f172a" : "white",
        }}
      >
        Pick This Cloud
      </button>
    </div>
  );
}
