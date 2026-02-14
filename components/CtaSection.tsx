"use client";

import { motion } from "framer-motion";

interface CtaSectionProps {
  onJoin: () => void;
}

export default function CtaSection({ onJoin }: CtaSectionProps) {
  return (
    <section className="min-h-[115vh] flex flex-col items-center justify-center px-6 py-16 pt-[120px] md:pt-24">
      {/* Grouped: Headline → CTA → IP in one glance */}
      <div className="flex flex-col items-center w-full max-w-lg mx-auto">
        <motion.h2
          className="text-center text-white/80 text-lg sm:text-xl md:text-2xl font-display"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          Be among the first to climb the clouds.
        </motion.h2>

        {/* 24px spacing (desktop), 16px (mobile) */}
        <motion.div
          className="flex justify-center w-full mt-4 md:mt-6"
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
        </motion.div>

        {/* 40px spacing (desktop), 24px (mobile) */}
        <motion.div
          className="flex items-center justify-center w-[60%] max-w-[340px] aspect-square mx-auto mt-6 md:mt-10 pb-8"
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
      </div>
    </section>
  );
}
