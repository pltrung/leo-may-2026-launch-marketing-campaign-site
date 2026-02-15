"use client";

import { motion } from "framer-motion";

export default function PhilosophySection() {
  return (
    <section className="hero-section hero-mist-section relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden py-12 pt-[120px] md:pt-24 px-6">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-[50%] max-w-[280px] h-[50%] max-h-[280px] rounded-full bg-white/12 animate-mist-drift" style={{ filter: "blur(35px)" }} />
        <div className="absolute top-1/2 right-1/4 w-[45%] max-w-[220px] h-[45%] max-h-[220px] rounded-full bg-white/10 animate-mist-drift" style={{ filter: "blur(40px)", animationDelay: "-6s" }} />
        <div className="absolute bottom-1/3 left-1/2 w-[48%] max-w-[260px] h-[48%] max-h-[260px] rounded-full bg-white/11 animate-mist-drift" style={{ filter: "blur(38px)", animationDelay: "-12s" }} />
      </div>
      <motion.div
        className="flex items-center justify-center w-[70%] max-w-[400px] pointer-events-none"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/ip-city.svg"
          alt="Leo Mây City in Clouds"
          className="w-full h-auto object-contain animate-ip-bounce"
          loading="eager"
          fetchPriority="high"
        />
      </motion.div>
      <motion.p
        className="font-medium text-center text-white/90 text-lg sm:text-xl md:text-2xl mt-6 md:mt-8 max-w-md mx-auto px-4 leading-relaxed relative z-10"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
      >
        Where the <span className="emphasis">MIST</span> holds space for what you <span className="emphasis">BECOME</span>.
      </motion.p>
    </section>
  );
}
