"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface StepRevealProps {
  guestName: string;
  setGuestName: (v: string) => void;
  onEnter: () => void;
}

const spring = { type: "spring" as const, stiffness: 280, damping: 26 };

/**
 * Brand reveal — flex-centered, no absolute positioning for logo.
 */
export default function StepReveal({ guestName, setGuestName, onEnter }: StepRevealProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 max-w-xl w-full">
      <motion.div
        initial={{ opacity: 0, filter: "blur(12px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex justify-center"
      >
        <div
          className="max-w-[280px] w-[85vw]"
          style={{
            filter: "brightness(0) invert(1) drop-shadow(0 0 24px rgba(255,255,255,0.15))",
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.5 }}
        className="text-white/92 text-xl sm:text-2xl font-light tracking-wide mt-4"
        style={{ fontFamily: "var(--font-leo)" }}
      >
        Climb the Clouds. Build a Culture.
      </motion.p>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.8 }}
        className="mt-6 p-5 rounded-xl bg-white/5 border border-white/10 w-full max-w-sm"
      >
        <label
          htmlFor="leo-guest-name"
          className="block text-sm font-semibold text-white/90 mb-2"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          Your name (enter first, then continue below)
        </label>
        <input
          id="leo-guest-name"
          type="text"
          placeholder="Enter your name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          maxLength={80}
          autoComplete="name"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-base"
          style={{ fontFamily: "var(--font-leo)" }}
        />
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 1.1 }}
        className="mt-6"
      >
        <button
          type="button"
          onClick={() => {
            console.log("ENTER CLICKED");
            onEnter();
          }}
          className="leo-btn-enter px-12 py-4 text-lg font-semibold text-[#0242FF] cursor-pointer"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          Enter
        </button>
      </motion.div>
    </div>
  );
}
