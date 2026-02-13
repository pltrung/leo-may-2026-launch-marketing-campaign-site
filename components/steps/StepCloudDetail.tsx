"use client";

import { motion } from "framer-motion";
import { CloudPersonality } from "@/lib/cloudData";

interface StepCloudDetailProps {
  personality: CloudPersonality;
  onClose: () => void;
  onCtaClick: () => void;
}

const springModal = { type: "spring" as const, stiffness: 300, damping: 24, mass: 0.8 };

export default function StepCloudDetail({
  personality,
  onClose,
  onCtaClick,
}: StepCloudDetailProps) {
  return (
    <motion.div
      key="cloudDetail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-[#1a1d21]/55 backdrop-blur-xl"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={springModal}
        className="leo-card leo-card-glow relative max-w-lg rounded-3xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#6b7280] transition-colors hover:text-[#1a1d21]"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-leo text-2xl font-semibold text-[#1a1d21]"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          {personality.name}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="font-leo mt-0.5 text-sm text-[#0242FF]/70"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          {personality.nameVi} ({personality.mood})
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="font-leo mt-6 whitespace-pre-line font-light leading-relaxed text-[#4a4d52]"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          {personality.description}
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onCtaClick}
          className="font-leo leo-btn-primary mt-8 w-full rounded-2xl py-4 text-base"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          {personality.cta}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
