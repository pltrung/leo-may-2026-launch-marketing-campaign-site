"use client";

import { useState } from "react";
import { CloudPersonality } from "@/lib/cloudData";
import CloudIconByType from "./CloudIcons";

interface CloudCardProps {
  cloud: CloudPersonality;
  onJoin: (cloud: CloudPersonality) => void;
}

export default function CloudCard({ cloud, onJoin }: CloudCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handleCardClick = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJoin(cloud);
  };

  const accent = cloud.accentHex;
  const defaultShadow = "0 8px 30px rgba(0,0,0,0.12)";
  const hoverGlow = isHovered ? `0 0 40px ${accent}80, 0 0 60px ${accent}50` : "";
  const activeGlow = isActive ? `0 0 40px rgba(255,255,255,0.35), 0 10px 40px rgba(0,0,0,0.2)` : "";
  const borderColor = (() => {
    const r = parseInt(accent.slice(1, 3), 16);
    const g = parseInt(accent.slice(3, 5), 16);
    const b = parseInt(accent.slice(5, 7), 16);
    return `rgba(${r},${g},${b},0.35)`;
  })();
  const boxShadow = [defaultShadow, hoverGlow, activeGlow].filter(Boolean).join(", ");

  return (
    <div
      className={`w-full min-w-[140px] max-w-[200px] lg:max-w-[240px] aspect-[3/4] lg:aspect-auto lg:min-h-[420px] mx-auto cursor-pointer transition-transform duration-200 ${isHovered ? "-translate-y-1" : ""}`}
      style={{ perspective: "1000px" }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 w-full h-full rounded-[24px] flex flex-col justify-between p-5 lg:p-8 border backdrop-blur-[12px] transition-all duration-200 overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            backgroundColor: "rgba(255,255,255,0.92)",
            borderColor,
            borderWidth: "1px",
            boxShadow,
          }}
        >
          <div className="flex flex-col items-center justify-center flex-1 min-h-0">
            <div className="mb-3" style={{ color: accent }}>
              <CloudIconByType cloudId={cloud.id} className="w-12 h-12 sm:w-14 sm:h-14" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-subheadline text-base sm:text-lg text-center leading-tight" style={{ color: accent }}>
                {cloud.name}
              </span>
              <span
                className="font-body text-xs sm:text-sm text-center tracking-[0.5px]"
                style={{ color: accent, opacity: 0.85 }}
              >
                {cloud.shortNameEn ?? cloud.nameEn}
              </span>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 w-full h-full rounded-[24px] flex flex-col justify-between p-5 lg:p-8 border transition-all duration-200 overflow-hidden backdrop-blur-[12px]"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundColor: "rgba(255,255,255,0.92)",
            borderColor,
            borderWidth: "1px",
            boxShadow,
          }}
        >
          <p className="font-body text-center text-xs sm:text-sm leading-[1.5] flex-1 px-2 py-1 flex items-center justify-center overflow-hidden text-[#1a1a1a]" style={{ opacity: 0.9 }}>
            {cloud.story}
          </p>
          <div className="shrink-0 flex justify-center pt-4 pb-2">
            <button
              type="button"
              onClick={handleJoinClick}
              className="relative flex items-center justify-center min-w-[140px] min-h-[64px] w-full max-w-[180px] px-6 py-3 hover:opacity-90 transition-all duration-200 border-0 cursor-pointer rounded-2xl"
              style={{
                backgroundColor: accent,
                color: cloud.joinTextHex ?? "#ffffff",
                boxShadow: `0 0 24px ${accent}60, 0 4px 16px rgba(0,0,0,0.15)`,
              }}
            >
              <span className="font-subheadline text-sm">Join Team {cloud.name}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
