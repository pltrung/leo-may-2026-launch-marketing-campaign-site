"use client";

import { useEffect, useRef } from "react";
import type { CloudType } from "@/lib/cloudData";

export interface SkillLayerProps {
  cloudType: CloudType;
  evolutionStageIndex: number;
  /** Set true (e.g. ?debugSkill=1) to add .debug-skill-animation and verify animation system */
  debugAnimation?: boolean;
}

/**
 * Volumetric gradient-based skill layer for all 6 cloud types.
 * No strokes — filled shapes only with radial/linear gradients.
 * Animations: transform + opacity only (GPU-friendly).
 */
export default function SkillLayer({ cloudType, evolutionStageIndex, debugAnimation }: SkillLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const prevCloudRef = useRef<string | null>(null);

  // Only reset animation when cloudType changes; never remove is-animating on initial mount
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const prev = prevCloudRef.current;
    prevCloudRef.current = cloudType;
    if (prev !== null && prev !== cloudType) {
      el.classList.remove("is-animating");
      const id = requestAnimationFrame(() => {
        el.classList.add("is-animating");
      });
      return () => cancelAnimationFrame(id);
    }
  }, [cloudType]);

  return (
    <div
      ref={layerRef}
      className={`skill-layer is-animating${debugAnimation ? " debug-skill-animation" : ""}`}
      data-cloud-type={cloudType}
      data-evolution-index={evolutionStageIndex}
      aria-hidden
    >
      <svg
        className="skill-layer-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          {/* Rainbow arc: thick band fill left→right */}
          <linearGradient id="skill-rainbow-fill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,107,107,0.85)" />
            <stop offset="33%" stopColor="rgba(255,224,102,0.85)" />
            <stop offset="66%" stopColor="rgba(127,214,255,0.85)" />
            <stop offset="100%" stopColor="rgba(155,89,182,0.85)" />
          </linearGradient>
          {/* Mist: volumetric fog blobs */}
          <radialGradient id="skill-mist-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.35" />
            <stop offset="60%" stopColor="white" stopOpacity="0.12" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          {/* Wind: soft elongated sweep */}
          <radialGradient id="skill-wind-grad" cx="30%" cy="50%" r="70%">
            <stop offset="0%" stopColor="rgba(111,207,151,0.5)" />
            <stop offset="70%" stopColor="rgba(111,207,151,0.2)" />
            <stop offset="100%" stopColor="rgba(111,207,151,0)" />
          </radialGradient>
          {/* Ring: expanding glow, transparent center */}
          <radialGradient id="skill-ring-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(212,200,192,0)" />
            <stop offset="65%" stopColor="rgba(196,184,176,0.15)" />
            <stop offset="100%" stopColor="rgba(196,184,176,0.4)" />
          </radialGradient>
          {/* Bolt: soft lightning fill */}
          <linearGradient id="skill-bolt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,250,240,0.9)" />
            <stop offset="50%" stopColor="rgba(255,235,200,0.7)" />
            <stop offset="100%" stopColor="rgba(255,220,180,0.4)" />
          </linearGradient>
          {/* Sparkle: soft glow circles */}
          <radialGradient id="skill-sparkle-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(200,238,255,0.6)" />
            <stop offset="60%" stopColor="rgba(127,214,255,0.25)" />
            <stop offset="100%" stopColor="rgba(127,214,255,0)" />
          </radialGradient>
        </defs>

        {/* Cầu Vồng: thick gradient-filled arc band (no stroke) */}
        <g className="skill-cau_vong" style={{ transformOrigin: "50px 50px" }}>
          <path
            className="skill-rainbow-arc"
            d="M 5 50 Q 50 2 95 50 L 88 50 Q 50 18 12 50 Z"
            fill="url(#skill-rainbow-fill)"
          />
        </g>

        {/* Gió: elongated gradient ellipses moving horizontally */}
        <g className="skill-gio" style={{ transformOrigin: "50px 50px" }}>
          <ellipse className="skill-wind-1" cx="50" cy="32" rx="42" ry="14" fill="url(#skill-wind-grad)" />
          <ellipse className="skill-wind-2" cx="50" cy="50" rx="44" ry="12" fill="url(#skill-wind-grad)" />
          <ellipse className="skill-wind-3" cx="50" cy="68" rx="40" ry="14" fill="url(#skill-wind-grad)" />
          <ellipse className="skill-wind-4" cx="50" cy="50" rx="38" ry="16" fill="url(#skill-wind-grad)" />
        </g>

        {/* Sương Mù: multiple radial-gradient ellipses drifting */}
        <g className="skill-suong_mu" style={{ transformOrigin: "50px 50px" }}>
          <ellipse className="skill-mist-1" cx="35" cy="38" rx="28" ry="26" fill="url(#skill-mist-grad)" />
          <ellipse className="skill-mist-2" cx="65" cy="45" rx="24" ry="22" fill="url(#skill-mist-grad)" />
          <ellipse className="skill-mist-3" cx="50" cy="62" rx="26" ry="24" fill="url(#skill-mist-grad)" />
          <ellipse className="skill-mist-4" cx="48" cy="50" rx="20" ry="20" fill="url(#skill-mist-grad)" />
          <ellipse className="skill-mist-5" cx="58" cy="55" rx="18" ry="18" fill="url(#skill-mist-grad)" />
        </g>

        {/* Mây Nhẹ: soft glow circles that pulse and drift */}
        <g className="skill-may_nhe" style={{ transformOrigin: "50px 50px" }}>
          <circle className="skill-sparkle-1" cx="50" cy="58" r="22" fill="url(#skill-sparkle-grad)" />
          <circle className="skill-sparkle-2" cx="32" cy="48" r="18" fill="url(#skill-sparkle-grad)" />
          <circle className="skill-sparkle-3" cx="68" cy="52" r="18" fill="url(#skill-sparkle-grad)" />
          <circle className="skill-sparkle-4" cx="50" cy="38" r="16" fill="url(#skill-sparkle-grad)" />
        </g>

        {/* Hồ Mây: expanding radial-gradient rings (filled circles with transparent center) */}
        <g className="skill-ho_may" style={{ transformOrigin: "50px 50px" }}>
          <circle className="skill-ring-1" cx="50" cy="50" r="48" fill="url(#skill-ring-grad)" />
          <circle className="skill-ring-2" cx="50" cy="50" r="38" fill="url(#skill-ring-grad)" />
          <circle className="skill-ring-3" cx="50" cy="50" r="28" fill="url(#skill-ring-grad)" />
        </g>

        {/* Giông: filled bolt shapes with gradient (no stroke) */}
        <g className="skill-giong" style={{ transformOrigin: "50px 50px" }}>
          <path
            className="skill-bolt-1"
            d="M 50 8 L 45 42 L 52 38 L 46 72 L 53 92 L 56 92 L 50 72 L 55 38 L 48 42 Z"
            fill="url(#skill-bolt-grad)"
          />
          <path
            className="skill-bolt-2"
            d="M 60 14 L 56 44 L 62 40 L 57 70 L 63 86 L 66 86 L 61 70 L 65 40 L 59 44 Z"
            fill="url(#skill-bolt-grad)"
          />
        </g>
      </svg>
    </div>
  );
}
