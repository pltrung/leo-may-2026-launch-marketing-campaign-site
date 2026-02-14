"use client";

import { useState, useEffect } from "react";

type HoldType = "jug" | "sloper" | "pinch";

interface Hold {
  id: number;
  type: HoldType;
  x: string;
  y: string;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

const HOLDS_DESKTOP: Omit<Hold, "id">[] = [
  { type: "jug", x: "-8%", y: "12%", size: 180, color: "#0242FF", delay: 0, duration: 10 },
  { type: "sloper", x: "92%", y: "8%", size: 220, color: "#00CB4D", delay: 2, duration: 9 },
  { type: "pinch", x: "-5%", y: "65%", size: 160, color: "#8B7355", delay: 1, duration: 11 },
  { type: "jug", x: "88%", y: "75%", size: 200, color: "#FDFF52", delay: 3, duration: 8 },
  { type: "sloper", x: "5%", y: "88%", size: 140, color: "#00CB4D", delay: 0.5, duration: 12 },
  { type: "pinch", x: "94%", y: "35%", size: 120, color: "#0242FF", delay: 1.5, duration: 10 },
];

const HOLDS_MOBILE: Omit<Hold, "id">[] = [
  { type: "jug", x: "-12%", y: "15%", size: 140, color: "#0242FF", delay: 0, duration: 10 },
  { type: "sloper", x: "85%", y: "70%", size: 160, color: "#00CB4D", delay: 2, duration: 9 },
  { type: "pinch", x: "-8%", y: "82%", size: 120, color: "#8B7355", delay: 1, duration: 11 },
  { type: "jug", x: "90%", y: "25%", size: 130, color: "#FDFF52", delay: 1.5, duration: 10 },
];

function HoldSvg({ type, color, size }: { type: HoldType; color: string; size: number }) {
  const viewBox = "0 0 100 100";
  const style = { width: size, height: size };

  switch (type) {
    case "jug":
      return (
        <svg viewBox={viewBox} style={style} className="drop-shadow-sm">
          <path
            d="M15 25 Q50 8 85 25 Q95 45 88 65 Q82 88 50 95 Q18 88 12 65 Q5 45 15 25"
            fill={color}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "sloper":
      return (
        <svg viewBox={viewBox} style={style} className="drop-shadow-sm">
          <ellipse
            cx="50"
            cy="50"
            rx="42"
            ry="38"
            fill={color}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="1.5"
            transform="rotate(-8 50 50)"
          />
        </svg>
      );
    case "pinch":
      return (
        <svg viewBox={viewBox} style={style} className="drop-shadow-sm">
          <path
            d="M20 35 L80 35 Q92 42 88 58 Q85 75 50 92 Q15 75 12 58 Q8 42 20 35"
            fill={color}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="1.5"
          />
        </svg>
      );
    default:
      return null;
  }
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
    const list = isMobile ? HOLDS_MOBILE : HOLDS_DESKTOP;
    setHolds(list.map((h, i) => ({ ...h, id: i })));
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
          className="absolute animate-hold-float-subtle"
          style={{
            left: hold.x,
            top: hold.y,
            transform: "translate(-50%, -50%)",
            animationDuration: `${hold.duration}s`,
            animationDelay: `-${hold.delay}s`,
          }}
        >
          <HoldSvg type={hold.type} color={hold.color} size={hold.size} />
        </div>
      ))}
    </div>
  );
}
