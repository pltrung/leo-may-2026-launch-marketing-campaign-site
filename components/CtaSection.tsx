"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

interface CtaSectionProps {
  onJoin: () => void;
}

export default function CtaSection({ onJoin }: CtaSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.1, margin: "0px 0px 80px 0px" });
  const [loaded, setLoaded] = useState(false);
  const [fallbackInView, setFallbackInView] = useState(false);

  useEffect(() => {
    if (isInView) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const inView = rect.top < window.innerHeight * 0.85 && rect.bottom > -50;
        if (inView) setFallbackInView(true);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [isInView]);

  const visible = isInView || fallbackInView;

  return (
    <section
      ref={ref}
      className="min-h-screen flex flex-col items-center justify-between px-6 py-16"
    >
      <motion.div
        className="text-center max-w-lg mx-auto flex flex-col items-center w-full flex-1 flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
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
          className="relative mx-auto mt-12 block w-[280px] h-[84px] sm:w-[340px] sm:h-[100px] flex items-center justify-center hover:opacity-90 transition-opacity duration-200 cursor-pointer border-0 bg-transparent animate-bounce"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/cloud.svg"
            alt=""
            className="absolute inset-0 w-full h-full object-contain object-center pointer-events-none"
          />
          <span className="relative z-10 font-display font-semibold text-lg sm:text-xl text-storm text-center px-4">
            Join the Movement
          </span>
        </button>
      </motion.div>

      {/* Cloud with eyes - bottom, above footer */}
      <motion.div
        className="flex items-center justify-center w-full max-w-[520px] sm:max-w-[580px] mx-auto pb-8 animate-ip-bounce"
        initial={{ opacity: 0 }}
        animate={{ opacity: visible && loaded ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/cloud-with-eyes.svg"
          alt=""
          className="w-full h-auto object-contain"
          loading="eager"
          fetchPriority="high"
          onLoad={() => setLoaded(true)}
        />
      </motion.div>
    </section>
  );
}
