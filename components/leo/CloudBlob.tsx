"use client";

import { motion } from "framer-motion";

export type CloudTint = "neutral" | "blue" | "yellow" | "green";

/** Organic blob paths — unique, no symmetry (reference: dreamlike clouds) */
const CLOUD_PATHS: string[] = [
  "M 50 18 C 72 12 88 28 90 52 C 92 78 78 92 58 88 C 38 94 12 82 10 56 C 8 32 24 14 50 18 Z",
  "M 52 22 C 82 18 94 42 88 68 C 94 88 72 98 48 92 C 22 96 6 72 14 48 C 18 26 38 20 52 22 Z",
  "M 48 14 C 78 8 96 36 92 62 C 88 86 62 96 40 90 C 16 88 4 62 12 38 C 20 18 38 16 48 14 Z",
  "M 54 20 C 80 14 98 38 94 64 C 90 88 64 94 42 88 C 18 92 6 66 16 42 C 26 22 44 22 54 20 Z",
  "M 46 16 C 68 10 90 30 92 56 C 94 80 70 92 46 88 C 20 84 8 58 18 34 C 28 18 40 18 46 16 Z",
  "M 50 12 C 76 6 94 32 90 58 C 86 84 58 94 34 88 C 10 82 2 56 14 32 C 24 14 42 14 50 12 Z",
];

interface CloudBlobProps {
  index: number;
  tint: CloudTint;
  /** 0 = back, 1 = front (scale up, less blur) */
  depth: number;
  onClick: () => void;
  selected?: boolean;
  inactive?: boolean;
  /** For Cầu Vồng: show tiny yellow sparkles */
  showSparkles?: boolean;
}

const DEPTH_SCALE = (d: number) => 0.82 + d * 0.2;
const DEPTH_BLUR = (d: number) => (1 - d) * 1.5;
const DEPTH_Z = (d: number) => Math.round(d * 10);

export function CloudBlob({
  index,
  tint,
  depth,
  onClick,
  selected,
  inactive,
  showSparkles,
}: CloudBlobProps) {
  const path = CLOUD_PATHS[index % CLOUD_PATHS.length];
  const scale = DEPTH_SCALE(depth);
  const blur = DEPTH_BLUR(depth);
  const z = DEPTH_Z(depth);

  const accentFilter =
    tint === "blue"
      ? "drop-shadow(0 0 20px rgba(2,66,255,0.15))"
      : tint === "green"
      ? "drop-shadow(0 0 20px rgba(0,203,77,0.15))"
      : "";

  return (
    <motion.button
      type="button"
      className="cloud-blob-btn w-full h-full cursor-pointer border-none outline-none bg-transparent"
      onClick={onClick}
      initial={false}
      animate={{
        scale: selected ? 1.15 : inactive ? 0.92 : scale,
        opacity: inactive ? 0.5 : 0.94,
        y: selected ? -8 : 0,
      }}
      whileHover={!inactive ? { scale: scale * 1.04, y: -4 } : undefined}
      whileTap={!inactive ? { scale: scale * 0.98 } : undefined}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 28,
      }}
      style={{
        zIndex: selected ? 100 : z,
        filter: `blur(${blur}px) ${accentFilter}`,
        pointerEvents: inactive ? "none" : "auto",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="cloud-blob-svg w-full h-full"
        preserveAspectRatio="none"
        style={{ filter: `url(#cloud-glow-${index})` }}
      >
        <defs>
          <radialGradient
            id={`cloud-fill-${index}`}
            cx="50%"
            cy="45%"
            r="50%"
            fx="40%"
            fy="35%"
          >
            <stop offset="0%" stopColor="#fdfcfa" stopOpacity="1" />
            <stop offset="50%" stopColor="#f5f2ed" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#e8e4df" stopOpacity="0.92" />
          </radialGradient>
          <filter id={`cloud-glow-${index}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={path}
          fill={`url(#cloud-fill-${index})`}
          style={{ opacity: 0.96 }}
        />
      </svg>
      {showSparkles && (
        <div className="cloud-sparkles" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="absolute w-1 h-1 rounded-full bg-[#FDFF52]"
              style={{
                left: `${20 + i * 18}%`,
                top: `${30 + (i % 3) * 20}%`,
              }}
              animate={{
                opacity: [0.3, 0.9, 0.3],
                scale: [1, 1.4, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.35,
              }}
            />
          ))}
        </div>
      )}
    </motion.button>
  );
}
