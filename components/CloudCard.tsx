"use client";

import { useState, useRef, useEffect } from "react";
import { CloudPersonality } from "@/lib/cloudData";
import CloudIconByType from "./CloudIcons";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";

interface CloudCardProps {
  cloud: CloudPersonality;
  onJoin: (cloud: CloudPersonality) => void;
}

export default function CloudCard({ cloud, onJoin }: CloudCardProps) {
  const locale = useLocale();
  const t = getMessages(locale).common;
  const story = locale === "vi" && cloud.storyVi ? cloud.storyVi : cloud.story;
  const shortName = locale === "vi" && cloud.shortNameVi ? cloud.shortNameVi : (cloud.shortNameEn ?? cloud.nameEn);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCardClick = () => {
    setIsFlipped((prev) => !prev);
  };

  useEffect(() => {
    if (!isFlipped) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsFlipped(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFlipped]);

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

  const sharedFaceStyle = {
    backfaceVisibility: "hidden" as const,
    WebkitBackfaceVisibility: "hidden" as const,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor,
    borderWidth: "1px",
    boxShadow,
  };

  return (
    <div
      ref={cardRef}
      className="cloud-card w-full min-w-[140px] max-w-[200px] lg:max-w-none mx-auto cursor-pointer overflow-hidden rounded-[24px] aspect-[3/4] max-h-[65vh] lg:max-h-[65vh] transition-transform duration-300 ease-out"
      style={{
        perspective: 1000,
        transform: isHovered && !isFlipped ? "translateY(-4px)" : undefined,
      }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      <div
        className="cloud-card-inner relative w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.6s ease",
        }}
      >
        {/* Front: equal height, centered content */}
        <div
          className="cloud-card-front absolute inset-0 flex flex-col items-center justify-center text-center rounded-[24px] p-6 border backdrop-blur-[12px]"
          style={sharedFaceStyle}
        >
          <div className="mb-3" style={{ color: accent }}>
            <CloudIconByType cloudId={cloud.id} className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
          <span className="font-subheadline text-base sm:text-lg leading-tight" style={{ color: accent }}>
            {cloud.name}
          </span>
          <span
            className="font-body text-xs sm:text-sm tracking-[0.5px] mt-0.5"
            style={{ color: accent, opacity: 0.85 }}
          >
            {shortName}
          </span>
        </div>

        {/* Back: equal height, scrollable story inside card boundary, no overflow outside */}
        <div
          className="cloud-card-back absolute inset-0 flex flex-col items-center justify-center text-center rounded-[24px] p-6 border backdrop-blur-[12px]"
          style={{
            ...sharedFaceStyle,
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center">
            <div className="cloud-card-back-scroll w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] text-center flex items-center justify-center">
              <p
                className="font-body text-sm leading-[1.5] text-[#1a1a1a] px-1"
                style={{ opacity: 0.9 }}
              >
                {story}
              </p>
            </div>
          </div>
          <div className="shrink-0 flex justify-center pt-4 pb-0">
            <button
              type="button"
              onClick={handleJoinClick}
              className="flex items-center justify-center min-w-[140px] min-h-[56px] w-full max-w-[180px] px-6 py-3 hover:opacity-90 transition-opacity duration-200 border-0 cursor-pointer rounded-2xl"
              style={{
                backgroundColor: accent,
                color: cloud.joinTextHex ?? "#ffffff",
                boxShadow: `0 0 24px ${accent}60, 0 4px 16px rgba(0,0,0,0.15)`,
              }}
            >
              <span className="font-subheadline text-sm">{t.joinTeam} {cloud.name}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
