"use client";

import { useRef, useEffect, useState, useCallback, forwardRef } from "react";
import { motion } from "framer-motion";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import { ASCENSION_TIERS } from "@/lib/tiers";

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
  variant?: "light" | "dark" | "frosted";
  onUpgrade?: (displayTier: number) => void;
  loadingTier?: number;
  upgradeError?: string;
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
}: AscensionTimelineProps) {
  const messages = getMessages(locale);
  const t = messages.countdown.powerYourCloudModal;
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nextLocked = getNextLockedTier(currentTier);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const fn = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const rgb = hexToRgb(accentHex);
  const isFrosted = variant === "frosted";

  return (
    <section
      ref={containerRef}
      aria-label={messages.countdown.rewardsTitle}
      className="w-full"
    >
      <div className="flex flex-col md:flex-row md:gap-4 md:items-stretch">
        {/* LEFT: Subtle vertical line only (no buttons) */}
        <div
          className="hidden md:block relative w-px flex-shrink-0 md:min-w-[1px] md:py-1"
          aria-hidden
        >
          <div
            className="absolute left-0 top-1 bottom-1 w-px pointer-events-none"
            style={{
              background: isFrosted
                ? "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.15) 15%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 85%, transparent 100%)"
                : `linear-gradient(to bottom, transparent 0%, rgba(${rgb},0.2) 10%, rgba(${rgb},0.35) 50%, rgba(${rgb},0.2) 90%, transparent 100%)`,
            }}
          />
        </div>

        {/* RIGHT: Tier cards */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {ASCENSION_TIERS.map((cfg, index) => {
            const unlocked = currentTier >= cfg.tier;
            const isCurrent = currentTier === cfg.tier;
            const locked = !unlocked;
            const isNextLocked = nextLocked !== null && cfg.tier === nextLocked;
            const isExpanded = isCurrent || isNextLocked;

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
                onUpgrade={cfg.tier >= 1 ? onUpgrade : undefined}
                loadingTier={loadingTier}
                upgradeLabel={t.upgradeToTierPrice.replace("{tier}", String(cfg.tier)).replace("{price}", String(cfg.priceUsd))}
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
  variant: "light" | "dark" | "frosted";
  reducedMotion: boolean;
  staggerIndex: number;
  isExpanded: boolean;
  onUpgrade?: (displayTier: number) => void;
  loadingTier?: number;
  upgradeLabel: string;
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
      onUpgrade,
      loadingTier,
      upgradeLabel,
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
    const isDark = variant === "dark";

    const bg = isFrosted
      ? "rgba(255,255,255,0.08)"
      : isDark
        ? unlocked
          ? `rgba(${rgb},0.08)`
          : "rgba(0,0,0,0.03)"
        : "rgba(255,255,255,0.06)";
    const borderColor = isFrosted
      ? isCurrent
        ? `rgba(${rgb},0.5)`
        : "rgba(255,255,255,0.12)"
      : isDark
        ? unlocked
          ? `rgba(${rgb},0.25)`
          : "rgba(0,0,0,0.1)"
        : "rgba(255,255,255,0.2)";
    const textPrimary = isFrosted || !isDark ? "rgba(255,255,255,0.95)" : "#1E2A38";
    const textSecondary = isFrosted || !isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)";

    const loading = loadingTier === tier;
    const showUpgradeCta = locked && tier >= 1 && onUpgrade;

    return (
      <motion.div
        ref={setRef}
        tabIndex={-1}
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
        className={`
          rounded-2xl border transition-[transform,box-shadow] duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${isFrosted ? "backdrop-blur-md focus-visible:ring-offset-[#0f2744]" : ""}
          ${isDark ? "focus-visible:ring-offset-white" : ""}
          ${!isDark && !isFrosted ? "focus-visible:ring-offset-[#0242FF]" : ""}
        `}
        style={{
          backgroundColor: bg,
          borderColor,
          padding: isExpanded ? "0.75rem 1rem" : "0.5rem 0.75rem",
          boxShadow: isFrosted ? "0 4px 16px rgba(0,0,0,0.15)" : undefined,
        }}
        whileHover={
          isFrosted && !reducedMotion && isExpanded
            ? { y: -1, boxShadow: "0 6px 20px rgba(0,0,0,0.2)" }
            : undefined
        }
        aria-label={`Tier ${tier}: ${name}, ${pillText}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-[10px] font-medium uppercase tracking-wider shrink-0 opacity-80"
              style={{ color: textSecondary }}
            >
              TIER {tier}
            </span>
            <span
              className="font-subheadline font-semibold text-sm truncate"
              style={{ color: textPrimary }}
            >
              {name}
            </span>
          </div>
          <span
            className="shrink-0 py-0.5 px-2 rounded-full text-[10px] font-medium uppercase"
            style={{
              backgroundColor: tier === 0 ? "rgba(255,255,255,0.2)" : `${accentHex}22`,
              color: tier === 0 ? "rgba(255,255,255,0.95)" : accentHex,
            }}
          >
            {pillText}
          </span>
        </div>

        {isExpanded && (
          <>
            <p
              className="text-xs mt-1.5 font-caption italic"
              style={{ color: textSecondary }}
            >
              {flavor}
            </p>
            <div className="flex items-start gap-2 mt-2 text-xs" style={{ color: textSecondary }}>
              <IconCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-90" style={{ color: accentHex }} />
              <span>{reward}</span>
            </div>
            {showUpgradeCta && (
              <button
                type="button"
                disabled={loading}
                onClick={() => onUpgrade(tier)}
                className="mt-3 w-full py-2 px-4 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{
                  backgroundColor: accentHex,
                  color: "#1E2A38",
                }}
              >
                {loading ? "..." : upgradeLabel}
              </button>
            )}
          </>
        )}
      </motion.div>
    );
  }
);

TierCard.displayName = "TierCard";
