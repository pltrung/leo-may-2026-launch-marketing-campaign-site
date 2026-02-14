"use client";

import { motion } from "framer-motion";

export default function PhilosophySection() {
  return (
    <section className="relative min-h-screen h-screen flex flex-col items-center justify-center px-6 overflow-hidden pt-[120px] md:pt-24">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-[40%] max-w-[200px] h-[40%] max-h-[200px] rounded-full bg-white/5 animate-mist-drift" style={{ filter: "blur(40px)" }} />
        <div className="absolute top-1/2 right-1/4 w-[30%] max-w-[160px] h-[30%] max-h-[160px] rounded-full bg-white/4 animate-mist-drift" style={{ filter: "blur(50px)", animationDelay: "-6s" }} />
        <div className="absolute bottom-1/3 left-1/2 w-[35%] max-w-[180px] h-[35%] max-h-[180px] rounded-full bg-white/5 animate-mist-drift" style={{ filter: "blur(45px)", animationDelay: "-12s" }} />
      </div>
      <motion.p
        className="font-subheadline text-xl sm:text-2xl md:text-3xl leading-relaxed text-white text-center max-w-2xl mx-auto relative z-10"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        Where the mist holds space for what you become.
      </motion.p>
    </section>
  );
}
