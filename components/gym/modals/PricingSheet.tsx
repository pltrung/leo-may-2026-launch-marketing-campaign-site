"use client";

import React, { useEffect, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";

interface Plan {
  id: string;
  name: string;
  price_vnd: number;
  duration_days?: number;
  duration_visits?: number;
}

interface PricingSheetProps {
  open: boolean;
  onClose: () => void;
}

function formatVnd(n: number): string {
  return n.toLocaleString("vi-VN");
}

export default function PricingSheet({ open, onClose }: PricingSheetProps) {
  const locale = useLocale();
  const m = getMessages(locale as "en" | "vi").gym.pricingModal;
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d?.plans ?? []))
      .catch(() => setPlans([]));
  }, [open]);

  const dayPlans = plans.filter((p) => (p.duration_visits ?? 0) === 0 && (p.duration_days ?? 0) > 0);
  const visitPlans = plans.filter((p) => (p.duration_visits ?? 0) > 0);

  return (
    <BottomSheet open={open} onClose={onClose} title={m.title}>
      <div className="flex flex-col gap-4" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
        {dayPlans.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              {locale === "vi" ? "Day Pass" : "Day Pass"}
            </p>
            {dayPlans.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-white/20 bg-white/5 p-4 flex justify-between items-center"
              >
                <p className="font-medium text-white">{p.name}</p>
                <p className="font-semibold text-white">{formatVnd(p.price_vnd)} VND</p>
              </div>
            ))}
          </div>
        )}
        {visitPlans.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              {locale === "vi" ? "Visit Pass" : "Visit Pass"}
            </p>
            {visitPlans.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-white/20 bg-white/5 p-4 flex justify-between items-center"
              >
                <p className="font-medium text-white">{p.name}</p>
                <p className="font-semibold text-white">{formatVnd(p.price_vnd)} VND</p>
              </div>
            ))}
          </div>
        )}
        {plans.length === 0 && (
          <p className="text-center text-sm text-white/60">{m.comingSoon}</p>
        )}
      </div>
    </BottomSheet>
  );
}
