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
  /** Desktop: parent tracks which card is expanded so grid can use items-start (grow downward) */
  isExpanded?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
}

export default function CloudCard({ cloud, onJoin, isExpanded, onFlippedChange }: CloudCardProps) {
  const locale = useLocale();
  const t = getMessages(locale).common;
  const story = locale === "vi" && cloud.storyVi ? cloud.storyVi : cloud.story;
  const shortName = locale === "vi" && cloud.shortNameVi ? cloud.shortNameVi : (cloud.shortNameEn ?? cloud.nameEn);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCardClick = () => {
    const next = !isFlipped;
    setIsFlipped(next);
    onFlippedChange?.(next);
  };

  useEffect(() => {
    if (!isFlipped) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsFlipped(false);
        onFlippedChange?.(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFlipped, onFlippedChange]);

  // When parent clears expanded (e.g. another card opened), flip this one back
  useEffect(() => {
    if (isExpanded === false && isFlipped) setIsFlipped(false);
  }, [isExpanded, isFlipped]);

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

  const backContent = (
    <>
      <p className="font-body text-center text-sm leading-[1.5] flex-1 min-h-0 px-2 py-1 flex items-center justify-center text-[#1a1a1a]" style={{ opacity: 0.9 }}>
        {story}
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
          <span className="font-subheadline text-sm">{t.joinTeam} {cloud.name}</span>
        </button>
      </div>
    </>
  );

  return (
    <div
      ref={cardRef}
      className={`w-full min-w-[140px] max-w-[200px] lg:max-w-none aspect-[3/4] lg:max-h-[65vh] mx-auto cursor-pointer transition-all duration-300 ease-out ${isHovered && !isFlipped ? "-translate-y-1" : ""} ${isFlipped ? "lg:!max-w-[380px] lg:!min-h-[380px] lg:!max-h-[85vh] lg:!aspect-auto lg:self-start lg:z-10" : ""}`}
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
                {shortName}
              </span>
            </div>
          </div>
        </div>

        {/* Back: same flip on mobile and desktop; on desktop card is larger so text fits */}
        <div
          className="absolute inset-0 w-full h-full rounded-[24px] flex flex-col justify-between p-5 lg:p-8 border transition-all duration-200 backdrop-blur-[12px] overflow-y-auto overflow-x-hidden"
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
          {backContent}
        </div>
      </div>
    </div>
  );
}
