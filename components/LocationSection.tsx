"use client";

import { motion } from "framer-motion";
import BrandAnimalWatermark from "./BrandAnimalWatermark";

export default function LocationSection() {
  return (
    <section className="relative min-h-screen h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      <BrandAnimalWatermark variant="location" />
      <motion.div
        className="text-center max-w-xl mx-auto"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <p className="text-sm sm:text-base tracking-wide uppercase mb-3" style={{ color: "#00CB4D" }}>
          Coming to
        </p>
        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-light text-storm tracking-tight leading-tight">
          Ho Chi Minh City
        </h2>
        <p className="mt-4 text-storm/60 text-lg sm:text-xl">
          Vietnam · 2026
        </p>
      </motion.div>
    </section>
  );
}
