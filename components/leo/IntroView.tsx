"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface IntroViewProps {
  onEnter: () => void;
}

export default function IntroView({ onEnter }: IntroViewProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-full w-full px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Logo — emerges slowly from dreamlike blur */}
      <motion.div
        className="flex justify-center mb-8"
        initial={{ opacity: 0, filter: "blur(20px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{
          duration: 2.5,
          ease: [0.22, 0.61, 0.36, 1],
        }}
      >
        <div
          className="w-[min(85vw,320px)]"
          style={{
            filter: "brightness(0) invert(1) drop-shadow(0 0 40px rgba(255,255,255,0.08))",
          }}
        >
          <Image
            src="/logo.svg"
            alt="Leo Mây"
            width={322}
            height={143}
            className="w-full h-auto"
            priority
          />
        </div>
      </motion.div>

      {/* Tagline — fades in after logo */}
      <motion.p
        className="text-white/60 text-lg sm:text-xl font-light tracking-[0.2em] uppercase mb-16"
        style={{ fontFamily: "var(--font-leo)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1.2, ease: "easeOut" }}
      >
        Climb the Clouds
      </motion.p>

      {/* Enter — soft invitation, clearly clickable */}
      <motion.button
        type="button"
        onClick={onEnter}
        className="cursor-pointer py-3 px-8 rounded-full text-white/50 hover:text-white/90 text-sm tracking-[0.3em] uppercase transition-colors duration-500 border border-white/10 hover:border-white/25"
        style={{ fontFamily: "var(--font-leo)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.2, duration: 1 }}
        whileHover={{ letterSpacing: "0.4em", scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Enter
      </motion.button>
    </motion.div>
  );
}
