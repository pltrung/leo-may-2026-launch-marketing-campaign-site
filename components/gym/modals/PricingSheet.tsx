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
  description?: string | null;
}

interface PricingSheetProps {
  open: boolean;
  onClose: () => void;
}

function formatVnd(n: number): string {
  return n.toLocaleString("vi-VN");
}

type PlanStyle = {
  card: string;
  glow: string;
  price: string;
  benefitsWrap: string;
  benefitsBar: string;
  check: string;
  badgeClass?: string;
};

function styleForPlan(id: string): PlanStyle {
  switch (id) {
    case "newbie_class":
      return {
        card: "border-emerald-400/25 bg-gradient-to-br from-emerald-950/40 via-white/[0.04] to-teal-950/20",
        glow: "shadow-[0_0_32px_-8px_rgba(52,211,153,0.25)]",
        price: "text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-teal-300",
        benefitsWrap: "bg-emerald-950/35 border-emerald-500/15",
        benefitsBar: "bg-gradient-to-b from-emerald-400/70 to-teal-500/50",
        check: "text-emerald-400",
        badgeClass: "bg-emerald-500/20 text-emerald-200/95 border border-emerald-400/25",
      };
    case "day_pass":
      return {
        card: "border-sky-400/20 bg-gradient-to-br from-sky-950/30 via-white/[0.03] to-slate-900/40",
        glow: "shadow-[0_0_28px_-10px_rgba(56,189,248,0.2)]",
        price: "text-sky-200",
        benefitsWrap: "bg-sky-950/25 border-sky-500/12",
        benefitsBar: "bg-sky-400/60",
        check: "text-sky-400",
      };
    case "month_pass":
      return {
        card: "border-white/12 bg-gradient-to-br from-white/[0.07] via-white/[0.02] to-slate-950/50",
        glow: "shadow-[0_8px_40px_-12px_rgba(255,255,255,0.08)]",
        price: "text-white",
        benefitsWrap: "bg-white/[0.04] border-white/10",
        benefitsBar: "bg-white/25",
        check: "text-cyan-300/90",
      };
    case "half_year_pass":
      return {
        card: "border-amber-400/22 bg-gradient-to-br from-amber-950/35 via-white/[0.03] to-orange-950/25",
        glow: "shadow-[0_0_36px_-8px_rgba(251,191,36,0.18)]",
        price: "text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-200",
        benefitsWrap: "bg-amber-950/30 border-amber-500/15",
        benefitsBar: "bg-gradient-to-b from-amber-400/80 to-orange-500/45",
        check: "text-amber-400",
        badgeClass: "bg-amber-500/15 text-amber-100/90 border border-amber-400/20",
      };
    case "year_pass":
      return {
        card: "border-amber-300/30 bg-gradient-to-br from-amber-900/45 via-yellow-950/20 to-amber-950/40",
        glow: "shadow-[0_0_40px_-6px_rgba(252,211,77,0.22)]",
        price: "text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-200",
        benefitsWrap: "bg-black/25 border-amber-400/20",
        benefitsBar: "bg-gradient-to-b from-amber-300/90 to-yellow-600/50",
        check: "text-amber-300",
        badgeClass: "bg-gradient-to-r from-amber-500/25 to-yellow-600/20 text-amber-50 border border-amber-300/25",
      };
    default:
      return {
        card: "border-violet-400/18 bg-gradient-to-br from-violet-950/35 via-white/[0.03] to-fuchsia-950/20",
        glow: "shadow-[0_0_28px_-10px_rgba(167,139,250,0.2)]",
        price: "text-violet-200",
        benefitsWrap: "bg-violet-950/25 border-violet-500/12",
        benefitsBar: "bg-violet-400/55",
        check: "text-violet-400",
      };
  }
}

function planBadgeText(id: string, isVi: boolean): string | null {
  if (id === "newbie_class") return isVi ? "Trải nghiệm đầu" : "Onboarding";
  if (id === "half_year_pass") return isVi ? "Phổ biến" : "Popular";
  if (id === "year_pass") return isVi ? "Tiết kiệm nhất" : "Best value";
  return null;
}

function PlanCard({ plan, benefitsLabel, isVi }: { plan: Plan; benefitsLabel: string; isVi: boolean }) {
  const s = styleForPlan(plan.id);
  const badge = planBadgeText(plan.id, isVi);
  const lines = plan.description
    ? plan.description
        .split(/[•\n]/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-4 ${s.card} ${s.glow}`}
      style={{ fontFamily: "MiSans-Regular, sans-serif" }}
    >
      {badge && s.badgeClass && (
        <span className={`mb-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.badgeClass}`}>
          {badge}
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold leading-snug text-white/95 tracking-tight">{plan.name}</h3>
        <div className="shrink-0 text-right">
          <p className={`text-lg font-bold tabular-nums tracking-tight ${s.price}`}>{formatVnd(plan.price_vnd)}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">VND</p>
        </div>
      </div>
      {lines.length > 0 && (
        <div className={`mt-3.5 flex gap-2.5 rounded-xl border p-3 ${s.benefitsWrap}`}>
          <div className={`w-0.5 shrink-0 rounded-full ${s.benefitsBar}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">{benefitsLabel}</p>
            <ul className="space-y-2">
              {lines.map((line, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-snug text-white/78">
                  <span className={`mt-0.5 shrink-0 ${s.check}`} aria-hidden>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </article>
  );
}

export default function PricingSheet({ open, onClose }: PricingSheetProps) {
  const locale = useLocale();
  const m = getMessages(locale as "en" | "vi").gym.pricingModal;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tab, setTab] = useState<"day" | "visit">("day");

  useEffect(() => {
    if (!open) return;
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d?.plans ?? []))
      .catch(() => setPlans([]));
  }, [open]);

  useEffect(() => {
    if (open) setTab("day");
  }, [open]);

  const dayPlans = plans.filter((p) => (p.duration_visits ?? 0) === 0 && (p.duration_days ?? 0) > 0);
  const visitPlans = plans.filter((p) => (p.duration_visits ?? 0) > 0);
  const activeList = tab === "day" ? dayPlans : visitPlans;

  return (
    <BottomSheet open={open} onClose={onClose} title={m.title}>
      <div className="flex flex-col gap-3" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
        {plans.length > 0 && (
          <div
            className="flex rounded-2xl border border-white/10 bg-black/20 p-1"
            role="tablist"
            aria-label={locale === "vi" ? "Loại gói" : "Pass type"}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "day"}
              onClick={() => setTab("day")}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                tab === "day"
                  ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/15"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              {m.tabDay}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "visit"}
              onClick={() => setTab("visit")}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                tab === "visit"
                  ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/15"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              {m.tabVisit}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 min-h-[120px]" role="tabpanel">
          {activeList.length === 0 && plans.length > 0 && (
            <p className="py-8 text-center text-sm text-white/45">{m.comingSoon}</p>
          )}
          {activeList.map((p) => (
            <PlanCard key={p.id} plan={p} benefitsLabel={m.benefits} isVi={locale === "vi"} />
          ))}
        </div>

        {plans.length === 0 && <p className="py-10 text-center text-sm text-white/50">{m.comingSoon}</p>}

        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] leading-relaxed text-white/42">
            <span className="text-emerald-400/80">●</span> {m.newbieClassNote}{" "}
            <span className="text-amber-400/70">●</span> {m.passBenefitsNote}
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
