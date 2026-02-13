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

  const handleCardClick = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJoin(cloud);
  };

  const isLightBg =
    cloud.id === "ho_may" || cloud.id === "cau_vong" || cloud.id === "gio";

  return (
    <div
      className="w-full min-w-[140px] max-w-[200px] aspect-[3/4] mx-auto cursor-pointer transition-transform duration-200 hover:scale-105"
      style={{ perspective: "1000px" }}
      onClick={handleCardClick}
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
          className={`absolute inset-0 w-full h-full rounded-2xl shadow-lg flex flex-col items-center justify-center p-6 ${cloud.bgClass}`}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <div className={`mb-4 ${isLightBg ? "text-storm" : "text-white"}`}>
            <CloudIconByType cloudId={cloud.id} className="w-14 h-14" />
          </div>
          <span className={`font-display text-lg font-medium ${cloud.textClass}`}>
            {cloud.name}
          </span>
          <span
            className={`text-sm mt-1 ${isLightBg ? "text-storm/70" : "text-white/70"}`}
          >
            {cloud.mood}
          </span>
        </div>

        {/* Back */}
        <div
          className={`absolute inset-0 w-full h-full rounded-2xl shadow-lg flex flex-col items-center justify-between p-6 ${cloud.bgClass}`}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <p
            className={`text-center text-sm leading-relaxed flex-1 flex items-center justify-center px-2 ${
              isLightBg ? "text-storm" : "text-white/90"
            }`}
          >
            {cloud.story}
          </p>
          <button
            type="button"
            onClick={handleJoinClick}
            className="w-full py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity duration-200 shadow-lg"
            style={{ backgroundColor: cloud.accentHex }}
          >
            {cloud.joinLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
