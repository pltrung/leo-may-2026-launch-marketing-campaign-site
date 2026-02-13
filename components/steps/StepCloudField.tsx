"use client";

import { cloudPersonalities, CloudPersonality } from "@/lib/cloudData";

interface StepCloudFieldProps {
  onCloudClick: (personality: CloudPersonality) => void;
}

const blobShapes = [
  "42% 58% 55% 45% / 52% 48% 52% 48%",
  "60% 40% 30% 70% / 55% 45% 55% 45%",
  "38% 62% 62% 38% / 48% 52% 48% 52%",
  "55% 45% 40% 60% / 60% 40% 60% 40%",
  "45% 55% 55% 45% / 40% 60% 40% 60%",
  "50% 50% 35% 65% / 58% 42% 58% 42%",
];

const tintGlow: Record<string, string> = {
  neutral: "group-hover:shadow-[0_0_40px_rgba(0,0,0,0.08)]",
  blue: "group-hover:shadow-[0_0_40px_rgba(2,66,255,0.2)]",
  yellow: "group-hover:shadow-[0_0_40px_rgba(253,255,82,0.15)]",
  green: "group-hover:shadow-[0_0_40px_rgba(0,203,77,0.2)]",
};

export default function StepCloudField({ onCloudClick }: StepCloudFieldProps) {
  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-gradient-to-b from-[#f0f2f5] via-[#f5f7fa] to-[#e8eaed]">
      {/* Fog background */}
      <div
        className="fog-layer"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 30%, rgba(255,255,255,0.85) 0%, transparent 50%),
            radial-gradient(ellipse 100% 120% at 80% 70%, rgba(230,235,245,0.6) 0%, transparent 45%)
          `,
          animation: "fogDrift 25s ease-in-out infinite",
        }}
      />
      <div className="grain-overlay" />

      {/* 6 floating cloud blobs — NO names, only glow on hover */}
      <div className="relative z-10 flex min-h-screen flex-wrap items-center justify-center gap-10 p-6 md:gap-14 md:p-12">
        {cloudPersonalities.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onCloudClick(p)}
            className={`
              group relative cursor-pointer transition-all duration-500
              hover:scale-110
              md:h-40 md:w-48
              h-36 w-44
              ${tintGlow[p.tint] || tintGlow.neutral}
            `}
            style={{
              borderRadius: blobShapes[i % blobShapes.length],
              animation: `cloudFloat ${6 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
              boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.94)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
