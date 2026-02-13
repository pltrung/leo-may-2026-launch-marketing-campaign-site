"use client";

import { CloudPersonality, CloudType } from "@/lib/cloudData";

interface CloudShapeProps {
  personality: CloudPersonality;
  isSelected?: boolean;
  onClick: () => void;
}

const tintStyles: Record<string, string> = {
  neutral: "bg-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.06)]",
  blue: "bg-white/95 shadow-[0_8px_32px_rgba(2,66,255,0.12)] ring-1 ring-[#0242FF]/10",
  yellow:
    "bg-white/95 shadow-[0_8px_32px_rgba(253,255,82,0.15)] ring-1 ring-[#FDFF52]/20",
  green:
    "bg-white/95 shadow-[0_8px_32px_rgba(0,203,77,0.12)] ring-1 ring-[#00CB4D]/10",
};

export default function CloudShape({
  personality,
  isSelected = false,
  onClick,
}: CloudShapeProps) {
  const tint = tintStyles[personality.tint] || tintStyles.neutral;

  return (
    <button
      onClick={onClick}
      className={`
        group relative flex min-h-[140px] min-w-[160px] cursor-pointer items-center justify-center
        rounded-[42%_58%_55%_45%/52%_48%_52%_48%] px-6 py-5
        transition-all duration-500 ease-out
        hover:scale-105 hover:shadow-xl
        ${tint}
        ${isSelected ? "scale-110 shadow-xl" : "animate-cloud-float"}
      `}
      style={{
        animationDelay: isSelected ? undefined : `${(Math.random() * 2).toFixed(1)}s`,
      }}
    >
      <span className="relative z-10 text-center font-medium text-[#1a1d21]">
        {personality.name}
      </span>
    </button>
  );
}
