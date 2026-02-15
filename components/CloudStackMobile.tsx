"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  const [emerged, setEmerged] = useState({ first: false, second: false, third: false });
  const [isBlooming, setIsBlooming] = useState(false);
  const [detailsCloud, setDetailsCloud] = useState<CloudPersonality | null>(null);
  const touchStartY = useRef(0);

  useEffect(() => {
    const t1 = setTimeout(() => setEmerged((e) => ({ ...e, first: true })), 400);
    const t2 = setTimeout(() => setEmerged((e) => ({ ...e, second: true })), 700);
    const t3 = setTimeout(() => setEmerged((e) => ({ ...e, third: true })), 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

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
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy < -22) goNext();
    else if (dy > 22) goPrev();
  };

  return (
    <div className="cloud-stack-container relative w-full flex flex-col items-center">
      {/* Mist overlay - cinematic entry, fades out over 1400ms */}
      <div className="cloud-stack-mist" aria-hidden />

      {/* Tap mist bloom - expands on Ascend */}
      {isBlooming && <div className="cloud-stack-bloom" aria-hidden />}

      {/* Details modal: tap cloud → popup → Ascend → signup */}
      {detailsCloud && (
        <CloudDetailsModal
          cloud={detailsCloud}
          onClose={() => setDetailsCloud(null)}
          onAscend={handleAscend}
        />
      )}

      <div
        className="cloud-stack"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe hint */}
        <div className="cloud-stack-swipe-hint absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/arrow-up.svg" alt="" className="w-8 h-8 opacity-80 animate-bounce" />
          <span className="font-body text-xs text-white/80 tracking-wide">Swipe up for cloud</span>
        </div>
        {/* Card 1: active (front) */}
        <div
          className={`cloud-stack-card cloud-stack-card-active ${emerged.first ? "cloud-stack-card-emerged" : ""}`}
          onClick={handleActiveTap}
          onKeyDown={(e) => e.key === "Enter" && handleActiveTap()}
          role="button"
          tabIndex={0}
          aria-label={`Select ${getCloudAt(0).name}`}
        >
          <CloudStackCardInner cloud={getCloudAt(0)} />
        </div>

        {/* Card 2: second (next) — tap to advance */}
        <div
          className={`cloud-stack-card cloud-stack-card-second ${emerged.second ? "cloud-stack-card-emerged" : ""}`}
          onClick={goNext}
          onKeyDown={(e) => e.key === "Enter" && goNext()}
          role="button"
          tabIndex={0}
          aria-label="Next cloud"
        >
          <CloudStackCardInner cloud={getCloudAt(1)} />
        </div>

        {/* Card 3: third (previous) — tap to go back */}
        <div
          className={`cloud-stack-card cloud-stack-card-third ${emerged.third ? "cloud-stack-card-emerged" : ""}`}
          onClick={goPrev}
          onKeyDown={(e) => e.key === "Enter" && goPrev()}
          role="button"
          tabIndex={0}
          aria-label="Previous cloud"
        >
          <CloudStackCardInner cloud={getCloudAt(-1)} />
        </div>
      </div>
    </div>
  );
}

function CloudStackCardInner({ cloud }: { cloud: CloudPersonality }) {
  const accent = cloud.accentHex;
  return (
    <div
      className="cloud-stack-card-inner w-full aspect-[3/4] rounded-2xl flex flex-col justify-center p-6 bg-white/90 border-2 overflow-hidden"
      style={{
        borderColor: accent,
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
      }}
    >
      <div className="flex flex-col items-center justify-center flex-1 min-h-0">
        <div className="mb-3" style={{ color: accent }}>
          <CloudIconByType cloudId={cloud.id} className="w-12 h-12" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-subheadline text-base text-center leading-tight" style={{ color: accent }}>
            {cloud.name}
          </span>
          <span
            className="font-body text-xs text-center tracking-[0.5px]"
            style={{ color: accent, opacity: 0.85 }}
          >
            {cloud.shortNameEn ?? cloud.nameEn}
          </span>
        </div>
      </div>
    </div>
  );
}
