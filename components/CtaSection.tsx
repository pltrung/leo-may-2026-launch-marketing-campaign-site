"use client";

import { motion } from "framer-motion";

interface CtaSectionProps {
  onJoin: () => void;
}

export default function CtaSection({ onJoin }: CtaSectionProps) {
  return (
    <section
      id="final-cta"
      className="relative min-h-[160vh] flex flex-col px-6 pt-[140px] md:pt-24 pb-32"
    >
      {/* Top spacer: creates scroll room so CTA only appears when user scrolls to the end */}
      <div className="min-h-[50vh] flex-shrink-0" aria-hidden />

      {/* Title + CTA: only fade in when user has scrolled into this section (mobile + PC) */}
      <div className="flex-1 flex flex-col items-center justify-end w-full max-w-lg mx-auto min-h-0 pb-[28%] md:pb-[22%]">
        <motion.h2
          className="font-headline text-center text-white text-2xl sm:text-3xl md:text-4xl tracking-headline"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25, margin: "-60px" }}
          transition={{ duration: 0.6 }}
        >
          Climb <span className="font-headline text-3xl sm:text-4xl md:text-5xl" style={{ color: "#00CB4D" }}>YOUR</span> way.
        </motion.h2>

        <motion.div
          className="flex justify-center w-full mt-5 md:mt-6"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.08 }}
        >
          <button
            type="button"
            onClick={onJoin}
            className="relative flex items-center justify-center min-w-[320px] min-h-[100px] sm:min-w-[420px] sm:min-h-[120px] md:min-w-[460px] md:min-h-[130px] px-12 py-7 hover:opacity-90 transition-opacity duration-200 cursor-pointer border-0 bg-transparent animate-bounce"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/cloud.svg"
              alt=""
              className="absolute inset-0 w-full h-full object-contain object-center pointer-events-none"
            />
            <span className="relative z-10 font-subheadline text-lg sm:text-xl md:text-2xl text-storm text-center px-8 whitespace-nowrap">
              Ascend
            </span>
          </button>
        </motion.div>
      </div>

      {/* IP on cloud: at bottom of section with room below */}
      <motion.div
        className="absolute bottom-8 left-0 right-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.15 }}
        aria-hidden
      >
        <div className="w-[45%] max-w-[220px] aspect-square flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/ip-on-cloud.svg"
            alt=""
            className="w-full h-full object-contain object-center animate-ip-bounce"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </motion.div>
    </section>
  );
}
