"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface JoinCtaProps {
  onJoin: () => void;
}

export default function JoinCta({ onJoin }: JoinCtaProps) {
  const [showCta, setShowCta] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const threshold = isMobile ? 280 : 650;
  const fadeStart = isMobile ? 200 : 550;
  const fadeEnd = isMobile ? 400 : 750;
  const opacity = useTransform(scrollY, [fadeStart, fadeEnd], [0, 1]);
  const y = useTransform(scrollY, [fadeStart, fadeEnd], [24, 0]);

  useEffect(() => {
    const unsub = scrollY.on("change", (v) => {
      setShowCta(v > threshold);
    });
    return () => unsub();
  }, [scrollY, threshold]);

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-20 flex justify-center items-end pb-12 min-h-0 pointer-events-none"
      style={{ opacity, y }}
    >
      <div className="pointer-events-auto">
      {showCta && (
        <motion.button
          type="button"
          onClick={onJoin}
          className="px-12 py-5 rounded-full bg-accent hover:bg-accent/90 text-white font-semibold text-lg tracking-wider transition-colors shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Join Founding Circle
        </motion.button>
      )}
      </div>
    </motion.div>
  );
}
