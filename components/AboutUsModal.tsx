"use client";

import { motion } from "framer-motion";

interface AboutUsModalProps {
  onClose: () => void;
}

const ABOUT_CONTENT = [
  "We are a collective of people brought together by a quiet obsession — climbing.",
  "Like any meaningful pursuit, climbing speaks a universal language. It transcends background, culture, and form. It reminds us of something simple, yet often forgotten: connection.",
  "Many of us did not always feel at home in our own bodies.",
  "We grew up under the weight of expectations — told what the body should look like, how it should move, what it should be. We learned to see ourselves through the lens of judgment, measuring our worth against shapes and standards that were never truly ours.",
  "But climbing changed that.",
  "On the wall, there is no perfect body. There is only movement, intention, breath, and presence.",
  "Clouds exist in infinite forms — soft, heavy, scattered, towering — yet each is made of the same elements. None is more \"correct\" than another. Each simply becomes what it is meant to be.",
  "We are no different.",
  "At Leo Mây, we welcome every climber — every shape, every story, every journey. Whether you come seeking strength, peace, joy, or simply curiosity, this is a space where you are free to move as yourself.",
  "Not to become someone else.",
  "But to rediscover who you already are.",
  "We look forward to climbing with you — through every mist, every storm, and every clear sky ahead.",
];

export default function AboutUsModal({ onClose }: AboutUsModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-storm/40 backdrop-blur-sm" aria-hidden />
      <motion.div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-2xl bg-white/95 overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-6 pt-6 pb-3 border-b border-mist/30">
          <h2 className="font-subheadline text-xl font-bold text-storm">About Us</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-storm/60 hover:text-storm hover:bg-storm/5 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="font-body text-storm text-[15px] leading-relaxed space-y-4">
            {ABOUT_CONTENT.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
