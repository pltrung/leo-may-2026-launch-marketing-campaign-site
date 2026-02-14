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
  const defaultShadow = "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)";
  const hoverGlow = isHovered ? `0 0 28px ${accent}70, 0 0 45px ${accent}40` : "";
  const activeGlow = isActive ? `0 0 35px ${accent}60, 0 0 55px ${accent}35` : "";
  const borderColor = isHovered || isActive ? accent : "rgba(255,255,255,0.5)";
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
          className="absolute inset-0 w-full h-full rounded-2xl flex flex-col justify-between p-5 lg:p-8 bg-white/90 border-2 transition-all duration-200 overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderColor,
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
          className="absolute inset-0 w-full h-full rounded-2xl flex flex-col justify-between p-5 lg:p-8 bg-white/90 border-2 transition-all duration-200 overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderColor,
            boxShadow,
          }}
        >
            <p
            className="font-body text-center text-xs sm:text-sm leading-[1.5] flex-1 px-2 py-1 flex items-center justify-center overflow-hidden"
            style={{ color: cloud.storyHex }}
          >
            {cloud.story}
          </p>
          <div className="shrink-0 flex justify-center pt-4 pb-2">
            <button
              type="button"
              onClick={handleJoinClick}
              className="relative flex items-center justify-center min-w-[140px] min-h-[64px] w-full max-w-[180px] px-6 py-3 hover:opacity-90 transition-opacity duration-200 border-0 cursor-pointer"
              style={{
                backgroundColor: accent,
                maskImage: "url('/brand/cloud-blue.svg')",
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskImage: "url('/brand/cloud-blue.svg')",
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
              }}
            >
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none" style={{ color: cloud.joinTextHex ?? "#ffffff" }}>
                <span className="font-subheadline text-sm">Join</span>
                <span className="font-subheadline text-sm">{cloud.name}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
