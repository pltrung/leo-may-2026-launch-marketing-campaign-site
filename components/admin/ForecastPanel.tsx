"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  forecastMonths,
  nextMonthMembers,
  runwayFromFirstMonth,
  breakEvenMonthLabel,
} from "@/lib/forecast";

type AdminFetch = (url: string, options?: RequestInit) => Promise<Response>;

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-xl md:text-2xl font-bold text-slate-900 break-words">{value}</p>
      {sub != null && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

const PROJECTION_MONTHS = 6;

/** Membership runway / projection — embedded under Finance. */
export default function ForecastPanel({
  adminFetch,
  locale,
}: {
  adminFetch: AdminFetch;
  locale: "en" | "vi";
}) {
  const isVi = locale === "vi";
  const t = (en: string, vi: string) => (isVi ? vi : en);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMembers, setCurrentMembers] = useState(0);
  const [monthlyCosts, setMonthlyCosts] = useState(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [suggestedAvg, setSuggestedAvg] = useState(0);

  const [currentCash, setCurrentCash] = useState(0);
  const [avgMemberPrice, setAvgMemberPrice] = useState(0);
  const [retentionPct, setRetentionPct] = useState(92);
  const [newMembersPerMonth, setNewMembersPerMonth] = useState(8);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "err">("idle");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/forecast");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setCurrentMembers(d.current_members ?? 0);
      setMonthlyCosts(d.monthly_costs ?? 0);
      setLastMonthRevenue(d.last_month_revenue ?? 0);
      setSuggestedAvg(d.suggested_avg_price ?? 0);
      const c = d.config ?? {};
      setCurrentCash(Number(c.current_cash) || 0);
      setAvgMemberPrice(Number(c.avg_member_price) || d.suggested_avg_price || 350000);
      const rr = Number(c.retention_rate);
      setRetentionPct(Number.isFinite(rr) ? Math.round(rr * 1000) / 10 : 92);
      setNewMembersPerMonth(Number(c.new_members_per_month) || 0);
    } catch {
      setError(locale === "vi" ? "Không tải được dữ liệu dự báo." : "Could not load forecast data.");
    } finally {
      setLoading(false);
    }
  }, [adminFetch, locale]);

  useEffect(() => {
    load();
  }, [load]);

  const retentionRate = retentionPct / 100;

  const rows = useMemo(
    () =>
      forecastMonths(
        currentMembers,
        PROJECTION_MONTHS,
        retentionRate,
        newMembersPerMonth,
        avgMemberPrice,
        monthlyCosts,
        locale
      ),
    [currentMembers, retentionRate, newMembersPerMonth, avgMemberPrice, monthlyCosts, locale]
  );

  const runway = useMemo(
    () =>
      runwayFromFirstMonth(
        currentCash,
        currentMembers,
        retentionRate,
        newMembersPerMonth,
        avgMemberPrice,
        monthlyCosts
      ),
    [currentCash, currentMembers, retentionRate, newMembersPerMonth, avgMemberPrice, monthlyCosts]
  );

  const breakEvenLabel = useMemo(() => breakEvenMonthLabel(rows), [rows]);
  const month1Profit = rows[0]?.profit ?? 0;
  const nextMembers = useMemo(
    () => nextMonthMembers(currentMembers, retentionRate, newMembersPerMonth),
    [currentMembers, retentionRate, newMembersPerMonth]
  );

  const saveConfig = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const res = await adminFetch("/api/admin/forecast", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_cash: currentCash,
          avg_member_price: avgMemberPrice,
          retention_rate: retentionRate,
          new_members_per_month: newMembersPerMonth,
        }),
      });
      if (!res.ok) throw new Error();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("err");
    }
  }, [adminFetch, currentCash, avgMemberPrice, retentionRate, newMembersPerMonth]);

  if (loading) {
    return <p className="text-slate-500 text-sm">{t("Loading…", "Đang tải…")}</p>;
  }
  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-red-600 text-sm">{error}</p>
        <button type="button" onClick={load} className="text-sm text-teal-700 underline">
          {t("Retry", "Thử lại")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        {t(
          "Uses paying members (active pass or visits left), monthly costs from This month (extrapolated), and your scenario below. Cash here is also saved to forecast settings — sync with “Rent, cash & schedule” in This month if needed.",
          "Dựa trên TV đang có gói hợp lệ, chi phí tháng từ tab Tháng này (nội suy) và kịch bản bên dưới. Tiền mặt lưu trong dự báo — đồng bộ với “Tiền thuê, quỹ & lịch” ở Tháng này nếu cần."
        )}
      </p>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">{t("Summary", "Tóm tắt")}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label={t("Runway", "Đường băng (tháng)")}
            value={
              runway.infinite
                ? t("∞ (profitable)", "∞ (có lãi)")
                : runway.months != null
                  ? `${runway.months >= 100 ? "100+" : runway.months.toFixed(1)} ${t("mo", "tháng")}`
                  : "—"
            }
            sub={
              runway.infinite
                ? t("M1 net ≥ 0", "Tháng 1 lãi ≥ 0")
                : t("At M1 burn rate", "Theo mức hụt tháng 1")
            }
          />
          <KpiCard
            label={t("Break-even (monthly)", "Hòa vốn (theo tháng)")}
            value={breakEvenLabel ?? t("Not in 6 mo", "Không trong 6 tháng")}
            sub={t("First month with profit ≥ 0", "Tháng đầu có lãi ≥ 0")}
          />
          <KpiCard
            label={t("Monthly profit (M1)", "Lãi tháng 1")}
            value={`${month1Profit.toLocaleString("vi-VN")} VND`}
            sub={t("Next month P&L", "P&L tháng tới")}
          />
          <KpiCard
            label={t("Next month members", "Thành viên tháng tới")}
            value={nextMembers}
            sub={t("After retention + new", "Sau giữ chân + mới")}
          />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            {t(`Projection (${PROJECTION_MONTHS} months)`, `Dự báo (${PROJECTION_MONTHS} tháng)`)}
          </h3>
          <span className="text-xs text-slate-500">
            {t("Current members", "TV hiện tại")}: <strong>{currentMembers}</strong>
            {" · "}
            {t("Monthly costs", "Chi phí / tháng")}:{" "}
            <strong>{monthlyCosts.toLocaleString("vi-VN")} VND</strong>
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Month", "Tháng")}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  {t("Members", "Thành viên")}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  {t("Revenue", "Doanh thu")}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  {t("Costs", "Chi phí")}
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  {t("Profit", "Lãi")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.monthKey} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{r.monthLabel}</td>
                  <td className="py-3 px-4 text-right text-slate-800">{r.members}</td>
                  <td className="py-3 px-4 text-right text-slate-800">
                    {r.revenue.toLocaleString("vi-VN")}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">{r.costs.toLocaleString("vi-VN")}</td>
                  <td
                    className={`py-3 px-4 text-right font-medium ${
                      r.profit >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {r.profit.toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">
          {t("Scenario controls", "Điều chỉnh kịch bản")}
        </h3>
        <p className="text-xs text-slate-500">
          {t(
            "Changes update the table instantly. Save to persist.",
            "Thay đổi cập nhật bảng ngay. Lưu để ghi vào hệ thống."
          )}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">
              {t("Retention (monthly)", "Giữ chân (tháng)")} (%)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={retentionPct}
              onChange={(e) => setRetentionPct(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">
              {t("New members / month", "TV mới / tháng")}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={newMembersPerMonth}
              onChange={(e) => setNewMembersPerMonth(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">
              {t("Avg revenue / member / month", "Doanh thu TB / TV / tháng")} (VND)
            </span>
            <input
              type="number"
              min={0}
              step={10000}
              value={avgMemberPrice || ""}
              onChange={(e) => setAvgMemberPrice(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
            {suggestedAvg > 0 && (
              <button
                type="button"
                className="mt-1 text-xs text-teal-600 hover:underline"
                onClick={() => setAvgMemberPrice(suggestedAvg)}
              >
                {t(`Use suggested (${suggestedAvg.toLocaleString("vi-VN")})`, `Dùng gợi ý (${suggestedAvg.toLocaleString("vi-VN")})`)}
              </button>
            )}
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-medium text-slate-600">
              {t("Current cash (runway)", "Tiền mặt hiện tại")}
            </span>
            <input
              type="number"
              min={0}
              step={100000}
              value={currentCash || ""}
              onChange={(e) => setCurrentCash(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveConfig}
            disabled={saveStatus === "saving"}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {saveStatus === "saving"
              ? t("Saving…", "Đang lưu…")
              : t("Save assumptions", "Lưu giả định")}
          </button>
          {saveStatus === "saved" && (
            <span className="text-sm text-emerald-600">{t("Saved.", "Đã lưu.")}</span>
          )}
          {saveStatus === "err" && (
            <span className="text-sm text-red-600">{t("Save failed.", "Lưu thất bại.")}</span>
          )}
        </div>
        {lastMonthRevenue > 0 && (
          <p className="text-xs text-slate-500">
            {t("Last full month revenue", "Doanh thu tháng trước")}:{" "}
            {lastMonthRevenue.toLocaleString("vi-VN")} VND
          </p>
        )}
      </div>

      <div
        className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"
        data-forecast-chart-placeholder
        aria-hidden
      >
        <p className="text-sm font-medium text-slate-600 mb-1">
          {t("Charts (coming soon)", "Biểu đồ (sắp có)")}
        </p>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {t(
            "Member growth curve, profit over time, multi-scenario comparison — structure reserved for next iteration.",
            "Đường tăng trưởng thành viên, lãi theo thời gian, so sánh nhiều kịch bản — dành chỗ cho bản sau."
          )}
        </p>
      </div>
    </div>
  );
}
