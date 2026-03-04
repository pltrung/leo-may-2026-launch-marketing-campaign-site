"use client";

import React from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";

interface PricingSheetProps {
  open: boolean;
  onClose: () => void;
}

const TIER_KEYS = ["tier1", "tier2", "tier3", "tier4"] as const;
const DESC_KEYS = ["tier1Desc", "tier2Desc", "tier3Desc", "tier4Desc"] as const;

export default function PricingSheet({ open, onClose }: PricingSheetProps) {
  const locale = useLocale();
  const m = getMessages(locale as "en" | "vi").gym.pricingModal;

  return (
    <BottomSheet open={open} onClose={onClose} title={m.title}>
      <div className="flex flex-col gap-4" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
        {TIER_KEYS.map((key, i) => (
          <div
            key={key}
            className="rounded-xl border border-white/20 bg-white/5 p-4"
          >
            <p className="font-medium text-white">{m[key]}</p>
            <p className="mt-1 text-sm text-[var(--sky-text-secondary)]">{m[DESC_KEYS[i]]}</p>
          </div>
        ))}
        <p className="text-center text-sm text-white/60">{m.comingSoon}</p>
      </div>
    </BottomSheet>
  );
}
