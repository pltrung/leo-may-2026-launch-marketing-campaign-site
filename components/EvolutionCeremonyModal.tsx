"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import { ASCENSION_TIERS, getProgressToNextTier } from "@/lib/tiers";

const GOLD_ACCENT = "#C9A227";
const LAST_SEEN_TIER_KEY = "leo_may_last_seen_tier";

interface EvolutionCeremonyModalProps {
  displayTier: number;
  referralCount: number;
  accent: string;
  locale: Locale;
  onClose: () => void;
  onInviteMore: () => void;
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8l3 3 7-7" />
    </svg>
  );
}

export default function EvolutionCeremonyModal({
  displayTier,
  referralCount,
  accent,
  locale,
  onClose,
  onInviteMore,
}: EvolutionCeremonyModalProps) {
  const messages = getMessages(locale);
  const t = messages.countdown.evolutionPopup;
  const [shimmerDone, setShimmerDone] = useState(false);

  const tierConfig = ASCENSION_TIERS[Math.min(5, Math.max(0, displayTier))];
  const tierName = locale === "vi" ? tierConfig.nameVi : tierConfig.nameEn;
  const rewardText = locale === "vi" ? tierConfig.rewardVi : tierConfig.rewardEn;

  const nextTierProgress = getProgressToNextTier(displayTier, referralCount);
  const isMaxTier = nextTierProgress.isMaxTier;
  const nextTierConfig = !isMaxTier ? ASCENSION_TIERS[displayTier + 1] : null;
  const nextTierName = nextTierConfig ? (locale === "vi" ? nextTierConfig.nameVi : nextTierConfig.nameEn) : "";
  const climbersNeeded = !isMaxTier
    ? Math.max(0, (nextTierConfig?.referralsRequired ?? 0) - referralCount)
    : 0;

  useEffect(() => {
    const id = setTimeout(() => setShimmerDone(true), 800);
    return () => clearTimeout(id);
  }, []);

  const handleClose = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LAST_SEEN_TIER_KEY, String(displayTier));
      } catch {
        // ignore
      }
    }
    onClose();
  };

  const handleInviteMore = () => {
    handleClose();
    onInviteMore();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleClose}
        aria-modal
        role="dialog"
        aria-labelledby="evolution-ceremony-headline"
      >
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          aria-hidden
        />
        <motion.div
          className="relative w-full max-w-[min(92vw,380px)] rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: "linear-gradient(165deg, #0a1a3a 0%, #0242FF 30%, #0d2d5c 70%, #061428 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 25px 50px -12px rgba(0,0,0,0.5)",
          }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            aria-hidden
            style={{
              background: "radial-gradient(ellipse 80% 50% at 50% 10%, rgba(2,66,255,0.2) 0%, transparent 60%)",
            }}
          />
          <div className="relative px-6 py-6 flex flex-col items-center text-center">
            <div className="relative w-full flex flex-col items-center">
              <h2
                id="evolution-ceremony-headline"
                className="font-subheadline text-xl sm:text-2xl font-bold text-white text-center leading-tight"
                style={{
                  textShadow: shimmerDone ? `0 0 20px ${GOLD_ACCENT}40` : "none",
                }}
              >
                {t.headline.replace("{identity}", tierName)}
              </h2>
              {!shimmerDone && (
                <motion.div
                  className="absolute inset-0 pointer-events-none overflow-hidden rounded"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    width: "70%",
                    background: `linear-gradient(90deg, transparent 0%, ${GOLD_ACCENT}30 50%, transparent 100%)`,
                  }}
                />
              )}
            </div>
            <p className="font-caption text-white/80 text-sm mt-2">
              {t.subtitle}
            </p>

            <div className="mt-4 w-full flex items-start gap-2 text-left px-1">
              <IconCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: GOLD_ACCENT }} />
              <p className="font-caption text-sm text-white/90">{rewardText}</p>
            </div>

            {isMaxTier ? (
              <p className="font-caption text-white/70 text-sm mt-4">
                {t.finalEvolution}
              </p>
            ) : (
              <div className="mt-4 w-full rounded-xl px-3 py-2.5 text-left border border-white/15 bg-white/5">
                <p className="font-caption text-[10px] uppercase tracking-wider text-white/60 mb-0.5">
                  {t.nextEvolution}
                </p>
                <p className="font-subheadline font-semibold text-sm text-white">
                  {nextTierName}
                </p>
                <p className="font-caption text-xs text-white/70 mt-0.5">
                  {t.climbersToRise.replace("{n}", String(climbersNeeded))}
                </p>
              </div>
            )}

            <div className="mt-6 w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={handleInviteMore}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: GOLD_ACCENT, color: "#1E2A38" }}
              >
                {t.inviteMore}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl font-medium text-sm border border-white/30 text-white/95 hover:bg-white/10 transition-colors"
              >
                {t.continue}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export { LAST_SEEN_TIER_KEY };
