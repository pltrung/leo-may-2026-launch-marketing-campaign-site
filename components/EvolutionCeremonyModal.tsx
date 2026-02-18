"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import { ASCENSION_TIERS, getProgressToNextTier } from "@/lib/tiers";

const LAST_SEEN_TIER_KEY = "leo_may_last_seen_tier";

/** Fallback when cloud accent is too light for contrast (match PowerYourCloudModal). */
const FALLBACK_ACCENT = "#C9A227";
const CONTENT_BLOCK_BG = "#F5F5F5";
const BORDER_LIGHT = "rgba(0,0,0,0.08)";
const TEXT_PRIMARY = "#1E2A38";
const TEXT_SECONDARY = "#555";

interface EvolutionCeremonyModalProps {
  displayTier: number;
  referralCount: number;
  accent: string;
  locale: Locale;
  onClose: () => void;
  onInviteMore: () => void;
}

function IconCheck({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

  const modalAccent = accent && accent !== "#ffffff" && accent !== "#fff" ? accent : FALLBACK_ACCENT;

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
        transition={{ duration: 0.2 }}
        onClick={handleClose}
        aria-modal
        role="dialog"
        aria-labelledby="evolution-ceremony-headline"
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          aria-hidden
        />
        <motion.div
          className="relative w-full max-w-[min(92vw,380px)] rounded-2xl shadow-2xl border overflow-hidden"
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
            <div className="relative w-full flex flex-col items-center">
              <h2
                id="evolution-ceremony-headline"
                className="font-subheadline text-xl sm:text-2xl font-bold leading-tight"
                style={{
                  color: TEXT_PRIMARY,
                  textShadow: shimmerDone ? `0 0 24px ${modalAccent}40` : "none",
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
                    background: `linear-gradient(90deg, transparent 0%, ${modalAccent}25 50%, transparent 100%)`,
                  }}
                />
              )}
            </div>
            <p className="font-caption text-sm mt-2" style={{ color: TEXT_SECONDARY }}>
              {t.subtitle}
            </p>

            <div className="mt-4 w-full flex items-start gap-2 text-left px-0">
              <IconCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: modalAccent }} />
              <p className="font-caption text-sm" style={{ color: TEXT_PRIMARY }}>{rewardText}</p>
            </div>

            {isMaxTier ? (
              <p className="font-caption text-sm mt-4" style={{ color: TEXT_SECONDARY }}>
                {t.finalEvolution}
              </p>
            ) : (
              <section
                className="mt-4 w-full rounded-xl px-3 py-2.5 text-left border"
                style={{ backgroundColor: CONTENT_BLOCK_BG, borderColor: BORDER_LIGHT }}
              >
                <p className="font-caption text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: TEXT_SECONDARY }}>
                  {t.nextEvolution}
                </p>
                <p className="font-subheadline font-semibold text-sm" style={{ color: TEXT_PRIMARY }}>
                  {nextTierName}
                </p>
                <p className="font-caption text-xs mt-0.5" style={{ color: TEXT_SECONDARY }}>
                  {t.climbersToRise.replace("{n}", String(climbersNeeded))}
                </p>
              </section>
            )}

            <div className="mt-6 w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={handleInviteMore}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-transform hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: modalAccent, color: "#1E2A38" }}
              >
                {t.inviteMore}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl font-medium text-sm border transition-colors hover:bg-black/5"
                style={{ borderColor: BORDER_LIGHT, color: TEXT_PRIMARY }}
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
