"use client";

import { motion } from "framer-motion";

interface CtaSectionProps {
  onJoin: () => void;
}

export default function CtaSection({ onJoin }: CtaSectionProps) {
  return (
    <section className="min-h-screen h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        className="text-center max-w-lg mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-white tracking-tight">
          Join the Movement
        </h2>
        <p className="mt-6 text-white/80 text-lg sm:text-xl">
          Be among the first to climb the clouds.
        </p>
        <button
          type="button"
          onClick={onJoin}
          className="relative mt-12 w-[200px] h-[60px] sm:w-[240px] sm:h-[72px] flex items-center justify-center hover:opacity-90 transition-opacity duration-200 cursor-pointer border-0 bg-transparent animate-cloud-float"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/cloud.svg"
            alt=""
            className="absolute inset-0 w-full h-full object-contain object-center pointer-events-none"
          />
          <span className="relative z-10 font-display font-semibold text-base sm:text-lg text-storm">
            Join the Movement
          </span>
        </button>
      </motion.div>
    </section>
  );
}
