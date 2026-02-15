"use client";

import { motion } from "framer-motion";

export default function CloudWithEyesSection() {
  return (
    <section className="hero-section hero-cloud-section relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden py-12 pt-[120px] md:pt-24 px-6">
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
          src="/brand/cloud-singing.svg"
          alt="Singing Cloud"
          className="w-full h-auto object-contain animate-ip-bounce"
          loading="eager"
          fetchPriority="high"
        />
      </motion.div>
      <motion.div
        className="text-center max-w-md mx-auto mt-6 md:mt-8 px-4"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
      >
        <p className="font-medium text-white/90 text-lg sm:text-xl md:text-2xl leading-relaxed">
          Every cloud moves <span className="emphasis-blue">DIFFERENTLY</span>.
        </p>
        <p className="font-medium text-white/60 text-base sm:text-lg md:text-xl mt-2 leading-relaxed">
          So should <span className="emphasis-blue">YOU</span>.
        </p>
      </motion.div>
    </section>
  );
}
