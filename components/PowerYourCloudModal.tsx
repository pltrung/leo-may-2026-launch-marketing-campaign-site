"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import {
  deltaUsdToReachTier,
  backendTierToDisplay,
  displayTierToBackend,
  getProgressToNextTier,
} from "@/lib/tiers";
import AscensionTimeline from "@/components/AscensionTimeline";

/** Gold accent for current tier, upgrade CTAs, and progress bar in Power Your Cloud modal. */
const GOLD_ACCENT = "#C9A227";

interface PowerYourCloudModalProps {
  locale: Locale;
  accentHex: string;
  tierLevel: number;
  totalContributionUsd: number;
  referralCount: number;
  referralUrl: string;
  shareMessage: string;
  userIdentifier: string;
  identifierType: "email" | "phone";
  onClose: () => void;
  onOpenShare: () => void;
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function PowerYourCloudModal({
  locale,
  accentHex,
  tierLevel,
  totalContributionUsd,
  referralCount,
  referralUrl,
  shareMessage,
  userIdentifier,
  identifierType,
  onClose,
  onOpenShare,
}: PowerYourCloudModalProps) {
  const messages = getMessages(locale);
  const t = messages.countdown.powerYourCloudModal;
  const currentDisplayTier = backendTierToDisplay(tierLevel);
  const [loadingTier, setLoadingTier] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentsConfigured, setPaymentsConfigured] = useState(true);

  const handleUpgrade = async (displayTier: number) => {
    const backendTier = displayTierToBackend(displayTier);
    const delta = deltaUsdToReachTier(totalContributionUsd, backendTier);
    if (delta <= 0) return;
    setError(null);
    setLoadingTier(displayTier);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_tier: backendTier,
          identifier: userIdentifier,
          identifier_type: identifierType,
          locale,
        }),
      });
      const data = await res.json();
      if (res.status === 503 || (data?.error && String(data.error).toLowerCase().includes("not configured"))) {
        setPaymentsConfigured(false);
        setError(null);
        setLoadingTier(null);
        return;
      }
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong");
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError("No checkout URL");
    } catch {
      setError("Network error");
    } finally {
      setLoadingTier(null);
    }
  };

  const tierProgress = getProgressToNextTier(currentDisplayTier, referralCount);
  const showProgressBar = !tierProgress.isMaxTier && tierProgress.nextTierDelta > 0;
  const progressPct = showProgressBar
    ? Math.min(100, (tierProgress.progressToNext / tierProgress.nextTierDelta) * 100)
    : 0;
  const progressLabel = tierProgress.isMaxTier
    ? t.finalEvolutionReached
    : t.freePathProgress
        .replace("{current}", String(tierProgress.progressToNext))
        .replace("{threshold}", String(tierProgress.nextTierDelta))
        .replace("{tier}", String(tierProgress.nextTierNumber));

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        aria-modal
        role="dialog"
        aria-labelledby="power-your-cloud-title"
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          aria-hidden
        />
        <motion.div
          className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl shadow-2xl"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "linear-gradient(165deg, #0a1a3a 0%, #0242FF 35%, #0d2d5c 70%, #061428 100%)",
            color: "rgba(255,255,255,0.95)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 25px 50px -12px rgba(0,0,0,0.5)",
          }}
        >
          {/* Soft radial glow (mascot-style) */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"
            aria-hidden
            style={{
              background: "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(2,66,255,0.25) 0%, rgba(2,66,255,0.08) 40%, transparent 70%)",
            }}
          />
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-md rounded-t-2xl">
            <h2 id="power-your-cloud-title" className="font-subheadline font-semibold text-lg text-white">
              {t.title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -m-2 rounded-full hover:bg-white/10 transition-colors text-white"
              aria-label="Close"
            >
              <IconClose className="w-5 h-5" />
            </button>
          </div>

          <div className="relative p-4 space-y-4">
            {/* FREE PATH — frosted glass card */}
            <section className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-3 shadow-lg">
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/70 border-b border-white/15 pb-1.5 mb-2">
                {t.freePathTitle}
              </p>
              <p className="text-sm text-white/90 mb-2">{t.shareToEarn}</p>
              {showProgressBar && (
                <>
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden mb-1.5">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      style={{ backgroundColor: GOLD_ACCENT }}
                    />
                  </div>
                  <p className="text-xs text-white/60 mb-2">{progressLabel}</p>
                </>
              )}
              {!showProgressBar && (
                <p className="text-xs text-white/60 mb-2">{progressLabel}</p>
              )}
              <button
                type="button"
                onClick={onOpenShare}
                className="w-full py-2 px-4 rounded-xl font-medium text-sm border-2 transition-transform hover:scale-[1.02] active:scale-[0.98] border-white/30 text-white hover:bg-white/10"
              >
                Share
              </button>
            </section>

            {/* UNLOCKABLE REWARDS — single timeline with upgrade CTAs inside */}
            <section aria-label={messages.countdown.rewardsTitle}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/70 border-b border-white/15 pb-1.5 mb-2">
                {messages.countdown.rewardsTitle}
              </p>
              <AscensionTimeline
                locale={locale}
                accentHex={GOLD_ACCENT}
                currentTier={currentDisplayTier}
                variant="frosted"
                onUpgrade={handleUpgrade}
                loadingTier={loadingTier ?? undefined}
                upgradeError={error ?? undefined}
                paymentsConfigured={paymentsConfigured}
                paymentsComingSoonLabel={t.paymentsComingSoon}
              />
              {currentDisplayTier < 5 && (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={!paymentsConfigured || loadingTier !== null}
                    onClick={() => handleUpgrade(5)}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-medium border-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      borderColor: GOLD_ACCENT,
                      backgroundColor: paymentsConfigured ? `${GOLD_ACCENT}22` : "rgba(255,255,255,0.08)",
                      color: GOLD_ACCENT,
                    }}
                    title={!paymentsConfigured ? t.paymentsComingSoon : undefined}
                  >
                    {!paymentsConfigured ? t.paymentsComingSoon : loadingTier === 5 ? "..." : t.becomeFoundingCircle}
                  </button>
                </div>
              )}
              {error && (
                <p className="mt-2 text-xs text-amber-200" role="alert">
                  {error}
                </p>
              )}
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
