"use client";

import { motion } from "framer-motion";

export default function PhilosophySection() {
  return (
    <section className="min-h-screen h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        className="max-w-2xl mx-auto text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <p className="font-display text-storm/80 text-xl sm:text-2xl md:text-3xl leading-relaxed">
          Where breath meets movement. Where the mist holds space for what you
          become.
        </p>
      </motion.div>
    </section>
  );
}
