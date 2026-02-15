"use client";

import { motion } from "framer-motion";

export default function PhilosophySection() {
  return (
    <section className="hero-section hero-mist-section relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden pt-[120px] md:pt-24">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-[50%] max-w-[280px] h-[50%] max-h-[280px] rounded-full bg-white/12 animate-mist-drift" style={{ filter: "blur(35px)" }} />
        <div className="absolute top-1/2 right-1/4 w-[45%] max-w-[220px] h-[45%] max-h-[220px] rounded-full bg-white/10 animate-mist-drift" style={{ filter: "blur(40px)", animationDelay: "-6s" }} />
        <div className="absolute bottom-1/3 left-1/2 w-[48%] max-w-[260px] h-[48%] max-h-[260px] rounded-full bg-white/11 animate-mist-drift" style={{ filter: "blur(38px)", animationDelay: "-12s" }} />
      </div>
      <motion.div
        className="mist-section"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <div className="mist-text relative z-10">
          Where the <span className="emphasis">MIST</span> holds space for what you <span className="emphasis">BECOME</span>.
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/ip-city.svg"
          alt="Leo Mây City in Clouds"
          className="mist-ip-city"
          loading="eager"
          fetchPriority="high"
        />
      </motion.div>
    </section>
  );
}
