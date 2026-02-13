"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface JoinCtaProps {
  onJoin: () => void;
}

export default function JoinCta({ onJoin }: JoinCtaProps) {
  const [showCta, setShowCta] = useState(false);
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [350, 550], [0, 1]);
  const y = useTransform(scrollY, [350, 550], [24, 0]);

  useEffect(() => {
    const unsub = scrollY.on("change", (v) => {
      setShowCta(v > 400);
    });
    return () => unsub();
  }, [scrollY]);

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
          className="px-10 py-4 rounded-full bg-accent hover:bg-accent/90 text-white font-medium tracking-wider transition-colors shadow-lg"
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
