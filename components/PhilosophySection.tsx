"use client";

import { motion } from "framer-motion";

export default function PhilosophySection() {
  return (
    <section className="hero-section hero-mist-section relative min-h-screen h-screen flex flex-col items-center justify-center px-6 overflow-hidden pt-[120px] md:pt-24">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-[50%] max-w-[280px] h-[50%] max-h-[280px] rounded-full bg-white/12 animate-mist-drift" style={{ filter: "blur(35px)" }} />
        <div className="absolute top-1/2 right-1/4 w-[45%] max-w-[220px] h-[45%] max-h-[220px] rounded-full bg-white/10 animate-mist-drift" style={{ filter: "blur(40px)", animationDelay: "-6s" }} />
        <div className="absolute bottom-1/3 left-1/2 w-[48%] max-w-[260px] h-[48%] max-h-[260px] rounded-full bg-white/11 animate-mist-drift" style={{ filter: "blur(38px)", animationDelay: "-12s" }} />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/ip-city.png"
        className="hero-ip-city"
        alt="Leo Mây City in Clouds"
      />
      <motion.h2
        className="hero-text font-subheadline text-xl sm:text-2xl md:text-3xl leading-relaxed text-center max-w-2xl mx-auto relative z-10 text-white"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        Where the <span className="emphasis">MIST</span> holds space for what you <span className="emphasis">BECOME</span>.
      </motion.h2>
    </section>
  );
}
