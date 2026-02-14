"use client";

import { useState, useEffect } from "react";

type HoldId = "jug1" | "jug2" | "sloper1" | "sloper2" | "pinch1" | "pinch2";

interface Hold {
  id: number;
  holdId: HoldId;
  x: string;
  y: string;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

const HOLDS_DESKTOP: Omit<Hold, "id">[] = [
  { holdId: "jug1", x: "-8%", y: "10%", size: 200, color: "#0242FF", delay: 0, duration: 10 },
  { holdId: "sloper1", x: "95%", y: "5%", size: 180, color: "#00CB4D", delay: 2, duration: 9 },
  { holdId: "pinch1", x: "-5%", y: "62%", size: 220, color: "#8B7355", delay: 1, duration: 11 },
  { holdId: "jug2", x: "92%", y: "72%", size: 190, color: "#FDFF52", delay: 3, duration: 8 },
  { holdId: "sloper2", x: "3%", y: "90%", size: 160, color: "#00CB4D", delay: 0.5, duration: 12 },
  { holdId: "pinch2", x: "96%", y: "32%", size: 140, color: "#0242FF", delay: 1.5, duration: 10 },
];

const HOLDS_MOBILE: Omit<Hold, "id">[] = [
  { holdId: "jug1", x: "-12%", y: "12%", size: 160, color: "#0242FF", delay: 0, duration: 10 },
  { holdId: "sloper1", x: "88%", y: "68%", size: 180, color: "#00CB4D", delay: 2, duration: 9 },
  { holdId: "pinch1", x: "-8%", y: "85%", size: 150, color: "#8B7355", delay: 1, duration: 11 },
  { holdId: "jug2", x: "92%", y: "22%", size: 140, color: "#FDFF52", delay: 1.5, duration: 10 },
];

function HoldSvg({ holdId, color, size }: { holdId: HoldId; color: string; size: number }) {
  const stroke = "#000";
  const strokeWidth = 4;
  const highlight = "rgba(255,255,255,0.4)";

  const paths: Record<HoldId, { main: string; inner: string }> = {
    jug1: {
      main: "M18 28 Q52 10 82 28 Q94 52 86 72 Q78 92 50 96 Q22 92 14 72 Q6 52 18 28",
      inner: "M32 38 Q50 28 68 38 Q76 52 70 68 Q64 82 50 86 Q36 82 30 68 Q24 52 32 38",
    },
    jug2: {
      main: "M12 35 Q48 18 88 32 Q96 55 82 78 Q62 94 38 90 Q14 84 8 58 Q4 42 12 35",
      inner: "M28 48 Q50 36 72 48 Q80 62 72 76 Q62 88 50 90 Q38 88 28 76 Q20 62 28 48",
    },
    sloper1: {
      main: "M20 20 Q80 12 90 50 Q88 88 50 92 Q12 88 10 50 Q12 20 20 20",
      inner: "M32 35 Q62 30 75 50 Q72 75 50 78 Q28 75 25 50 Q28 35 32 35",
    },
    sloper2: {
      main: "M15 45 Q55 10 92 40 Q90 85 50 95 Q10 85 8 45 Q10 25 15 45",
      inner: "M30 55 Q55 35 78 55 Q76 82 55 88 Q34 82 32 55 Q34 40 30 55",
    },
    pinch1: {
      main: "M22 38 L78 38 Q94 48 88 68 Q80 90 50 96 Q20 90 12 68 Q6 48 22 38",
      inner: "M35 52 Q65 48 80 62 Q78 82 58 88 Q38 82 30 62 Q32 48 35 52",
    },
    pinch2: {
      main: "M18 42 L82 42 Q96 55 88 75 Q78 92 50 96 Q22 92 14 75 Q6 55 18 42",
      inner: "M32 58 Q58 52 72 68 Q70 86 52 90 Q34 86 28 68 Q30 52 32 58",
    },
  };

  const { main, inner } = paths[holdId];

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-md">
      <path d={main} fill={color} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d={inner} fill={highlight} stroke="none" />
    </svg>
  );
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
          <HoldSvg holdId={hold.holdId} color={hold.color} size={hold.size} />
        </div>
      ))}
    </div>
  );
}
