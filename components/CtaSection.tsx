"use client";

import { motion } from "framer-motion";

interface CtaSectionProps {
  onJoin: () => void;
}

export default function CtaSection({ onJoin }: CtaSectionProps) {
  return (
    <section className="min-h-screen h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        className="text-center max-w-lg mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-storm tracking-tight">
          Join the Movement
        </h2>
        <p className="mt-6 text-storm/70 text-lg sm:text-xl">
          Be among the first to climb the clouds.
        </p>
        <motion.button
          type="button"
          onClick={onJoin}
          className="mt-12 px-12 py-4 rounded-full text-white font-medium tracking-wide transition-colors hover:bg-[#0133cc] shadow-md"
          style={{ backgroundColor: "#0242FF" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Choose Your Cloud
        </motion.button>
      </motion.div>
    </section>
  );
}
