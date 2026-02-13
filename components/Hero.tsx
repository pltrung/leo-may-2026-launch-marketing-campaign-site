"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
      <div
        className="absolute inset-0 -z-[1] opacity-[0.03] blur-3xl pointer-events-none"
        aria-hidden
      >
        <Image
          src="/logo.svg"
          alt=""
          fill
          className="object-contain scale-150"
          style={{ filter: "brightness(0) saturate(100%)" }}
        />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-6">
        <div className="w-24 h-8 flex items-center">
          <Image
            src="/logo.svg"
            alt="Leo Mây"
            width={96}
            height={32}
            className="h-6 w-auto opacity-90"
            style={{ filter: "brightness(0) saturate(100%)" }}
          />
        </div>
        <a
          href="#clouds"
          className="px-5 py-2.5 rounded-full bg-storm/10 hover:bg-storm/20 text-storm text-sm font-medium transition-colors"
        >
          Join Founding Circle
        </a>
      </nav>

      <motion.div
        className="flex flex-col items-center justify-center text-center max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-light text-storm tracking-tight leading-tight">
          Climb the Clouds.
          <br />
          <span className="text-storm/70">Build a Culture.</span>
        </h1>
        <p className="mt-8 text-mist text-lg sm:text-xl">
          Premium climbing. Ho Chi Minh City. 2026.
        </p>
      </motion.div>
    </section>
  );
}
