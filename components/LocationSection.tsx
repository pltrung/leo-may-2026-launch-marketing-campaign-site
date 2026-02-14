"use client";

import { motion } from "framer-motion";

export default function LocationSection() {
  return (
    <section className="relative min-h-screen h-screen flex flex-col items-center justify-center px-6 overflow-hidden pt-[120px] md:pt-24">
      <motion.p
        className="font-subheadline text-center text-2xl sm:text-3xl md:text-4xl text-white/95 max-w-xl mx-auto leading-relaxed"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px", amount: 0.3 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        Coming to Ho Chi Minh City — 2026.
      </motion.p>
    </section>
  );
}
