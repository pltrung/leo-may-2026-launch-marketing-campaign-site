"use client";

import { motion } from "framer-motion";

interface CtaSectionProps {
  onJoin: () => void;
}

export default function CtaSection({ onJoin }: CtaSectionProps) {
  return (
    <section
      id="final-cta"
      className="relative h-screen min-h-[100dvh] flex flex-col px-6 pt-[140px] md:pt-24 pb-24"
    >
      {/* Vertically centered block: title + CTA (flex-1 centers in remaining space below logo clearance) */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto min-h-0">
        <motion.h2
          className="font-headline text-center text-white text-2xl sm:text-3xl md:text-4xl tracking-headline"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          Climb your way.
        </motion.h2>

        <motion.div
          className="flex justify-center w-full mt-5 md:mt-6"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2, margin: "-80px" }}
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

      {/* IP on cloud: anchored near bottom */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[45%] max-w-[220px] aspect-square flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.15 }}
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
