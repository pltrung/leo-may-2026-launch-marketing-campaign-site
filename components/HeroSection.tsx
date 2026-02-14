"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Logo from "./Logo";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen h-screen flex flex-col items-center justify-center px-6 overflow-hidden pt-[120px] md:pt-24">
      <div className="absolute inset-0 -z-[1] opacity-[0.04] blur-3xl pointer-events-none" aria-hidden>
        <Image src="/logo-white.svg" alt="" fill className="object-contain scale-150" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between pl-10 pt-8 pb-6 pr-6">
        <div className="flex items-center">
          <Logo className="w-[110px] md:w-[200px] max-w-[110px] md:max-w-none h-auto object-contain object-left" />
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
          className="font-headline text-4xl sm:text-5xl md:text-6xl text-white tracking-headline leading-tight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Climb the Clouds.
        </motion.h1>
        <motion.span
          className="block font-headline text-4xl sm:text-5xl md:text-6xl tracking-headline mt-2"
          style={{ color: "#00CB4D" }}
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
          <span className="font-caption text-white/70 text-xs tracking-widest uppercase">Scroll</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/arrow-up.svg"
            alt=""
            className="w-8 h-auto animate-bounce object-contain"
          />
        </div>
      </motion.div>
    </section>
  );
}
