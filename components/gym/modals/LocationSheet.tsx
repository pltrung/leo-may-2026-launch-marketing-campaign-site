"use client";

import React from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";

interface LocationSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function LocationSheet({ open, onClose }: LocationSheetProps) {
  const locale = useLocale();
  const m = getMessages(locale as "en" | "vi").gym.locationModal;

  return (
    <BottomSheet open={open} onClose={onClose} title={m.title}>
      <div className="flex flex-col gap-4" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
        <p className="text-lg font-medium text-[var(--sky-text-primary)]">{m.address}</p>
        <p className="text-[var(--sky-text-secondary)]">{m.dummyAddress}</p>
        <p className="text-sm text-white/70">{m.hours}</p>
      </div>
    </BottomSheet>
  );
}
