"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";

const BORDER_LIGHT = "rgba(0,0,0,0.08)";
const TEXT_PRIMARY = "#1E2A38";
const TEXT_SECONDARY = "#555";
const FALLBACK_ACCENT = "#C9A227";

interface VerifyToEvolveModalProps {
  locale: Locale;
  accent?: string;
  onClose: () => void;
  onVerify: () => void;
}

export default function VerifyToEvolveModal({ locale, accent, onClose, onVerify }: VerifyToEvolveModalProps) {
  const messages = getMessages(locale);
  const t = messages.countdown.verifyToEvolvePopup;
  const modalAccent = accent && accent !== "#ffffff" && accent !== "#fff" ? accent : FALLBACK_ACCENT;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        aria-modal
        role="dialog"
        aria-labelledby="verify-to-evolve-headline"
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
        <motion.div
          className="relative w-full max-w-[min(92vw,360px)] rounded-2xl shadow-2xl border overflow-hidden"
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
              id="verify-to-evolve-headline"
              className="font-subheadline text-lg sm:text-xl font-bold leading-tight"
              style={{ color: TEXT_PRIMARY }}
            >
              {t.headline}
            </h2>
            <div className="mt-6 w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onVerify();
                }}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-transform hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: modalAccent, color: "#1E2A38" }}
              >
                {t.cta}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl font-medium text-sm border transition-colors hover:bg-black/5"
                style={{ borderColor: BORDER_LIGHT, color: TEXT_PRIMARY }}
              >
                {t.later}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
