"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
      <div
        className="absolute inset-0 -z-[1] opacity-[0.04] blur-3xl pointer-events-none"
        aria-hidden
      >
        <Image
          src="/logo.png"
          alt=""
          fill
          className="object-contain scale-150"
        />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-6">
        <div className="w-28 h-10 flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Leo Mây"
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="w-32" />
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
        <motion.p
          className="mt-8 text-mist text-lg sm:text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.8 }}
        >
          Premium climbing. Ho Chi Minh City. 2026.
        </motion.p>
      </motion.div>
    </section>
  );
}
