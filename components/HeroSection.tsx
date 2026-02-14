"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Logo from "./Logo";
import BrandAnimalWatermark from "./BrandAnimalWatermark";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="absolute inset-0 -z-[1] opacity-[0.04] blur-3xl pointer-events-none" aria-hidden>
        <Image src="/logo.png" alt="" fill className="object-contain scale-150" />
      </div>
      <BrandAnimalWatermark variant="hero" />

      <nav className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between pl-10 pt-8 pb-6 pr-6">
        <div className="flex items-center">
          <Logo className="w-[140px] md:w-[200px] h-auto object-contain object-left" />
        </div>
        <div className="w-28" aria-hidden />
      </nav>

      <motion.div
        className="flex flex-col items-center justify-center text-center max-w-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="font-display text-4xl sm:text-5xl md:text-6xl font-light text-storm tracking-tight leading-tight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Climb the Clouds.
        </motion.h1>
        <motion.span
          className="block font-display text-4xl sm:text-5xl md:text-6xl font-light text-storm/70 tracking-tight mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          Build a Culture.
        </motion.span>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.6 }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-mist/60 text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-mist/40 rounded-full animate-pulse" />
        </div>
      </motion.div>
    </section>
  );
}
