"use client";

import { useRef, useEffect, useState, useCallback, forwardRef } from "react";
import { motion } from "framer-motion";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import { ASCENSION_TIERS, getEvoRoman, displayTierToBackend, deltaUsdToReachTier } from "@/lib/tiers";

const STAGGER_MS = 80;

function hexToRgb(hex: string): string {
  const m = hex.replace(/^#/, "").match(/^(..)(..)(..)$/);
  if (!m) return "0,0,0";
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}

function IconCheck({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8l3 3 7-7" />
    </svg>
  );
}

interface AscensionTimelineProps {
  locale: Locale;
  accentHex: string;
  currentTier: number;
  variant?: "light" | "dark" | "frosted" | "lightModal";
  onUpgrade?: (displayTier: number) => void;
  loadingTier?: number;
  upgradeError?: string;
  paymentsConfigured?: boolean;
  paymentsComingSoonLabel?: string;
  /** Current total contribution USD; when set, upgrade labels show delta to reach tier, not full tier price. */
  totalContributionUsd?: number;
}

/** First tier index that is locked (tier > currentTier). */
function getNextLockedTier(currentTier: number): number | null {
  if (currentTier >= 5) return null;
  return currentTier + 1;
}

export default function AscensionTimeline({
  locale,
  accentHex,
  currentTier,
  variant = "light",
  onUpgrade,
  loadingTier,
  upgradeError,
  paymentsConfigured = true,
  paymentsComingSoonLabel,
  totalContributionUsd = 0,
}: AscensionTimelineProps) {
  const messages = getMessages(locale);
  const t = messages.countdown.powerYourCloudModal;
  const [reducedMotion, setReducedMotion] = useState(false);
  const [expandedTier, setExpandedTier] = useState<number | null>(currentTier);
  const containerRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nextLocked = getNextLockedTier(currentTier);

  // Keep expanded card in sync with current tier (countdown page: highlight right tier; modal: open with current tier)
  useEffect(() => {
    setExpandedTier(currentTier);
  }, [currentTier]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const fn = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const rgb = hexToRgb(accentHex);
  const isFrosted = variant === "frosted";
  const isLightModal = variant === "lightModal";

  return (
    <section
      ref={containerRef}
      aria-label={messages.countdown.rewardsTitle}
      className="w-full"
    >
      <div className="flex flex-col md:flex-row md:gap-4 md:items-stretch">
        {/* LEFT: Subtle vertical line only */}
        <div
          className="hidden md:block relative w-px flex-shrink-0 md:min-w-[1px] md:py-1"
          aria-hidden
        >
          <div
            className="absolute left-0 top-1 bottom-1 w-px pointer-events-none"
            style={{
              background: isLightModal
                ? "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.12) 20%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.12) 80%, transparent 100%)"
                : isFrosted
                  ? "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.15) 15%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 85%, transparent 100%)"
                  : `linear-gradient(to bottom, transparent 0%, rgba(${rgb},0.2) 10%, rgba(${rgb},0.35) 50%, rgba(${rgb},0.2) 90%, transparent 100%)`,
            }}
          />
        </div>

        {/* RIGHT: Tier cards (accordion: one expanded at a time) */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {ASCENSION_TIERS.map((cfg, index) => {
            const unlocked = currentTier > cfg.tier;
            const isCurrent = currentTier === cfg.tier;
            const locked = currentTier < cfg.tier;
            const isExpanded = expandedTier === cfg.tier;

            const pillText =
              cfg.tier === 0
                ? t.free
                : isCurrent
                  ? t.current
                  : unlocked
                    ? t.unlocked
                    : t.locked;
            const name = locale === "vi" ? cfg.nameVi : cfg.nameEn;
            const flavor = locale === "vi" ? cfg.flavorVi : cfg.flavorEn;
            const reward = locale === "vi" ? cfg.rewardVi : cfg.rewardEn;
            const backendTier = displayTierToBackend(cfg.tier);
            const deltaUsd = deltaUsdToReachTier(totalContributionUsd, backendTier);
            const upgradePriceLabel = deltaUsd;

            return (
              <TierCard
                key={cfg.tier}
                ref={(el: HTMLDivElement | null) => {
                  cardRefs.current[index] = el;
                }}
                tier={cfg.tier}
                name={name}
                flavor={flavor}
                reward={reward}
                pillText={pillText}
                unlocked={unlocked}
                isCurrent={isCurrent}
                locked={locked}
                priceUsd={cfg.priceUsd}
                accentHex={accentHex}
                rgb={rgb}
                variant={variant}
                reducedMotion={reducedMotion}
                staggerIndex={index}
                isExpanded={isExpanded}
                onToggle={() => setExpandedTier(isExpanded ? null : cfg.tier)}
                onUpgrade={cfg.tier >= 1 ? onUpgrade : undefined}
                loadingTier={loadingTier}
                upgradeLabel={t.upgradeToTierPrice.replace("{tier}", String(cfg.tier)).replace("{price}", String(upgradePriceLabel))}
                paymentsConfigured={paymentsConfigured}
                paymentsComingSoonLabel={paymentsComingSoonLabel}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface TierCardProps {
  tier: number;
  name: string;
  flavor: string;
  reward: string;
  pillText: string;
  unlocked: boolean;
  isCurrent: boolean;
  locked: boolean;
  priceUsd: number;
  accentHex: string;
  rgb: string;
  variant: "light" | "dark" | "frosted" | "lightModal";
  reducedMotion: boolean;
  staggerIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpgrade?: (displayTier: number) => void;
  loadingTier?: number;
  upgradeLabel: string;
  paymentsConfigured?: boolean;
  paymentsComingSoonLabel?: string;
}

const TierCard = forwardRef<HTMLDivElement, TierCardProps>(
  (
    {
      tier,
      name,
      flavor,
      reward,
      pillText,
      unlocked,
      isCurrent,
      locked,
      priceUsd,
      accentHex,
      rgb,
      variant,
      reducedMotion,
      staggerIndex,
      isExpanded,
      onToggle,
      onUpgrade,
      loadingTier,
      upgradeLabel,
      paymentsConfigured = true,
      paymentsComingSoonLabel,
    },
    ref
  ) => {
    const [visible, setVisible] = useState(false);
    const [node, setNode] = useState<HTMLDivElement | null>(null);
    const setRef = useCallback(
      (el: HTMLDivElement | null) => {
        setNode(el);
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      },
      [ref]
    );

    useEffect(() => {
      if (reducedMotion) {
        setVisible(true);
        return;
      }
      if (!node) return;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) setVisible(true);
          });
        },
        { threshold: 0.1, rootMargin: "30px" }
      );
      io.observe(node);
      return () => io.disconnect();
    }, [reducedMotion, node]);

    const isFrosted = variant === "frosted";
    const isLightModal = variant === "lightModal";
    const isLight = variant === "light";
    const isDark = variant === "dark";
    const goldOnly = isFrosted;
    const pillAccent = isLightModal ? (isCurrent ? accentHex : undefined) : (goldOnly && isCurrent ? accentHex : (isCurrent || (tier > 0 && unlocked) ? accentHex : undefined));
    const usePillNeutral = tier === 0 || (locked && (goldOnly || isLightModal));

    const bg = isLightModal
      ? "#F5F5F5"
      : isLight
        ? isCurrent
          ? `rgba(${rgb},0.22)`
          : locked
            ? "rgba(255,255,255,0.05)"
            : "rgba(255,255,255,0.1)"
        : isFrosted
          ? "rgba(255,255,255,0.08)"
          : isDark
            ? unlocked || isCurrent
              ? `rgba(${rgb},0.08)`
              : "rgba(0,0,0,0.03)"
            : "rgba(255,255,255,0.06)";
    const borderColor = isLightModal
      ? "rgba(0,0,0,0.08)"
      : isLight
        ? isCurrent
          ? `rgba(${rgb},0.6)`
          : "rgba(255,255,255,0.2)"
        : isFrosted
          ? isCurrent
            ? `rgba(${rgb},0.5)`
            : "rgba(255,255,255,0.12)"
          : isDark
            ? unlocked || isCurrent
              ? `rgba(${rgb},0.25)`
              : "rgba(0,0,0,0.1)"
            : "rgba(255,255,255,0.2)";
    const textPrimary = isLightModal ? "#1E2A38" : isFrosted || !isDark || isLight ? "rgba(255,255,255,0.95)" : "#1E2A38";
    const textSecondary = isLightModal ? "#555" : isFrosted || !isDark || isLight ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)";

    const loading = loadingTier === tier;
    const showUpgradeCta = locked && tier >= 1 && onUpgrade;
    const upgradeDisabled = !paymentsConfigured || loading;
    const upgradeButtonLabel = !paymentsConfigured && paymentsComingSoonLabel ? paymentsComingSoonLabel : loading ? "..." : upgradeLabel;

    return (
      <motion.div
        ref={setRef}
        role="button"
        tabIndex={0}
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={
          reducedMotion
            ? {}
            : {
                opacity: visible ? 1 : 0,
                y: visible ? 0 : 12,
              }
        }
        transition={{
          duration: 0.35,
          delay: reducedMotion ? 0 : staggerIndex * (STAGGER_MS / 1000),
          ease: [0.22, 1, 0.36, 1],
        }}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`
          rounded-2xl border transition-[transform,box-shadow] duration-200 ease-out cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${isFrosted ? "backdrop-blur-md focus-visible:ring-offset-[#0f2744]" : ""}
          ${isLightModal ? "focus-visible:ring-offset-white" : ""}
          ${isDark ? "focus-visible:ring-offset-white" : ""}
          ${isLight ? "focus-visible:ring-offset-transparent" : ""}
          ${!isDark && !isFrosted && !isLightModal && !isLight ? "focus-visible:ring-offset-[#0242FF]" : ""}
          ${locked && isFrosted ? "opacity-95" : ""}
        `}
        style={{
          backgroundColor: bg,
          borderColor,
          padding: isExpanded ? "0.75rem 1rem" : "0.5rem 0.75rem",
          boxShadow: isFrosted ? "0 4px 16px rgba(0,0,0,0.15)" : isLightModal ? "0 1px 3px rgba(0,0,0,0.06)" : isLight && isCurrent ? `0 0 20px rgba(${rgb},0.35)` : undefined,
          filter: locked && isFrosted ? "saturate(0.85)" : undefined,
        }}
        whileHover={
          isFrosted && !reducedMotion && isExpanded
            ? { y: -1, boxShadow: "0 6px 20px rgba(0,0,0,0.2)" }
            : isLightModal && !reducedMotion
              ? { y: -1, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }
              : isLight && !reducedMotion ? { y: -1, boxShadow: isCurrent ? `0 0 24px rgba(${rgb},0.4)` : "0 4px 16px rgba(0,0,0,0.15)" } : undefined
        }
        aria-label={`Evo ${getEvoRoman(tier)}: ${name}, ${pillText}`}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-[10px] font-medium uppercase tracking-wider shrink-0 opacity-80"
              style={{ color: textSecondary }}
            >
              EVO {getEvoRoman(tier)}
            </span>
            <span
              className="font-subheadline font-semibold text-sm truncate"
              style={{ color: textPrimary }}
            >
              {name}
            </span>
          </div>
          <span
            className="shrink-0 py-0.5 px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
            style={
              isLight
                ? tier === 0
                  ? { backgroundColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.95)" }
                  : isCurrent
                    ? { backgroundColor: accentHex, color: "#ffffff" }
                    : unlocked
                      ? { backgroundColor: `rgba(${rgb},0.35)`, color: "rgba(255,255,255,0.98)" }
                      : { backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }
                : {
                    backgroundColor: isLightModal && usePillNeutral ? "rgba(0,0,0,0.1)" : usePillNeutral ? "rgba(255,255,255,0.2)" : (pillAccent ? `${pillAccent}22` : `${accentHex}22`),
                    color: isLightModal && usePillNeutral ? "#555" : usePillNeutral ? "rgba(255,255,255,0.95)" : (pillAccent ?? accentHex),
                  }
            }
          >
            {pillText}
          </span>
        </div>

        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{
            height: { duration: reducedMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: reducedMotion ? 0 : 0.2 },
          }}
          className="overflow-hidden"
        >
          <div className="pt-1.5">
            <p
              className="text-xs font-caption italic"
              style={{ color: textSecondary }}
            >
              {flavor}
            </p>
            <div className="flex items-start gap-2 mt-2 text-xs" style={{ color: textSecondary }}>
              <IconCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-90" style={{ color: isLightModal ? (isCurrent || unlocked ? accentHex : "#999") : isLight ? (isCurrent || unlocked ? accentHex : "rgba(255,255,255,0.5)") : isCurrent || unlocked ? accentHex : "rgba(255,255,255,0.5)" }} />
              <span>{reward}</span>
            </div>
            {showUpgradeCta && (
              <button
                type="button"
                disabled={upgradeDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!upgradeDisabled && onUpgrade) onUpgrade(tier);
                }}
                className="mt-3 w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: accentHex,
                  color: "#1E2A38",
                }}
              >
                {upgradeButtonLabel}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }
);

TierCard.displayName = "TierCard";
