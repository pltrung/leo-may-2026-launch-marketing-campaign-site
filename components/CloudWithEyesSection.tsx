"use client";

import { motion } from "framer-motion";

export default function CloudWithEyesSection() {
  return (
    <section className="relative min-h-[50vh] flex items-center justify-center py-12 overflow-hidden">
      <motion.div
        className="flex items-center justify-center w-full max-w-[280px] sm:max-w-[320px] mx-auto"
        initial={{ opacity: 0, y: 12 }}
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
    </section>
  );
}
