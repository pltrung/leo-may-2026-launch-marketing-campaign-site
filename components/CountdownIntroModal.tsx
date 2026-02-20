"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";

const TEXT_PRIMARY = "#1E2A38";
const FALLBACK_ACCENT = "#C9A227";

interface CountdownIntroModalProps {
  locale: Locale;
  accent?: string;
  onContinue: () => void;
}

export default function CountdownIntroModal({ locale, accent, onContinue }: CountdownIntroModalProps) {
  const messages = getMessages(locale);
  const t = messages.countdown.countdownIntro;
  const modalAccent = accent && accent !== "#ffffff" && accent !== "#fff" ? accent : FALLBACK_ACCENT;
  const paragraphs = t.body.split(/\n\n+/).filter(Boolean);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onContinue}
        aria-modal
        role="dialog"
        aria-labelledby="countdown-intro-title"
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
        <motion.div
          className="relative w-full max-w-[min(92vw,400px)] max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl border overflow-hidden"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            color: TEXT_PRIMARY,
            boxShadow: `0 0 40px ${modalAccent}25, 0 24px 48px rgba(0,0,0,0.12)`,
            borderColor: `${modalAccent}50`,
          }}
        >
          <div className="relative px-6 py-6 flex flex-col items-center text-center">
            <h2
              id="countdown-intro-title"
              className="font-subheadline text-xl sm:text-2xl font-bold leading-tight"
              style={{ color: TEXT_PRIMARY }}
            >
              {t.title}
            </h2>
            <div className="mt-5 flex flex-col gap-3 text-left">
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="font-body text-sm sm:text-base leading-relaxed"
                  style={{ color: TEXT_PRIMARY, opacity: 0.9 }}
                >
                  {p}
                </p>
              ))}
            </div>
            <button
              type="button"
              onClick={onContinue}
              className="mt-6 w-full py-3 rounded-xl font-semibold text-sm transition-transform hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: modalAccent, color: "#1E2A38", border: "none" }}
            >
              {t.cta}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
