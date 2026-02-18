"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import {
  TIER_PRICES_USD,
  TIER_LABELS_EN,
  TIER_LABELS_VI,
  deltaUsdToReachTier,
} from "@/lib/tiers";

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

const TIERS = [2, 3, 4, 5, 6] as const;

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
  const tierLabels = locale === "vi" ? TIER_LABELS_VI : TIER_LABELS_EN;
  const [loadingTier, setLoadingTier] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (targetTier: number) => {
    const delta = deltaUsdToReachTier(totalContributionUsd, targetTier);
    if (delta <= 0) return;
    setError(null);
    setLoadingTier(targetTier);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_tier: targetTier,
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

            {/* UPGRADE INSTANTLY */}
            <section>
              <p className="text-[10px] font-medium uppercase tracking-wider text-black/75 border-b border-black/15 pb-2 mb-3">
                {t.upgradeInstantlyTitle}
              </p>
              <div className="grid gap-3">
                {TIERS.map((tier) => {
                  const price = TIER_PRICES_USD[tier] ?? 0;
                  const unlocked = tierLevel >= tier;
                  const delta = deltaUsdToReachTier(totalContributionUsd, tier);
                  const loading = loadingTier === tier;
                  return (
                    <motion.div
                      key={tier}
                      className="rounded-xl border border-black/10 p-4 transition-transform hover:translate-y-[-2px]"
                      style={{
                        backgroundColor: unlocked ? `${accentHex}08` : "rgba(0,0,0,0.03)",
                        borderColor: unlocked ? `${accentHex}30` : undefined,
                      }}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">
                            Tier {tier} – ${price}
                          </p>
                          <p className="text-xs text-black/65 mt-0.5">
                            {tierLabels[tier] ?? ""}
                          </p>
                        </div>
                        {unlocked ? (
                          <span
                            className="shrink-0 py-1.5 px-3 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${accentHex}20`, color: accentHex }}
                          >
                            {t.unlocked}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={loading || delta <= 0}
                            onClick={() => handleUpgrade(tier)}
                            className="shrink-0 py-1.5 px-3 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: accentHex }}
                          >
                            {loading
                              ? "..."
                              : t.upgradeToTier.replace("{tier}", String(tier))}
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
