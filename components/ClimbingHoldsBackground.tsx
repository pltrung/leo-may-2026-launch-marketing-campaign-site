"use client";

import { useState, useEffect } from "react";

type HoldType = "jug" | "crimp" | "sloper" | "pinch";

interface Hold {
  id: number;
  type: HoldType;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  hasSmiley?: boolean;
}

const HOLD_COLORS = ["#0242FF", "#00CB4D", "#FDFF52", "#8B7355", "#6B7280"];
const HOLD_COUNT_DESKTOP = 12;
const HOLD_COUNT_MOBILE = 6;

function HoldSvg({ type, color, size, hasSmiley }: { type: HoldType; color: string; size: number; hasSmiley?: boolean }) {
  const baseStyle = { width: size, height: size };
  const smiley = hasSmiley ? (
    <circle cx="20" cy="22" r="4" fill="rgba(255,255,255,0.5)" />
  ) : null;

  switch (type) {
    case "jug":
      return (
        <svg viewBox="0 0 40 40" style={baseStyle}>
          <path d="M8 12 Q20 4 32 12 Q36 24 28 34 Q20 38 12 34 Q4 24 8 12" fill={color} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          {smiley}
        </svg>
      );
    case "crimp":
      return (
        <svg viewBox="0 0 40 40" style={baseStyle}>
          <ellipse cx="20" cy="20" rx="12" ry="8" fill={color} stroke="rgba(0,0,0,0.08)" strokeWidth="1" transform="rotate(-15 20 20)" />
          {smiley}
        </svg>
      );
    case "sloper":
      return (
        <svg viewBox="0 0 40 40" style={baseStyle}>
          <circle cx="20" cy="20" r="14" fill={color} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          {smiley}
        </svg>
      );
    case "pinch":
      return (
        <svg viewBox="0 0 40 40" style={baseStyle}>
          <path d="M12 18 L28 18 Q32 20 30 26 Q28 32 20 36 Q12 32 10 26 Q8 20 12 18" fill={color} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          {smiley}
        </svg>
      );
    default:
      return null;
  }
}

function generateHolds(count: number): Hold[] {
  const types: HoldType[] = ["jug", "crimp", "sloper", "pinch"];
  const holds: Hold[] = [];
  for (let i = 0; i < count; i++) {
    holds.push({
      id: i,
      type: types[i % 4],
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      size: 24 + Math.random() * 32,
      color: HOLD_COLORS[Math.floor(Math.random() * HOLD_COLORS.length)],
      delay: Math.random() * 4,
      duration: 6 + Math.random() * 4,
      hasSmiley: Math.random() > 0.6,
    });
  }
  return holds;
}

export default function ClimbingHoldsBackground() {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const count = isMobile ? HOLD_COUNT_MOBILE : HOLD_COUNT_DESKTOP;
    setHolds(generateHolds(count));
  }, [isMobile]);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden
    >
      {holds.map((hold) => (
        <div
          key={hold.id}
          className="absolute"
          style={{ left: `${hold.x}%`, top: `${hold.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <div
            className="animate-hold-float"
            style={{ animationDuration: `${hold.duration}s`, animationDelay: `-${hold.delay}s` }}
          >
            <HoldSvg type={hold.type} color={hold.color} size={hold.size} hasSmiley={hold.hasSmiley} />
          </div>
        </div>
      ))}
    </div>
  );
}
