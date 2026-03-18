"use client";

import React from "react";

export interface Plan {
  id: string;
  name: string;
  duration_days: number;
  duration_visits?: number | null;
  price_vnd: number;
  description?: string | null;
  pass_type?: "newbie" | "day" | "visit";
}

/** When DB description is empty, show these (EN) so benefits always appear in the modal. */
const PLAN_BENEFITS_FALLBACK: Record<string, string> = {
  newbie_class:
    "30 minute coaching + 1 day access • Free rental shoes + chalk for your class",
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

interface PackageDetailModalProps {
  open: boolean;
  onClose: () => void;
  plan: Plan | null;
  onBuyPass: () => void;
  isVi: boolean;
  /** When true, show message that purchase will extend current membership */
  hasActivePass?: boolean;
  /** Current membership expiry (ISO string); used to compute and display new expiry date */
  currentExpiry?: string | null;
  /** When set (e.g. newbie graduate sale), show as payable price vs list plan.price_vnd */
  effectivePriceVnd?: number | null;
  saleEndsAt?: string | null;
}

export default function PackageDetailModal({
  open,
  onClose,
  plan,
  onBuyPass,
  isVi,
  hasActivePass = false,
  currentExpiry,
  effectivePriceVnd,
  saleEndsAt,
}: PackageDetailModalProps) {
  if (!open || !plan) return null;

  const formatDescription = (desc: string) => {
    if (desc.includes("•") || desc.includes("\n")) {
      return desc
        .split(/[•\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [desc];
  };
  const descSource =
    plan.description?.trim() ||
    PLAN_BENEFITS_FALLBACK[plan.id] ||
    "";
  const bullets = descSource ? formatDescription(descSource) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-detail-title"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 id="package-detail-title" className="text-lg font-semibold text-white">
              {plan.name}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20"
              aria-label={isVi ? "Đóng" : "Close"}
            >
              ×
            </button>
          </div>
          <div className="mb-2">
            {effectivePriceVnd != null && effectivePriceVnd < plan.price_vnd ? (
              <>
                <p className="text-lg text-white/50 line-through">
                  {plan.price_vnd.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-2xl font-bold text-emerald-400">
                  {effectivePriceVnd.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-xs text-amber-300/90 mt-1">
                  {isVi ? "Ưu đãi 50% sau lớp Newbie" : "50% off — Newbie graduate offer"}
                  {saleEndsAt
                    ? ` · ${isVi ? "Hết hạn" : "Ends"} ${new Date(saleEndsAt).toLocaleString(isVi ? "vi-VN" : "en-US", { dateStyle: "short", timeStyle: "short" })}`
                    : ""}
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold text-emerald-400">
                {plan.price_vnd.toLocaleString("vi-VN")} VND
              </p>
            )}
          </div>
          <p className="text-sm text-white/60 mb-4">
            {(plan.duration_visits ?? 0) > 0
              ? `${plan.duration_visits} ${isVi ? "lượt" : "visits"}`
              : plan.duration_days === 1
                ? isVi ? "1 ngày" : "1 day"
                : plan.duration_days === 30
                  ? isVi ? "30 ngày" : "30 days"
                  : plan.duration_days === 180
                    ? isVi ? "180 ngày" : "180 days"
                  : plan.duration_days === 365
                    ? isVi ? "365 ngày" : "365 days"
                    : `${plan.duration_days} ${isVi ? "ngày" : "days"}`}
          </p>
          {hasActivePass && (plan.duration_visits ?? 0) <= 0 && (() => {
            const base = currentExpiry && plan ? new Date(currentExpiry) : null;
            const isValidBase = base && !Number.isNaN(base.getTime());
            const newExpiry = isValidBase && plan && plan.duration_days > 0
              ? (() => {
                  const d = new Date(base);
                  d.setDate(d.getDate() + plan.duration_days);
                  return d;
                })()
              : null;
            const fmt = (d: Date, loc: "vi-VN" | "en-US") =>
              d.toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" });
            const loc = isVi ? "vi-VN" : "en-US";
            const extendMsg = newExpiry && isValidBase
              ? isVi
                ? `Mua thẻ này sẽ gia hạn thêm: từ ${fmt(base!, loc)} → ${fmt(newExpiry, loc)}`
                : `This will extend your access: ${fmt(base!, loc)} → ${fmt(newExpiry, loc)}`
              : isVi
                ? "Mua thẻ này sẽ gia hạn thêm thời gian sử dụng từ ngày hết hạn hiện tại."
                : "Purchasing this pass will extend your access from your current expiry date.";
            return (
              <p className="mb-4 text-sm text-emerald-300/90 bg-emerald-500/10 rounded-lg px-3 py-2">
                {extendMsg}
              </p>
            );
          })()}
          {bullets.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                {isVi ? "Quyền lợi" : "Benefits"}
              </p>
              <div className="text-sm text-white/80 space-y-1">
                {bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-full text-sm font-medium bg-white/10 text-white hover:bg-white/20"
            >
              {isVi ? "Hủy" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => {
                onBuyPass();
                onClose();
              }}
              className="flex-1 py-2 rounded-full text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-400"
            >
              {isVi ? "Mua thẻ" : "Buy Pass"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
