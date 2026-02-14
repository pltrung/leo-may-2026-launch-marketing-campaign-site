"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Target: Jan 1, 2026 (configurable)
const TARGET = new Date("2026-01-01T00:00:00+07:00");

function useCountdown() {
  const [diff, setDiff] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const d = Math.max(0, TARGET.getTime() - now.getTime());

      setDiff({
        days: Math.floor(d / (1000 * 60 * 60 * 24)),
        hours: Math.floor(
          (d % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        ),
        minutes: Math.floor((d % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((d % (1000 * 60)) / 1000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return diff;
}

export default function CountdownPage() {
  const { days, hours, minutes, seconds } = useCountdown();

  const pad = (n: number) => String(n).padStart(2, "0");

  const stagger = 0.3;

  return (
    <motion.main
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ backgroundColor: "#0242FF" }}
    >
      {/* Subtle cloud overlay 8-12% opacity */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none opacity-10"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/background.svg"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
      <div
        className="absolute inset-0 -z-10 pointer-events-none opacity-[0.08]"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/holds.svg"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      <div className="text-center px-6 max-w-2xl mx-auto flex flex-col items-center">
        {/* 1. Logo */}
        <motion.div
          className="mt-[60px] mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-white.svg"
            alt="Leo Mây"
            className="w-[160px] sm:w-[220px] h-auto object-contain mx-auto"
          />
        </motion.div>

        {/* 2. IP image - ip-count-down from brand folder */}
        <motion.div
          className="w-full max-w-[80%] sm:max-w-[420px] mx-auto mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 + stagger }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/ip-count-down.svg"
            alt=""
            className="w-full h-auto object-contain mx-auto animate-ip-float"
          />
        </motion.div>

        {/* 3. Countdown - DD : HH : MM : SS */}
        <motion.div
          className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 + stagger * 2 }}
        >
          {[
            { value: pad(days), label: "Days" },
            { value: pad(hours), label: "Hrs" },
            { value: pad(minutes), label: "Min" },
            { value: pad(seconds), label: "Sec" },
          ].map((block, i) => (
            <div key={block.label} className="flex items-center gap-2 sm:gap-3">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="px-4 sm:px-6 py-3 sm:py-4 rounded-xl flex items-center justify-center min-w-[56px] sm:min-w-[72px]"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 0 20px rgba(255,255,255,0.15)",
                  }}
                >
                  <span className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-white tabular-nums">
                    {block.value}
                  </span>
                </div>
                <span className="text-white/70 text-xs sm:text-sm">
                  {block.label}
                </span>
              </div>
              {i < 3 && (
                <span className="font-display text-2xl sm:text-3xl text-white/50 self-center -mb-6">
                  :
                </span>
              )}
            </div>
          ))}
        </motion.div>

        {/* 4. Tagline */}
        <motion.p
          className="mt-12 font-display text-xl sm:text-2xl font-medium text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 + stagger * 3 }}
        >
          Climb the Clouds. Build a Culture.
        </motion.p>

        <motion.p
          className="mt-2 text-white/70 text-base sm:text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 + stagger * 3 }}
        >
          Ho Chi Minh City — 2026
        </motion.p>

        {/* 5. Footer line */}
        <motion.p
          className="mt-8 text-white/40 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 + stagger * 4 }}
        >
          Something is forming in the clouds.
        </motion.p>
      </div>
    </motion.main>
  );
}
