"use client";

import { useState } from "react";
import { CloudPersonality } from "@/lib/cloudData";
import Image from "next/image";

interface CloudCardProps {
  cloud: CloudPersonality;
  onJoin: (cloud: CloudPersonality) => void;
}

/** Use cloud-blue.svg for blue-accent clouds, cloud.svg for others */
function getCloudSvg(cloud: CloudPersonality): string {
  const blueClouds: string[] = ["may_nhe", "giong"];
  return blueClouds.includes(cloud.id)
    ? "/brand/cloud-blue.svg"
    : "/brand/cloud.svg";
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

  const baseCardClass =
    "absolute inset-0 w-full h-full rounded-2xl flex flex-col items-center justify-center p-6 bg-white/90 shadow-md border border-transparent transition-all duration-200";
  const hoverBorder = isHovered ? cloud.accentHex : "transparent";
  const activeShadow = isActive
    ? `0 4px 20px ${cloud.accentHex}25`
    : "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";

  return (
    <div
      className={`w-full min-w-[140px] max-w-[200px] aspect-[3/4] mx-auto cursor-pointer transition-transform duration-200 ${isHovered ? "-translate-y-1" : ""}`}
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
          className={baseCardClass}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderColor: hoverBorder,
            boxShadow: activeShadow,
          }}
        >
          <div className="mb-4 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16">
            <Image
              src={getCloudSvg(cloud)}
              alt=""
              width={64}
              height={64}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-display text-xl sm:text-2xl font-medium text-storm">
            {cloud.name}
          </span>
        </div>

        {/* Back */}
        <div
          className={`${baseCardClass} justify-between`}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderColor: hoverBorder,
            boxShadow: activeShadow,
          }}
        >
          <p className="text-center text-base sm:text-lg leading-relaxed flex-1 flex items-center justify-center px-2 text-storm/90">
            {cloud.story}
          </p>
          <button
            type="button"
            onClick={handleJoinClick}
            className="w-full py-4 rounded-xl text-white font-semibold text-base sm:text-lg hover:opacity-90 transition-opacity duration-200 shadow-md"
            style={{ backgroundColor: cloud.accentHex }}
          >
            {cloud.joinLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
