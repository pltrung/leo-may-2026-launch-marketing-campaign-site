"use client";

import { motion } from "framer-motion";

export default function StorySection() {
  return (
    <section className="py-24 px-6">
      <motion.div
        className="max-w-xl mx-auto text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <p className="font-display text-storm/80 text-xl sm:text-2xl leading-relaxed">
          Where breath meets movement. Where the mist holds space for what you
          become.
        </p>
      </motion.div>
    </section>
  );
}
