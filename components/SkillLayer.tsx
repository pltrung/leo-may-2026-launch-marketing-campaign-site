"use client";

import { useEffect, useRef } from "react";
import type { CloudType } from "@/lib/cloudData";


export interface SkillLayerProps {
  cloudType: CloudType;
  evolutionStageIndex: number;
}

/**
 * Single skill layer for all 6 cloud types. Unified DOM (no conditional mount);
 * only CSS toggles visibility and animation per data-cloud-type.
 * Animations use only transform + opacity + stroke-dashoffset (GPU-friendly).
 */
export default function SkillLayer({ cloudType, evolutionStageIndex }: SkillLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  // Reset animation when cloud changes: remove then re-add is-animating so keyframes restart cleanly
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    el.classList.remove("is-animating");
    const id = requestAnimationFrame(() => {
      el.classList.add("is-animating");
    });
    return () => cancelAnimationFrame(id);
  }, [cloudType]);

  return (
    <div
      ref={layerRef}
      className="skill-layer is-animating"
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
          <linearGradient id="skill-rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,107,107,0.7)" />
            <stop offset="33%" stopColor="rgba(255,224,102,0.7)" />
            <stop offset="66%" stopColor="rgba(127,214,255,0.7)" />
            <stop offset="100%" stopColor="rgba(155,89,182,0.7)" />
          </linearGradient>
        </defs>
        {/* Cầu Vồng: arc that draws in via stroke-dashoffset */}
        <g className="skill-cau_vong" style={{ transformOrigin: "50px 50px" }}>
          <path
            className="skill-rainbow-arc"
            d="M 20 50 Q 50 20 80 50"
            fill="none"
            stroke="url(#skill-rainbow)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>

        {/* Gió: wind lines — translateX + opacity */}
        <g className="skill-gio" style={{ transformOrigin: "50px 50px" }}>
          <path className="skill-wind-1" d="M 0 35 Q 30 40 60 38" fill="none" stroke="rgba(111,207,151,0.6)" strokeWidth="2" strokeLinecap="round" />
          <path className="skill-wind-2" d="M 0 50 Q 40 52 70 48" fill="none" stroke="rgba(111,207,151,0.5)" strokeWidth="2" strokeLinecap="round" />
          <path className="skill-wind-3" d="M 0 65 Q 35 62 65 68" fill="none" stroke="rgba(111,207,151,0.45)" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Sương Mù: soft blobs — opacity + scale */}
        <g className="skill-suong_mu" style={{ transformOrigin: "50px 50px" }}>
          <circle className="skill-mist-1" cx="45" cy="45" r="18" fill="rgba(184,198,217,0.35)" />
          <circle className="skill-mist-2" cx="55" cy="50" r="14" fill="rgba(200,210,225,0.3)" />
          <circle className="skill-mist-3" cx="50" cy="55" r="16" fill="rgba(184,198,217,0.28)" />
          <circle className="skill-mist-4" cx="48" cy="48" r="12" fill="rgba(210,218,230,0.25)" />
        </g>

        {/* Mây Nhẹ: sparkles — opacity + scale */}
        <g className="skill-may_nhe" style={{ transformOrigin: "50px 50px" }}>
          <ellipse className="skill-sparkle-1" cx="50" cy="55" rx="4" ry="8" fill="rgba(127,214,255,0.5)" />
          <ellipse className="skill-sparkle-2" cx="44" cy="52" rx="3" ry="6" fill="rgba(214,243,255,0.45)" />
          <ellipse className="skill-sparkle-3" cx="56" cy="58" rx="3" ry="6" fill="rgba(180,230,255,0.4)" />
          <ellipse className="skill-sparkle-4" cx="50" cy="48" rx="2" ry="5" fill="rgba(200,238,255,0.35)" />
        </g>

        {/* Hồ Mây: rings — scale + opacity */}
        <g className="skill-ho_may" style={{ transformOrigin: "50px 50px" }}>
          <circle className="skill-ring-1" cx="50" cy="50" r="28" fill="none" stroke="rgba(196,184,176,0.4)" strokeWidth="3" />
          <circle className="skill-ring-2" cx="50" cy="50" r="22" fill="none" stroke="rgba(212,200,192,0.35)" strokeWidth="2" />
        </g>

        {/* Giông: lightning segments — opacity + scale */}
        <g className="skill-giong" style={{ transformOrigin: "50px 50px" }}>
          <path className="skill-bolt-1" d="M 50 25 L 48 45 L 52 42 L 47 70" fill="none" stroke="rgba(255,235,200,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path className="skill-bolt-2" d="M 55 30 L 52 48 L 56 46 L 52 65" fill="none" stroke="rgba(255,220,180,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}
