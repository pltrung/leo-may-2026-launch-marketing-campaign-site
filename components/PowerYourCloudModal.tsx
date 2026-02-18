"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import {
  PAID_ASCENSION_TIERS,
  deltaUsdToReachTier,
  backendTierToDisplay,
  displayTierToBackend,
} from "@/lib/tiers";
import AscensionTimeline from "@/components/AscensionTimeline";

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

  const progressPct = referralCount >= 50 ? 100 : Math.min(100, (referralCount / 50) * 100);

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
          className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-white shadow-xl"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{ color: "#1E2A38" }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-black/8 bg-white/95 backdrop-blur">
            <h2 id="power-your-cloud-title" className="font-subheadline font-semibold text-lg">
              {t.title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -m-2 rounded-full hover:bg-black/6 transition-colors"
              aria-label="Close"
            >
              <IconClose className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* FREE PATH */}
            <section>
              <p className="text-[10px] font-medium uppercase tracking-wider text-black/75 border-b border-black/15 pb-2 mb-2">
                {t.freePathTitle}
              </p>
              <p className="text-sm text-black/80 mb-2">{t.shareToEarn}</p>
              <div className="h-2 rounded-full bg-black/10 overflow-hidden mb-2">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ backgroundColor: accentHex }}
                />
              </div>
              <p className="text-xs text-black/60 mb-3">
                {t.freePathDesc} — {referralCount} / 50
              </p>
              <button
                type="button"
                onClick={onOpenShare}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-sm border-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ borderColor: accentHex, color: accentHex }}
              >
                Share
              </button>
            </section>

            {/* UNLOCKABLE REWARDS — Vertical Ascension Timeline (Tier 0–5) */}
            <section aria-label={messages.countdown.rewardsTitle}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-black/75 border-b border-black/15 pb-2 mb-3">
                {messages.countdown.rewardsTitle}
              </p>
              <AscensionTimeline
                locale={locale}
                accentHex={accentHex}
                currentTier={currentDisplayTier}
                variant="dark"
              />
            </section>

            {/* UPGRADE INSTANTLY — Paid tiers 1–5 only (Tier 0 never shown) */}
            <section>
              <p className="text-[10px] font-medium uppercase tracking-wider text-black/75 border-b border-black/15 pb-2 mb-3">
                {t.upgradeInstantlyTitle}
              </p>
              <div className="grid gap-2.5">
                {PAID_ASCENSION_TIERS.map((cfg) => {
                  const displayTier = cfg.tier;
                  const backendTier = displayTierToBackend(displayTier);
                  const price = cfg.priceUsd;
                  const unlocked = currentDisplayTier > displayTier;
                  const isCurrent = currentDisplayTier === displayTier;
                  const delta = deltaUsdToReachTier(totalContributionUsd, backendTier);
                  const loading = loadingTier === displayTier;
                  const tierName = locale === "vi" ? cfg.nameVi : cfg.nameEn;
                  return (
                    <motion.div
                      key={displayTier}
                      className="rounded-xl border border-black/10 p-3.5 transition-transform hover:translate-y-[-1px]"
                      style={{
                        backgroundColor: unlocked || isCurrent ? `${accentHex}08` : "rgba(0,0,0,0.03)",
                        borderColor: unlocked || isCurrent ? `${accentHex}28` : undefined,
                      }}
                      whileHover={{ y: -1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-xs text-black/90">
                            Tier {displayTier} — ${price} — {tierName}
                          </p>
                        </div>
                        {unlocked ? (
                          <span
                            className="shrink-0 py-1 px-2.5 rounded-full text-[10px] font-medium uppercase"
                            style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
                          >
                            {t.unlocked}
                          </span>
                        ) : isCurrent ? (
                          <span
                            className="shrink-0 py-1 px-2.5 rounded-full text-[10px] font-medium uppercase"
                            style={{ backgroundColor: `${accentHex}25`, color: accentHex }}
                          >
                            {t.current}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={loading || delta <= 0}
                            onClick={() => handleUpgrade(displayTier)}
                            className="shrink-0 py-1 px-2.5 rounded-full text-[10px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: accentHex }}
                          >
                            {loading
                              ? "..."
                              : t.upgradeToTier.replace("{tier}", String(displayTier))}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-600" role="alert">
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
