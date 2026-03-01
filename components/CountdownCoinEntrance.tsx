"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { HERO_BG } from "@/lib/heroConstants";

const HeroStarfield = dynamic(
  () => import("@/components/HeroStarfield").catch(() => ({ default: () => null })),
  { ssr: false }
);

const CoinTransitionCanvas = dynamic(
  () => import("@/components/CoinTransitionCanvas").then((m) => m.CoinTransitionCanvas),
  { ssr: false }
);

const TOTAL_MS = 2300;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Error boundary so missing GLB or R3F errors don't crash the page. */
class CoinEntranceErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

export default function CountdownCoinEntrance({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [animPhase, setAnimPhase] = useState<1 | 2 | 3 | 4>(1);
  const [coinOpacity, setCoinOpacity] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = performance.now();
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const start = startRef.current;
      if (start == null) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = performance.now() - start;
      const p = Math.min(1, elapsed / TOTAL_MS);
      setProgress(p);

      if (p < 0.16) setAnimPhase(1);
      else if (p < 0.48) setAnimPhase(2);
      else if (p < 0.68) setAnimPhase(3);
      else setAnimPhase(4);

      setCoinOpacity(Math.min(1, (p / 0.16) * 1.2));

      if (p >= 1) {
        setOverlayOpacity(0);
        const t = setTimeout(() => onComplete(), 500);
        return () => clearTimeout(t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{
        zIndex: 9998,
        background: HERO_BG,
        opacity: overlayOpacity,
      }}
      initial={false}
      animate={{ opacity: overlayOpacity }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} aria-hidden>
        <HeroStarfield heroTransitioning={false} />
      </div>

      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          zIndex: 1,
          perspective: "1200px",
          transformStyle: "preserve-3d",
        }}
      >
        <motion.div
          className="w-full h-full max-w-[min(80vw,400px)] max-h-[80vh]"
          style={{
            opacity: coinOpacity,
            transformStyle: "preserve-3d",
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))",
          }}
        >
          <CoinEntranceErrorBoundary>
            <Suspense fallback={null}>
              <CoinTransitionCanvas progress={progress} phase={animPhase} />
            </Suspense>
          </CoinEntranceErrorBoundary>
        </motion.div>
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          boxShadow: "inset 0 0 80px 40px rgba(0,0,0,0.15)",
        }}
        aria-hidden
      />
    </motion.div>
  );
}
