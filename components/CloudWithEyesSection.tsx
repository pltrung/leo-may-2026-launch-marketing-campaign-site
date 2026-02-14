"use client";

import { motion } from "framer-motion";

export default function CloudWithEyesSection() {
  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center py-12 overflow-hidden pt-[120px] md:pt-24">
      {/* Cloud with eyes */}
      <motion.div
        className="flex items-center justify-center w-full max-w-[280px] sm:max-w-[320px] mx-auto"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/cloud-with-eyes.svg"
          alt=""
          className="w-full h-auto object-contain animate-ip-bounce"
          loading="eager"
          fetchPriority="high"
        />
      </motion.div>

      <motion.div
        className="text-center max-w-lg mx-auto mt-6 md:mt-8 px-4"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
      >
        <p className="font-headline text-xl sm:text-2xl md:text-3xl text-white tracking-headline">
          Every cloud moves differently.
        </p>
        <p className="font-body text-lg sm:text-xl md:text-2xl text-white/50 mt-2">
          So should you.
        </p>
      </motion.div>
    </section>
  );
}
