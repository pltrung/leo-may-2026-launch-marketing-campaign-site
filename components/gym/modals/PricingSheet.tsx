"use client";

import React, { useEffect, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import {
  DAY_PASS_BASELINE_PER_VISIT_VND,
  visitPackVisitCount,
  visitPackVsDayPassBaseline,
  dayPassVsMultiDayBaseline,
  isMultiDayPass,
} from "@/lib/visitPackDayPassBaseline";

interface Plan {
  id: string;
  name: string;
  price_vnd: number;
  duration_days?: number;
  duration_visits?: number | null;
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

/** Localized titles when API returns English names */
const PLAN_NAME_VI: Record<string, string> = {
  newbie_class: "Lớp Newbie",
  day_pass: "Vé 1 ngày",
  month_pass: "Vé 30 ngày",
  half_year_pass: "Vé 180 ngày",
  year_pass: "Vé 365 ngày",
  visit_5: "Gói 5 lượt",
  visit_10: "Gói 10 lượt",
  visit_20: "Gói 20 lượt",
};

const PLAN_BENEFITS_FALLBACK_VI: Record<string, string> = {
  newbie_class: "30 phút coaching + 1 ngày vào phòng • Giày thuê + phấn miễn phí trong buổi",
  day_pass: "Vào phòng gym trọn 1 ngày (theo lịch)",
  month_pass: "Leo không giới hạn trong 30 ngày",
  half_year_pass:
    "Leo không giới hạn 180 ngày • Giảm 5% đồ/gear tại quầy • 5 mã mời bạn (mỗi mã = 1 thành viên mới, 1 lượt thưởng)",
  year_pass:
    "Leo không giới hạn 365 ngày • Giảm 10% đồ/gear tại quầy • 15 mã mời bạn (mỗi mã = 1 thành viên mới, 1 lượt thưởng)",
  visit_5: "5 lượt trả trước — dùng bất kỳ lúc nào khi tài khoản còn hiệu lực",
  visit_10: "10 lượt trả trước — dùng bất kỳ lúc nào khi tài khoản còn hiệu lực",
  visit_20: "20 lượt trả trước — dùng bất kỳ lúc nào khi tài khoản còn hiệu lực",
};

const PLAN_BENEFITS_FALLBACK_EN: Record<string, string> = {
  newbie_class: "30 minute coaching + 1 day access • Free rental shoes + chalk for your class",
  day_pass: "Full gym access for one calendar day",
  month_pass: "Unlimited climbing for 30 days",
  half_year_pass:
    "Unlimited climbing for 180 days • 5% off merchandise & gear • 5 friend visit codes (each code = one new member, one bonus visit)",
  year_pass:
    "Unlimited climbing for 365 days • 10% off merchandise & gear • 15 friend visit codes (each code = one new member, one bonus visit)",
  visit_5: "5 prepaid visits — use anytime while your account is active",
  visit_10: "10 prepaid visits — use anytime while your account is active",
  visit_20: "20 prepaid visits — use anytime while your account is active",
};

function getPlanDescription(plan: Plan, isVi: boolean): string {
  const vi = PLAN_BENEFITS_FALLBACK_VI[plan.id];
  const en = PLAN_BENEFITS_FALLBACK_EN[plan.id];
  // Vi locale: use localized benefits when we have them (DB descriptions are often English-only).
  if (isVi && vi) return vi;
  const raw = plan.description?.trim();
  if (raw) return raw;
  return isVi ? vi ?? "" : en ?? "";
}

function PlanCard({ plan, benefitsLabel, isVi, description, dayPassPriceVnd }: { plan: Plan; benefitsLabel: string; isVi: boolean; description: string; dayPassPriceVnd?: number }) {
  const s = styleForPlan(plan.id);
  const badge = planBadgeText(plan.id, isVi);
  const displayName = isVi ? PLAN_NAME_VI[plan.id] ?? plan.name : plan.name;
  const visitCount = visitPackVisitCount(plan.id, plan.duration_visits);
  const vsDayVisit = visitCount > 0 ? visitPackVsDayPassBaseline(plan.price_vnd, visitCount) : null;
  const durationDays = plan.duration_days ?? 0;
  const vsDayMulti = dayPassPriceVnd != null && isMultiDayPass(durationDays) ? dayPassVsMultiDayBaseline(plan.price_vnd, durationDays, dayPassPriceVnd) : null;
  const vsDay = vsDayVisit ?? vsDayMulti;
  const lines = description
    ? description
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
        <h3 className="text-[15px] font-semibold leading-snug text-white/95 tracking-tight">{displayName}</h3>
        <div className="shrink-0 text-right">
          <p className={`text-lg font-bold tabular-nums tracking-tight ${s.price}`}>{formatVnd(plan.price_vnd)}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">VND</p>
          {vsDay && vsDay.discountPct > 0 && (
            <p className="mt-1 max-w-[9.5rem] text-right text-[10px] leading-snug text-amber-300/95">
              <span className="text-white/40 line-through">{formatVnd(vsDay.listAtDayRateVnd)}</span>
              <br />
              {vsDayVisit ? (
                isVi ? <>~{vsDay.discountPct}% so với {visitCount} vé ngày (390k)</> : <>~{vsDay.discountPct}% off vs. {visitCount}× day (390k)</>
              ) : (
                isVi ? <>~{vsDay.discountPct}% so với {durationDays} vé ngày</> : <>~{vsDay.discountPct}% off vs. {durationDays}× day pass</>
              )}
            </p>
          )}
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
          {tab === "day" && dayPlans.length > 0 && (() => {
            const dayPassPrice = plans.find((p) => p.id === "day_pass")?.price_vnd ?? DAY_PASS_BASELINE_PER_VISIT_VND;
            return (
              <p className="rounded-xl border border-sky-400/15 bg-sky-950/20 px-3 py-2 text-[11px] leading-relaxed text-white/55">
                {locale === "vi" ? (
                  <>
                    Vé 30/180/365 ngày giảm so với mua vé 1 ngày × số ngày (vé 1 ngày:{" "}
                    <span className="text-white/75">{formatVnd(dayPassPrice)}</span> VND).
                  </>
                ) : (
                  <>
                    30/180/365 day passes are discounted vs. 1 day pass × same days (1 day:{" "}
                    <span className="text-white/75">{formatVnd(dayPassPrice)}</span> VND).
                  </>
                )}
              </p>
            );
          })()}
          {tab === "visit" && activeList.length > 0 && (
            <p className="rounded-xl border border-violet-400/15 bg-violet-950/20 px-3 py-2 text-[11px] leading-relaxed text-white/55">
              {locale === "vi" ? (
                <>
                  Gói lượt đã giảm so với mua từng vé ngày: mỗi lượt quy về{" "}
                  <span className="text-white/75">{formatVnd(DAY_PASS_BASELINE_PER_VISIT_VND)}</span>{" "}
                  (vé 1 ngày).
                </>
              ) : (
                <>
                  Visit packs are discounted vs. buying separate day passes at{" "}
                  <span className="text-white/75">{formatVnd(DAY_PASS_BASELINE_PER_VISIT_VND)}</span> each.
                </>
              )}
            </p>
          )}
          {activeList.length === 0 && plans.length > 0 && (
            <p className="py-8 text-center text-sm text-white/45">{m.comingSoon}</p>
          )}
          {activeList.map((p) => {
            const dayPassPriceVnd = tab === "day" ? (plans.find((x) => x.id === "day_pass")?.price_vnd ?? DAY_PASS_BASELINE_PER_VISIT_VND) : undefined;
            return (
              <PlanCard
                key={p.id}
                plan={p}
                benefitsLabel={m.benefits}
                isVi={locale === "vi"}
                description={getPlanDescription(p, locale === "vi")}
                dayPassPriceVnd={dayPassPriceVnd}
              />
            );
          })}
        </div>

        {plans.length === 0 && <p className="py-10 text-center text-sm text-white/50">{m.comingSoon}</p>}
      </div>
    </BottomSheet>
  );
}
