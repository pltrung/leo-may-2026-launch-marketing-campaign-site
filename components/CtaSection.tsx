"use client";

import { motion } from "framer-motion";

interface CtaSectionProps {
  onJoin: () => void;
}

export default function CtaSection({ onJoin }: CtaSectionProps) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-between px-6 py-16">
      <motion.div
        className="text-center max-w-lg mx-auto flex flex-col items-center w-full flex-1 flex justify-center"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <p className="text-white/80 text-lg sm:text-xl md:text-2xl">
          Be among the first to climb the clouds.
        </p>
        <button
          type="button"
          onClick={onJoin}
          className="relative mx-auto mt-12 flex items-center justify-center min-w-[320px] min-h-[100px] sm:min-w-[400px] sm:min-h-[120px] px-10 py-6 hover:opacity-90 transition-opacity duration-200 cursor-pointer border-0 bg-transparent animate-bounce"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/cloud.svg"
            alt=""
            className="absolute inset-0 w-full h-full object-contain object-center pointer-events-none"
          />
          <span className="relative z-10 font-display font-semibold text-lg sm:text-xl md:text-2xl text-storm text-center px-6 whitespace-nowrap">
            Join the Movement
          </span>
        </button>
      </motion.div>

      {/* ip-on-cloud bouncing - last scroll reveal */}
      <motion.div
        className="flex items-center justify-center w-[60%] max-w-[340px] aspect-square mx-auto pb-8"
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
