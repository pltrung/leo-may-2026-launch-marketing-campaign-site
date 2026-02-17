"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EvolutionLevel } from "@/lib/evolutionLevels";
import { getLevelName, getRewardLabel, EVOLUTION_REWARDS } from "@/lib/evolutionLevels";
import type { Locale } from "@/lib/i18n";

const CEREMONY_DURATION_MS = 1400;

interface EvolutionCeremonyModalProps {
  fromLevel: EvolutionLevel;
  toLevel: EvolutionLevel;
  accent: string;
  locale: Locale;
  onClose: () => void;
}

export default function EvolutionCeremonyModal({
  fromLevel,
  toLevel,
  accent,
  locale,
  onClose,
}: EvolutionCeremonyModalProps) {
  useEffect(() => {
    const t = setTimeout(onClose, CEREMONY_DURATION_MS);
    return () => clearTimeout(t);
  }, [onClose]);

  const fromName = getLevelName(fromLevel, locale);
  const toName = getLevelName(toLevel, locale);
  const newlyUnlockedReward = EVOLUTION_REWARDS[toLevel.levelIndex];
  const showReward = newlyUnlockedReward && toLevel.levelIndex > 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        aria-modal
        role="dialog"
        aria-label="Evolution ceremony"
      >
        {/* Phase 1: dim */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          aria-hidden
        />
        {/* Phase 2: aura glow behind content */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <motion.div
            className="w-[min(90vw,320px)] h-[200px] rounded-full"
            style={{
              background: `radial-gradient(ellipse 80% 60%, ${accent}40 0%, ${accent}15 50%, transparent 70%)`,
              filter: "blur(30px)",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          />
        </motion.div>

        <motion.div
          className="relative w-full max-w-[min(90vw,340px)] rounded-2xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: "rgba(255,255,255,0.97)",
            border: `1px solid ${accent}40`,
            boxShadow: `0 0 40px ${accent}30`,
          }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-6 flex flex-col items-center text-center">
            {/* Phase 3 & 4: title morph */}
            <div className="relative h-20 flex flex-col items-center justify-center overflow-hidden">
              <motion.p
                key={`old-${fromLevel.levelIndex}`}
                className="font-subheadline text-lg font-semibold absolute text-storm"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
              >
                {fromName}
              </motion.p>
              <motion.p
                key={`new-${toLevel.levelIndex}`}
                className="font-subheadline text-lg font-semibold absolute text-storm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                {toName}
              </motion.p>
              {/* Glow pulse behind title */}
              <motion.div
                className="absolute inset-0 rounded-full -z-10"
                style={{
                  background: `radial-gradient(circle at center, ${accent}25 0%, transparent 70%)`,
                  filter: "blur(12px)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.4] }}
                transition={{ delay: 0.5, duration: 0.9, times: [0, 0.5, 1] }}
              />
            </div>

            <motion.p
              className="font-caption text-storm/80 text-sm mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.25 }}
            >
              {locale === "vi" ? "Mây của bạn đã tiến hóa." : "Your cloud has evolved."}
            </motion.p>
            <motion.p
              className="font-caption text-storm/70 text-xs mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.25 }}
            >
              {fromName} → {toName}
            </motion.p>

            {/* Phase 5: reward unlock */}
            {showReward && (
              <motion.div
                className="mt-4 px-3 py-2 rounded-xl w-full text-left"
                style={{
                  backgroundColor: `${accent}12`,
                  border: `1px solid ${accent}30`,
                  boxShadow: `0 0 16px ${accent}20`,
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.35 }}
              >
                <p className="font-caption text-[10px] uppercase tracking-wider text-storm/70 mb-1">
                  {locale === "vi" ? "Mở khóa" : "Unlocked"}
                </p>
                <p className="font-caption text-sm font-medium text-storm" style={{ color: accent }}>
                  ✦ {getRewardLabel(newlyUnlockedReward, locale)}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
