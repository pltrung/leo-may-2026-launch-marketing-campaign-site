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
  tierToMinUsd,
} from "@/lib/tiers";

const FOUNDING_CIRCLE_USD = 50;
import AscensionTimeline from "@/components/AscensionTimeline";

/** Fallback when cloud accent is too light for contrast. */
const FALLBACK_ACCENT = "#C9A227";
const CONTENT_BLOCK_BG = "#F5F5F5";
const BORDER_LIGHT = "rgba(0,0,0,0.08)";
const TEXT_PRIMARY = "#1E2A38";
const TEXT_SECONDARY = "#555";

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
          current_display_tier: currentDisplayTier,
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
  const modalAccent = accentHex && accentHex !== "#ffffff" && accentHex !== "#fff" ? accentHex : FALLBACK_ACCENT;
  const currentBackendTier = displayTierToBackend(currentDisplayTier);
  const deltaToFoundingCircle = Math.max(0, FOUNDING_CIRCLE_USD - tierToMinUsd(currentBackendTier));
  const foundingCircleButtonLabel = t.becomeFoundingCirclePrice.replace("${price}", `$${deltaToFoundingCircle}`);
  const progressPct = showProgressBar
    ? Math.min(100, (tierProgress.progressToNext / tierProgress.nextTierDelta) * 100)
    : 0;
  const progressLabel = tierProgress.isMaxTier
    ? t.finalEvolutionReached
    : t.freePathProgress
        .replace("{current}", String(tierProgress.progressToNext))
        .replace("{threshold}", String(tierProgress.nextTierDelta));

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
          className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl shadow-2xl border overflow-hidden"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            color: TEXT_PRIMARY,
            boxShadow: "0 24px 48px rgba(0,0,0,0.15)",
            borderColor: BORDER_LIGHT,
          }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b bg-white rounded-t-2xl" style={{ borderColor: BORDER_LIGHT }}>
            <h2 id="power-your-cloud-title" className="font-subheadline font-semibold text-lg" style={{ color: TEXT_PRIMARY }}>
              {t.title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -m-2 rounded-full hover:bg-black/10 transition-colors"
              style={{ color: "#666" }}
              aria-label="Close"
            >
              <IconClose className="w-5 h-5" />
            </button>
          </div>

          <div className="relative p-4 space-y-4">
            {/* FREE PATH — light grey block (on-brand with referral module) */}
            <section
              className="rounded-xl p-3 border"
              style={{ backgroundColor: CONTENT_BLOCK_BG, borderColor: BORDER_LIGHT }}
            >
              <p className="text-[10px] font-medium uppercase tracking-wider border-b pb-1.5 mb-2" style={{ color: TEXT_SECONDARY, borderColor: BORDER_LIGHT }}>
                {t.freePathTitle}
              </p>
              <p className="text-sm mb-2" style={{ color: TEXT_PRIMARY }}>{t.shareToEarn}</p>
              {showProgressBar && (
                <>
                  <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: "rgba(0,0,0,0.1)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      style={{ backgroundColor: modalAccent }}
                    />
                  </div>
                  <p className="text-xs mb-2" style={{ color: TEXT_SECONDARY }}>{progressLabel}</p>
                </>
              )}
              {!showProgressBar && (
                <p className="text-xs mb-2" style={{ color: TEXT_SECONDARY }}>{progressLabel}</p>
              )}
              <button
                type="button"
                onClick={onOpenShare}
                className="w-full py-3 rounded-xl font-medium text-sm transition-transform hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: modalAccent, color: "#1E2A38" }}
              >
                Share
              </button>
            </section>

            {/* UNLOCKABLE REWARDS — light grey section (on-brand) */}
            <section aria-label={messages.countdown.rewardsTitle}>
              <p className="text-[10px] font-medium uppercase tracking-wider border-b pb-1.5 mb-2" style={{ color: TEXT_SECONDARY, borderColor: BORDER_LIGHT }}>
                {messages.countdown.rewardsTitle}
              </p>
              <AscensionTimeline
                locale={locale}
                accentHex={modalAccent}
                currentTier={currentDisplayTier}
                variant="lightModal"
                onUpgrade={handleUpgrade}
                loadingTier={loadingTier ?? undefined}
                upgradeError={error ?? undefined}
                paymentsConfigured={paymentsConfigured}
                paymentsComingSoonLabel={t.paymentsComingSoon}
                totalContributionUsd={totalContributionUsd}
              />
              {currentDisplayTier < 5 && deltaToFoundingCircle > 0 && (
                <div className="mt-3">
                  <motion.button
                    type="button"
                    disabled={!paymentsConfigured || loadingTier !== null}
                    onClick={() => handleUpgrade(5)}
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed founding-circle-cta"
                    style={{
                      backgroundColor: paymentsConfigured ? modalAccent : CONTENT_BLOCK_BG,
                      color: "#1E2A38",
                      border: paymentsConfigured ? `2px solid ${modalAccent}` : undefined,
                      boxShadow: paymentsConfigured
                        ? `0 0 12px ${modalAccent}80, 0 0 24px ${modalAccent}40, inset 0 1px 0 rgba(255,255,255,0.2)`
                        : undefined,
                    }}
                    animate={
                      paymentsConfigured && loadingTier !== 5
                        ? {
                            boxShadow: [
                              `0 0 12px ${modalAccent}80, 0 0 24px ${modalAccent}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
                              `0 0 18px ${modalAccent}99, 0 0 36px ${modalAccent}60, inset 0 1px 0 rgba(255,255,255,0.25)`,
                              `0 0 12px ${modalAccent}80, 0 0 24px ${modalAccent}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
                            ],
                          }
                        : undefined
                    }
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    title={!paymentsConfigured ? t.paymentsComingSoon : undefined}
                  >
                    {!paymentsConfigured ? t.paymentsComingSoon : loadingTier === 5 ? "..." : foundingCircleButtonLabel}
                  </motion.button>
                </div>
              )}
              {error && (
                <p className="mt-2 text-xs" style={{ color: "#b45309" }} role="alert">
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
