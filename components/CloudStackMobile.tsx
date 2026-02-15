"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudIconByType from "./CloudIcons";

interface CloudStackMobileProps {
  onSelect: (cloud: CloudPersonality) => void;
}

export default function CloudStackMobile({ onSelect }: CloudStackMobileProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [emerged, setEmerged] = useState({ first: false, second: false, third: false });
  const [isBlooming, setIsBlooming] = useState(false);
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
    setIsBlooming(true);
    const cloud = getCloudAt(0);
    setTimeout(() => onSelect(cloud), 450);
  }, [getCloudAt, onSelect]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy < -40) goNext();
    else if (dy > 40) goPrev();
  };

  return (
    <div className="cloud-stack-container relative w-full">
      {/* Mist overlay - cinematic entry, fades out over 1400ms */}
      <div className="cloud-stack-mist" aria-hidden />

      {/* Tap mist bloom - expands on active card select */}
      {isBlooming && <div className="cloud-stack-bloom" aria-hidden />}

      <div
        className="cloud-stack"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
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
      className="w-full max-w-[200px] aspect-[3/4] rounded-2xl flex flex-col justify-center p-6 bg-white/90 border-2 overflow-hidden"
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
