"use client";

import { motion } from "framer-motion";
import { cloudPersonalities, CloudPersonality } from "@/lib/cloudData";
import { CloudBlob } from "@/components/CloudBlob";
import FogBackground from "@/components/FogBackground";

interface StepCloudDetailProps {
  personality: CloudPersonality;
  onClose: () => void;
  onCtaClick: () => void;
}

const springPanel = { type: "spring" as const, stiffness: 280, damping: 26 };
const stagger = 0.08;

/**
 * Installation panel: large cloud visible, text beside/below.
 * Large elegant serif heading, spaced body, CTA blue, green hover.
 */
export default function StepCloudDetail({
  personality,
  onClose,
  onCtaClick,
}: StepCloudDetailProps) {
  const cloudIndex = cloudPersonalities.findIndex((c) => c.id === personality.id);
  const safeIndex = cloudIndex >= 0 ? cloudIndex : 0;

  return (
    <motion.div
      key="cloudDetail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      style={{ width: "100vw", height: "100vh" }}
      role="dialog"
      aria-modal="true"
    >
      {/* Darkened fog — click to close */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 pointer-events-none">
        <FogBackground variant="deep" />
      </div>

      {/* Content: cloud + text (no card, no borders) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={springPanel}
        className="relative z-10 w-full max-w-2xl flex flex-col sm:flex-row items-center gap-8 sm:gap-12 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 text-white/60 hover:text-white/90 transition-colors rounded-full p-1"
          aria-label="Close"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        {/* Large cloud shape remains visible */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="flex-shrink-0 w-40 h-40 sm:w-52 sm:h-52"
        >
          <CloudBlob
            index={safeIndex}
            tint={personality.tint}
            depth={1}
            onClick={() => {}}
            showSparkles={personality.tint === "yellow"}
          />
        </motion.div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="font-serif text-3xl sm:text-4xl font-semibold text-white/95 tracking-tight"
          >
            {personality.name}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + stagger, duration: 0.4 }}
            className="mt-1 text-sm text-white/60"
            style={{ fontFamily: "var(--font-leo)" }}
          >
            {personality.nameVi} · {personality.mood}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + stagger * 2, duration: 0.4 }}
            className="mt-8 whitespace-pre-line text-base sm:text-lg font-light leading-relaxed text-white/80"
            style={{ fontFamily: "var(--font-leo)", letterSpacing: "0.02em" }}
          >
            {personality.description}
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + stagger * 3, duration: 0.4 }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCtaClick}
            className="mt-10 font-leo w-full sm:w-auto px-10 py-4 rounded-2xl text-base font-semibold text-white transition-colors duration-300"
            style={{
              fontFamily: "var(--font-leo)",
              background: "#0242FF",
              boxShadow: "0 0 40px rgba(2,66,255,0.35)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#00CB4D";
              e.currentTarget.style.boxShadow = "0 0 48px rgba(0,203,77,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0242FF";
              e.currentTarget.style.boxShadow = "0 0 40px rgba(2,66,255,0.35)";
            }}
          >
            {personality.cta}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
