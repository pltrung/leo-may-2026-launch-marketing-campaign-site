"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudIconByType from "./CloudIcons";

interface CloudDetailsModalProps {
  cloud: CloudPersonality;
  onClose: () => void;
  onJoinTeam: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function CloudDetailsModal({ cloud, onClose, onJoinTeam }: CloudDetailsModalProps) {
  const accent = cloud.accentHex;
  const borderStyle = { borderColor: hexToRgba(accent, 0.35) };
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${cloud.name} details`}
    >
      <div
        className="cloud-details-modal cloud-details-modal-open w-full max-w-[320px] rounded-[24px] p-6 flex flex-col gap-4 cloud-card-base border backdrop-blur-xl"
        style={borderStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2">
          <div style={{ color: accent }}>
            <CloudIconByType cloudId={cloud.id} className="w-14 h-14 mx-auto" />
          </div>
          <span className="font-subheadline text-lg text-center" style={{ color: accent }}>
            {cloud.name}
          </span>
          <span className="font-body text-sm text-center opacity-80" style={{ color: accent }}>
            {cloud.shortNameEn ?? cloud.nameEn}
          </span>
        </div>
        <p
          className="font-body text-center text-sm leading-relaxed flex-1 text-[#1a1a1a]"
          style={{ opacity: 0.9 }}
        >
          {cloud.story}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-subheadline text-sm border border-[#ccc] text-[#555] transition-opacity hover:opacity-80"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onJoinTeam}
            className="cloud-join-team-btn flex-1 py-3 rounded-xl font-subheadline text-sm border-0 transition-all hover:opacity-90"
            style={{
              backgroundColor: accent,
              color: cloud.joinTextHex ?? "#ffffff",
              boxShadow: `0 0 24px ${accent}60, 0 4px 16px rgba(0,0,0,0.15)`,
            }}
          >
            Join Team {cloud.name}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CloudStackMobileProps {
  onSelect: (cloud: CloudPersonality) => void;
  onDetailsOpenChange?: (open: boolean) => void;
}

export default function CloudStackMobile({ onSelect, onDetailsOpenChange }: CloudStackMobileProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isBlooming, setIsBlooming] = useState(false);
  const [detailsCloud, setDetailsCloud] = useState<CloudPersonality | null>(null);
  const [swipeGuideVisible, setSwipeGuideVisible] = useState(true);
  const touchStartY = useRef(0);

  useEffect(() => {
    onDetailsOpenChange?.(detailsCloud !== null);
  }, [detailsCloud, onDetailsOpenChange]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % clouds.length);
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + clouds.length) % clouds.length);
  }, []);

  const getCloudAt = useCallback(
    (offset: number) => clouds[(activeIndex + offset + clouds.length) % clouds.length],
    [activeIndex]
  );

  const handleActiveTap = useCallback(() => {
    const cloud = getCloudAt(0);
    setDetailsCloud(cloud);
  }, [getCloudAt]);

  const handleJoinTeam = useCallback(() => {
    if (!detailsCloud) return;
    setIsBlooming(true);
    const cloud = detailsCloud;
    setDetailsCloud(null);
    setTimeout(() => onSelect(cloud), 450);
  }, [detailsCloud, onSelect]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
    setSwipeGuideVisible(false);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy < -22) goNext();
    else if (dy > 22) goPrev();
    setIsDragging(false);
  };

  const handleTouchCancel = () => setIsDragging(false);

  const getPositionClass = (offset: number) => {
    if (offset === -1) return "prev";
    if (offset === 0) return "active";
    if (offset === 1) return "next";
    if (offset === 2) return "far";
    return "hidden";
  };

  const hideSwipeGuide = useCallback(() => setSwipeGuideVisible(false), []);

  return (
    <div
      className={`cloud-stack-wrapper relative w-full flex-1 flex flex-col min-h-0 ${detailsCloud ? "has-selection" : ""}`}
      onMouseDown={hideSwipeGuide}
    >
      {isBlooming && <div className="cloud-stack-bloom" aria-hidden />}
      <div
        className={`swipe-guide md:hidden ${swipeGuideVisible ? "" : "swipe-guide-hidden"}`}
        aria-hidden
      >
        <img src="/brand/cloud-mini.svg" alt="" className="swipe-cloud" />
        <div className="swipe-text">Swipe up</div>
      </div>
      {detailsCloud && (
        <CloudDetailsModal
          cloud={detailsCloud}
          onClose={() => setDetailsCloud(null)}
          onJoinTeam={handleJoinTeam}
        />
      )}

      <div
        className={`card-stack flex-1 w-full min-h-0 ${isDragging ? "dragging" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{ touchAction: "pan-y" }}
      >
        {[-1, 0, 1, 2].map((offset) => {
          const cloud = getCloudAt(offset);
          const positionClass = getPositionClass(offset);
          if (positionClass === "hidden") return null;

          const isActive = positionClass === "active";
          const handleCardClick = isActive ? handleActiveTap : (positionClass === "next" || positionClass === "far") ? goNext : goPrev;
          return (
            <div
              key={cloud.id}
              className={`cloud-card ${positionClass}`}
              data-team={cloud.id}
              onClick={handleCardClick}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                handleCardClick();
              }}
              role="button"
              tabIndex={0}
              aria-label={isActive ? `Select ${cloud.name}` : (positionClass === "next" || positionClass === "far") ? "Next cloud" : "Previous cloud"}
            >
              <CloudCardInner cloud={cloud} isActive={isActive} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CloudCardInner({ cloud, isActive }: { cloud: CloudPersonality; isActive: boolean }) {
  const accent = cloud.accentHex;
  const glowColor = hexToRgba(accent, 0.25);
  const cardStyle = {
    borderColor: hexToRgba(accent, 0.35),
    ...(isActive && { ["--card-glow" as string]: glowColor }),
  };
  return (
    <div
      className={`cloud-card-inner cloud-card-base w-full h-full rounded-[24px] flex flex-col justify-center items-center p-6 overflow-hidden ${isActive ? "cloud-card-selected" : ""}`}
      style={cardStyle}
    >
      <div className="flex flex-col items-center justify-center flex-1 min-h-0">
        <div className="mb-3" style={{ color: accent }}>
          <CloudIconByType cloudId={cloud.id} className="w-14 h-14" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-subheadline text-xl text-center leading-tight" style={{ color: accent }}>
            {cloud.name}
          </span>
          <span
            className="font-body text-sm text-center tracking-[0.5px] text-[#555]"
            style={{ opacity: 0.9 }}
          >
            {cloud.shortNameEn ?? cloud.nameEn}
          </span>
        </div>
      </div>
    </div>
  );
}
