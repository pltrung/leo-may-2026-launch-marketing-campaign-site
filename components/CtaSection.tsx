"use client";

import { motion } from "framer-motion";
import HoldButton from "./HoldButton";

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
        <div className="mt-12 flex justify-center">
          <HoldButton onClick={onJoin}>Choose Your Cloud</HoldButton>
        </div>
      </motion.div>
    </section>
  );
}
