"use client";

import { useState, useRef, useCallback } from "react";
import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudIconByType from "./CloudIcons";

interface CloudDetailsModalProps {
  cloud: CloudPersonality;
  onClose: () => void;
  onAscend: () => void;
}

function CloudDetailsModal({ cloud, onClose, onAscend }: CloudDetailsModalProps) {
  const accent = cloud.accentHex;
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${cloud.name} details`}
    >
      <div
        className="cloud-details-modal cloud-details-modal-open w-full max-w-[320px] rounded-2xl p-6 bg-white/95 border-2 flex flex-col gap-4 shadow-xl"
        style={{ borderColor: accent }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2">
          <div style={{ color: accent }}>
            <CloudIconByType cloudId={cloud.id} className="w-14 h-14 mx-auto" />
          </div>
          <span className="font-subheadline text-lg text-center" style={{ color: accent }}>
            {cloud.name}
          </span>
          <span className="font-body text-sm text-center opacity-85" style={{ color: accent }}>
            {cloud.shortNameEn ?? cloud.nameEn}
          </span>
        </div>
        <p
          className="font-body text-center text-sm leading-relaxed flex-1"
          style={{ color: cloud.storyHex }}
        >
          {cloud.story}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-subheadline text-sm border-2 transition-opacity hover:opacity-80"
            style={{ borderColor: accent, color: accent }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={onAscend}
            className="flex-1 py-3 rounded-xl font-subheadline text-sm border-0 transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent, color: cloud.joinTextHex ?? "#ffffff" }}
          >
            Ascend
          </button>
        </div>
      </div>
    </div>
  );
}

interface CloudStackMobileProps {
  onSelect: (cloud: CloudPersonality) => void;
}

export default function CloudStackMobile({ onSelect }: CloudStackMobileProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isBlooming, setIsBlooming] = useState(false);
  const [detailsCloud, setDetailsCloud] = useState<CloudPersonality | null>(null);
  const touchStartY = useRef(0);

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

  const handleAscend = useCallback(() => {
    if (!detailsCloud) return;
    setIsBlooming(true);
    const cloud = detailsCloud;
    setDetailsCloud(null);
    setTimeout(() => onSelect(cloud), 450);
  }, [detailsCloud, onSelect]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
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

  return (
    <div className="cloud-stack-wrapper relative w-full flex-1 flex flex-col min-h-0">
      {isBlooming && <div className="cloud-stack-bloom" aria-hidden />}
      {detailsCloud && (
        <CloudDetailsModal
          cloud={detailsCloud}
          onClose={() => setDetailsCloud(null)}
          onAscend={handleAscend}
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
              onClick={handleCardClick}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                handleCardClick();
              }}
              role="button"
              tabIndex={0}
              aria-label={isActive ? `Select ${cloud.name}` : (positionClass === "next" || positionClass === "far") ? "Next cloud" : "Previous cloud"}
            >
              <CloudCardInner cloud={cloud} />
            </div>
          );
        })}

        <div className="cloud-stack-swipe-hint absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/arrow-up.svg" alt="" className="w-8 h-8 opacity-70 animate-bounce" />
          <span className="font-body text-xs text-white/70 tracking-wide">Swipe to explore</span>
        </div>
      </div>
    </div>
  );
}

function CloudCardInner({ cloud }: { cloud: CloudPersonality }) {
  const accent = cloud.accentHex;
  return (
    <div
      className="cloud-card-inner w-full h-full rounded-[28px] flex flex-col justify-center items-center p-6 bg-white/92 border-2 overflow-hidden"
      style={{
        borderColor: accent,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex flex-col items-center justify-center flex-1 min-h-0">
        <div className="mb-3" style={{ color: accent }}>
          <CloudIconByType cloudId={cloud.id} className="w-14 h-14" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-subheadline text-lg text-center leading-tight" style={{ color: accent }}>
            {cloud.name}
          </span>
          <span
            className="font-body text-sm text-center tracking-[0.5px]"
            style={{ color: accent, opacity: 0.85 }}
          >
            {cloud.shortNameEn ?? cloud.nameEn}
          </span>
        </div>
      </div>
    </div>
  );
}
