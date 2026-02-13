"use client";

import { motion } from "framer-motion";
import { CloudPersonality } from "@/lib/cloudData";
import { CloudBlob } from "@/components/CloudBlob";

interface PersonalityViewProps {
  personality: CloudPersonality;
  onClose: () => void;
  onJoin: () => void;
}

export default function PersonalityView({
  personality,
  onClose,
  onJoin,
}: PersonalityViewProps) {
  const idx = ["may_nhe", "suong_mu", "giong", "ho_may", "cau_vong", "gio"].indexOf(
    personality.id
  );

  return (
    <motion.div
      className="fixed inset-0 z-20 flex items-center justify-center p-6 sm:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        aria-hidden
      />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col sm:flex-row items-center gap-10 sm:gap-14 max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 sm:top-0 sm:right-0 w-10 h-10 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Cloud */}
        <div className="flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40">
          <CloudBlob
            index={idx}
            tint={personality.tint}
            depth={1}
            onClick={() => {}}
            showSparkles={personality.tint === "yellow"}
          />
        </div>

        <div className="text-center sm:text-left">
          <h2
            className="text-2xl sm:text-3xl font-light text-white/95 tracking-tight"
            style={{ fontFamily: "var(--font-leo)" }}
          >
            {personality.name}
          </h2>
          <p
            className="mt-1 text-sm text-white/50"
            style={{ fontFamily: "var(--font-leo)" }}
          >
            {personality.nameVi} · {personality.mood}
          </p>
          <p
            className="mt-8 text-base sm:text-lg text-white/75 font-light leading-relaxed whitespace-pre-line"
            style={{ fontFamily: "var(--font-leo)", letterSpacing: "0.02em" }}
          >
            {personality.description}
          </p>
          <motion.button
            onClick={onJoin}
            className="mt-10 px-10 py-4 rounded-full text-white text-sm font-medium tracking-wider transition-all duration-300"
            style={{
              fontFamily: "var(--font-leo)",
              background: "#0242FF",
              boxShadow: "0 0 40px rgba(2,66,255,0.3)",
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: "0 0 60px rgba(2,66,255,0.4)",
            }}
            whileTap={{ scale: 0.98 }}
          >
            Join the Founding Circle
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
