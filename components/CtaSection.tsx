"use client";

import { useRef } from "react";
import { motion } from "framer-motion";

interface CtaSectionProps {
  onJoin: () => void;
}

const SWIPE_THRESHOLD = 80;

export default function CtaSection({ onJoin }: CtaSectionProps) {
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - touchStartY.current;
    if (deltaY > SWIPE_THRESHOLD) {
      onJoin();
    }
    touchStartY.current = null;
  };

  return (
    <section
      className="min-h-screen flex flex-col items-center justify-between px-6 py-16"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top: Be among the first... */}
      <motion.div
        className="text-center max-w-lg mx-auto flex flex-col items-center w-full flex-1 flex justify-end"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <p className="text-white/80 text-lg sm:text-xl md:text-2xl">
          Be among the first to climb the clouds.
        </p>
      </motion.div>

      {/* Middle: Join the Movement CTA */}
      <motion.div
        className="flex-1 flex items-center justify-center w-full py-8"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.1 }}
      >
        <button
          type="button"
          onClick={onJoin}
          className="relative flex items-center justify-center min-w-[360px] min-h-[110px] sm:min-w-[460px] sm:min-h-[130px] px-12 py-7 hover:opacity-90 transition-opacity duration-200 cursor-pointer border-0 bg-transparent animate-bounce"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/cloud.svg"
            alt=""
            className="absolute inset-0 w-full h-full object-contain object-center pointer-events-none"
          />
          <span className="relative z-10 font-display font-semibold text-lg sm:text-xl md:text-2xl text-storm text-center px-8 whitespace-nowrap">
            Ascend
          </span>
        </button>
        <div className="flex flex-col items-center gap-2 mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/arrow-up.svg"
            alt=""
            className="w-8 h-auto object-contain -rotate-180 animate-swipe-arrow"
          />
          <span className="text-white/70 text-sm">Swipe to choose your cloud</span>
        </div>
      </motion.div>

      {/* Bottom: ip-on-cloud bouncing - last scroll reveal, close to footer */}
      <motion.div
        className="flex items-center justify-center w-[60%] max-w-[340px] aspect-square mx-auto pb-1"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.2 }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/ip-on-cloud.svg"
          alt=""
          className="w-full h-full object-contain animate-ip-bounce"
          loading="eager"
          fetchPriority="high"
        />
      </motion.div>
    </section>
  );
}
