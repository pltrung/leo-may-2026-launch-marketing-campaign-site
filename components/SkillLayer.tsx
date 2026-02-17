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
            <stop offset="0%" stopColor="rgba(255,107,107,0.9)" />
            <stop offset="33%" stopColor="rgba(255,224,102,0.9)" />
            <stop offset="66%" stopColor="rgba(127,214,255,0.9)" />
            <stop offset="100%" stopColor="rgba(155,89,182,0.9)" />
          </linearGradient>
        </defs>
        {/* Cầu Vồng: arc draws left→right only; pathLength for deterministic draw, no transform/mirror */}
        <g className="skill-cau_vong" style={{ transformOrigin: "50px 50px" }}>
          <path
            className="skill-rainbow-arc"
            d="M 8 50 Q 50 6 92 50"
            pathLength="100"
            fill="none"
            stroke="url(#skill-rainbow)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>

        {/* Gió: wind lines — wider sweep, stroke 5 */}
        <g className="skill-gio" style={{ transformOrigin: "50px 50px" }}>
          <path className="skill-wind-1" d="M -6 28 Q 38 34 82 30" fill="none" stroke="rgba(111,207,151,0.85)" strokeWidth="5" strokeLinecap="round" />
          <path className="skill-wind-2" d="M -4 50 Q 42 54 88 48" fill="none" stroke="rgba(111,207,151,0.8)" strokeWidth="5" strokeLinecap="round" />
          <path className="skill-wind-3" d="M -6 72 Q 36 68 84 72" fill="none" stroke="rgba(111,207,151,0.75)" strokeWidth="5" strokeLinecap="round" />
        </g>

        {/* Sương Mù: soft blobs — 1.4x radius, larger coverage */}
        <g className="skill-suong_mu" style={{ transformOrigin: "50px 50px" }}>
          <circle className="skill-mist-1" cx="38" cy="40" r="25" fill="rgba(184,198,217,0.5)" />
          <circle className="skill-mist-2" cx="62" cy="48" r="20" fill="rgba(200,210,225,0.45)" />
          <circle className="skill-mist-3" cx="50" cy="62" r="22" fill="rgba(184,198,217,0.45)" />
          <circle className="skill-mist-4" cx="48" cy="50" r="17" fill="rgba(210,218,230,0.4)" />
        </g>

        {/* Mây Nhẹ: sparkles — larger radius around mascot */}
        <g className="skill-may_nhe" style={{ transformOrigin: "50px 50px" }}>
          <ellipse className="skill-sparkle-1" cx="50" cy="62" rx="5" ry="10" fill="rgba(127,214,255,0.8)" />
          <ellipse className="skill-sparkle-2" cx="36" cy="50" rx="4" ry="8" fill="rgba(214,243,255,0.75)" />
          <ellipse className="skill-sparkle-3" cx="64" cy="54" rx="4" ry="8" fill="rgba(180,230,255,0.7)" />
          <ellipse className="skill-sparkle-4" cx="50" cy="38" rx="3" ry="7" fill="rgba(200,238,255,0.7)" />
        </g>

        {/* Hồ Mây: rings — 1.4x radius, stroke 5 */}
        <g className="skill-ho_may" style={{ transformOrigin: "50px 50px" }}>
          <circle className="skill-ring-1" cx="50" cy="50" r="39" fill="none" stroke="rgba(196,184,176,0.7)" strokeWidth="5" />
          <circle className="skill-ring-2" cx="50" cy="50" r="31" fill="none" stroke="rgba(212,200,192,0.65)" strokeWidth="5" />
        </g>

        {/* Giông: lightning — stroke 5 for visibility */}
        <g className="skill-giong" style={{ transformOrigin: "50px 50px" }}>
          <path className="skill-bolt-1" d="M 50 18 L 46 42 L 54 38 L 48 78" fill="none" stroke="rgba(255,235,200,0.95)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path className="skill-bolt-2" d="M 58 22 L 54 44 L 60 42 L 54 72" fill="none" stroke="rgba(255,220,180,0.85)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}
