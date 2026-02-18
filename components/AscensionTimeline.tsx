"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import { ASCENSION_TIERS } from "@/lib/tiers";

const STAGGER_MS = 100;
const GLOW_BY_TIER = [0.08, 0.12, 0.18, 0.24, 0.32, 0.4] as const;

function hexToRgb(hex: string): string {
  const m = hex.replace(/^#/, "").match(/^(..)(..)(..)$/);
  if (!m) return "0,0,0";
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}

interface AscensionTimelineProps {
  locale: Locale;
  accentHex: string;
  /** Display tier 0–5 (user's current tier). Mock with 2 for demo. */
  currentTier: number;
  /** Optional: use dark text/card style (e.g. in modal). Default light-on-dark. */
  variant?: "light" | "dark";
}

export default function AscensionTimeline({
  locale,
  accentHex,
  currentTier,
  variant = "light",
}: AscensionTimelineProps) {
  const messages = getMessages(locale);
  const t = messages.countdown.powerYourCloudModal;
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const fn = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const scrollToCard = useCallback((index: number) => {
    const el = cardRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      el.focus({ preventScroll: true });
    }
  }, []);

  const rgb = hexToRgb(accentHex);
  const isDark = variant === "dark";

  return (
    <section
      ref={containerRef}
      aria-label={messages.countdown.rewardsTitle}
      className="w-full"
    >
      <div className="flex flex-col md:flex-row md:gap-8 md:items-stretch">
        {/* LEFT: Vertical spine + nodes (desktop); horizontal nodes (mobile) */}
        <div
          className="relative flex flex-row md:flex-col items-center justify-center gap-2 md:gap-4 md:min-w-[56px] md:py-2 mb-4 md:mb-0"
          role="list"
          aria-label="Tier stages"
        >
          {/* Vertical line: desktop only, soft gradient */}
          <div
            className="hidden md:block absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, transparent 0%, rgba(${rgb},0.2) 10%, rgba(${rgb},0.35) 50%, rgba(${rgb},0.2) 90%, transparent 100%)`,
            }}
            aria-hidden
          />
          {ASCENSION_TIERS.map((cfg, index) => {
            const unlocked = currentTier >= cfg.tier;
            const isCurrent = currentTier === cfg.tier;
            const locked = !unlocked;
            const label = `T${cfg.tier}`;
            return (
              <button
                key={cfg.tier}
                type="button"
                role="listitem"
                onClick={() => scrollToCard(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    scrollToCard(index);
                  }
                }}
                className={`
                  relative z-10 w-10 h-10 md:w-9 md:h-9 rounded-full flex items-center justify-center
                  text-xs font-medium shrink-0
                  transition-[box-shadow,transform] duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
                  ${locked ? "bg-transparent border-2 opacity-60" : "border-2 border-transparent"}
                  ${isCurrent ? "ascension-node-breathe" : ""}
                `}
                style={{
                  borderColor: locked ? `rgba(${rgb},0.4)` : "transparent",
                  backgroundColor: unlocked ? accentHex : "transparent",
                  color: unlocked ? (isDark ? "#1E2A38" : "#fff") : `rgba(${rgb},0.6)`,
                  boxShadow: unlocked
                    ? `0 0 ${isCurrent ? 14 : 8}px rgba(${rgb},${isCurrent ? 0.5 : 0.35})`
                    : "none",
                }}
                aria-label={`${label}, ${cfg.tier === 0 ? t.free : cfg.tier === currentTier ? t.current : unlocked ? t.unlocked : t.locked}. Go to card.`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* RIGHT: Tier cards */}
        <div className="flex-1 flex flex-col gap-4 md:gap-5 min-w-0">
          {ASCENSION_TIERS.map((cfg, index) => {
            const unlocked = currentTier >= cfg.tier;
            const isCurrent = currentTier === cfg.tier;
            const locked = !unlocked;
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
            const glowIntensity = GLOW_BY_TIER[cfg.tier];

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
                accentHex={accentHex}
                rgb={rgb}
                glowIntensity={glowIntensity}
                variant={variant}
                reducedMotion={reducedMotion}
                staggerIndex={index}
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
  accentHex: string;
  rgb: string;
  glowIntensity: number;
  variant: "light" | "dark";
  reducedMotion: boolean;
  staggerIndex: number;
}

const TierCard = motion.forwardRef<HTMLDivElement, TierCardProps>(
  (
    {
      tier,
      name,
      flavor,
      reward,
      pillText,
      unlocked,
      isCurrent,
      accentHex,
      rgb,
      glowIntensity,
      variant,
      reducedMotion,
      staggerIndex,
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
        { threshold: 0.15, rootMargin: "40px" }
      );
      io.observe(node);
      return () => io.disconnect();
    }, [reducedMotion, node]);

    const isDark = variant === "dark";
    const bg = isDark
      ? unlocked
        ? `rgba(${rgb},0.08)`
        : "rgba(0,0,0,0.03)"
      : `rgba(255,255,255,0.06)`;
    const borderColor = isDark
      ? unlocked
        ? `rgba(${rgb},0.25)`
        : "rgba(0,0,0,0.1)"
      : "rgba(255,255,255,0.2)";
    const textPrimary = isDark ? "#1E2A38" : "rgba(255,255,255,0.95)";
    const textSecondary = isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.75)";

    return (
      <motion.div
        ref={setRef}
        tabIndex={-1}
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={
          reducedMotion
            ? {}
            : {
                opacity: visible ? 1 : 0,
                y: visible ? 0 : 16,
              }
        }
        transition={{
          duration: 0.4,
          delay: reducedMotion ? 0 : staggerIndex * (STAGGER_MS / 1000),
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`
          rounded-[20px] p-4 md:p-5
          border transition-[transform,box-shadow] duration-300 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${variant === "dark" ? "focus-visible:ring-offset-white" : "focus-visible:ring-offset-[#0242FF]"}
        `}
        style={{
          backgroundColor: bg,
          borderColor,
          boxShadow: `0 4px 20px rgba(0,0,0,0.08), 0 0 ${12 + glowIntensity * 24}px rgba(${rgb},${glowIntensity * 0.6})`,
        }}
        whileHover={
          variant === "dark" && !reducedMotion
            ? { y: -2, boxShadow: `0 8px 28px rgba(0,0,0,0.12), 0 0 ${16 + glowIntensity * 20}px rgba(${rgb},${glowIntensity * 0.5})` }
            : undefined
        }
        aria-label={`Tier ${tier}: ${name}, ${pillText}`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <span
            className="text-[10px] font-medium uppercase tracking-wider opacity-80"
            style={{ color: textSecondary }}
          >
            TIER {tier}
          </span>
          <span
            className="shrink-0 py-1 px-2.5 rounded-full text-[10px] font-medium uppercase tracking-wide"
            style={{
              backgroundColor: tier === 0 ? "rgba(255,255,255,0.2)" : `${accentHex}20`,
              color: tier === 0 ? (isDark ? "#1E2A38" : "rgba(255,255,255,0.95)") : accentHex,
            }}
          >
            {pillText}
          </span>
        </div>
        <h3
          className="font-subheadline font-semibold text-lg md:text-xl mb-1"
          style={{ color: textPrimary }}
        >
          {name}
        </h3>
        <p
          className="text-sm mb-3 font-caption italic"
          style={{ color: textSecondary }}
        >
          {flavor}
        </p>
        <ul className="list-disc list-inside text-xs space-y-0.5" style={{ color: textSecondary }}>
          <li>{reward}</li>
        </ul>
      </motion.div>
    );
  }
);

TierCard.displayName = "TierCard";
