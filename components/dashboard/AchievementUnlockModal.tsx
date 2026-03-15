"use client";

import React, { useEffect } from "react";

export type UnlockType = "achievement" | "milestone" | "reward";

export interface AchievementUnlockData {
  type: UnlockType;
  title: string;
  titleVi?: string;
  subtitle?: string;
  subtitleVi?: string;
  icon?: string;
  reward?: string;
  rewardVi?: string;
  code?: string;
}

interface AchievementUnlockModalProps {
  open: boolean;
  onClose: () => void;
  data: AchievementUnlockData | null;
  isVi: boolean;
}

export default function AchievementUnlockModal({ open, onClose, data, isVi }: AchievementUnlockModalProps) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open || !data) return null;

  const title = isVi && data.titleVi ? data.titleVi : data.title;
  const subtitle = isVi && data.subtitleVi ? data.subtitleVi : data.subtitle;
  const reward = data.reward ? (isVi && data.rewardVi ? data.rewardVi : data.reward) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-unlock-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-sm rounded-[24px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300"
        style={{
          background: "linear-gradient(145deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.99) 100%)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <div className="mb-4 flex justify-center">
          <span className="text-5xl" aria-hidden>
            {data.icon ?? "🏆"}
          </span>
        </div>
        <p
          id="achievement-unlock-title"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90 mb-1"
        >
          {data.type === "achievement" ? (isVi ? "Thành tựu mở khóa" : "Achievement Unlocked") : data.type === "milestone" ? (isVi ? "Mốc đạt được" : "Milestone Reached") : (isVi ? "Phần thưởng mới" : "New Reward Earned")}
        </p>
        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-white/70 mb-3">
            {subtitle}
          </p>
        )}
        {reward && (
          <p className="text-sm font-medium text-emerald-400">
            🎁 {reward}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 px-6 py-2.5 rounded-full text-sm font-medium bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
        >
          {isVi ? "Tuyệt" : "Awesome"}
        </button>
      </div>
    </div>
  );
}
