"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import FogBackground from "@/components/FogBackground";

interface StepRevealProps {
  onEnter: () => void;
}

const spring = { type: "spring" as const, stiffness: 280, damping: 26 };

/**
 * Logo emerges from fog: blur-to-sharp, slight mask clearing, inside atmosphere.
 */
export default function StepReveal({ onEnter }: StepRevealProps) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ width: "100vw", height: "100vh", background: "#2a2e36" }}
    >
      <FogBackground variant="soft" />

      {/* Bulletproof center: absolute + translate so content is always viewport-centered */}
      <div
        className="absolute left-1/2 top-1/2 z-10 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-4 text-center"
        style={{ maxWidth: "36rem" }}
      >
        {/* Logo: emerge from fog */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(20px)", scale: 0.96 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          transition={{
            duration: 2.2,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="flex justify-center"
        >
          <div
            className="relative inline-flex items-center justify-center"
            style={{
              padding: "clamp(2rem, 6vw, 4rem)",
              maxWidth: "min(300px, 88vw)",
              filter: "drop-shadow(0 0 40px rgba(255,252,248,0.18)) drop-shadow(0 0 80px rgba(2,66,255,0.1))",
            }}
          >
            <Image
              src="/logo.svg"
              alt="Leo Mây — Climbing Gym"
              width={322}
              height={143}
              className="h-auto w-full object-contain"
              priority
              unoptimized
            />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 1 }}
          className="font-leo mt-8 text-xl font-light tracking-wide text-white/90 sm:text-2xl md:text-3xl"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          Climb the Clouds. Build a Culture.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 1.4 }}
          className="mt-14 flex justify-center"
        >
          <motion.button
            type="button"
            onClick={onEnter}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="leo-btn-enter font-leo min-w-[180px] px-12 py-5 text-lg font-semibold text-[#0242FF] sm:text-xl"
            style={{ fontFamily: "var(--font-leo)" }}
          >
            Enter
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
