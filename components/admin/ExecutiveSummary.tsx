"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AnalyticsData } from "./AnalyticsCharts";
import MetricInfo from "@/components/admin/analytics/MetricInfo";
import { METRIC_BASIS_BADGE, METRIC_TOOLTIPS } from "@/lib/admin/analytics/metricDefinitions";
import { getHorizonSuffix, getForecastSuffix, type TimeHorizon } from "@/lib/admin/analytics/periodUtils";
import { formatVnd, formatVndAxis } from "@/lib/formatVndCompact";
import { buildAnalyticsAlerts, type AnalyticsAlert } from "@/lib/admin/analytics/alerts";
import { formatRunway } from "@/lib/admin/analytics/metricCalculators";
import type { FinanceMetricsPayload } from "@/lib/admin/analytics/metricCalculators";

type AdminFetch = (url: string, options?: RequestInit) => Promise<Response>;

function KpiTile({
  label,
  value,
  sub,
  info,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  info?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
      <div className="flex items-start justify-between gap-1">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        {info}
      </div>
      <p className="mt-1 text-xl font-bold text-slate-900 break-words">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ExecutiveSummary({
  data,
  locale,
  horizon = "mtd",
  adminFetch,
  onOpenTab,
  onAlertsCount,
}: {
  data: AnalyticsData;
  locale: string;
  horizon?: TimeHorizon;
  adminFetch?: AdminFetch;
  onOpenTab?: (tab: "overview" | "revenue_members" | "engagement" | "ops_team" | "marketing" | "finance") => void;
  onAlertsCount?: (n: number) => void;
}) {
  const isVi = locale === "vi";
  const t = (en: string, vi: string) => (isVi ? vi : en);
  const loc = isVi ? "vi" : "en";

  const [finance, setFinance] = useState<FinanceMetricsPayload | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeErr, setFinanceErr] = useState(false);

  const ceo = data.ceo_snapshot;
  const retentionCohort = data.retention_cohort;

  const loadFinance = useCallback(async () => {
    if (!adminFetch) return;
    setFinanceLoading(true);
    setFinanceErr(false);
    const f = data.filters;
    const financeParams = new URLSearchParams();
    financeParams.set("horizon", horizon);
    if (f?.period === "custom" && f.since && f.until) {
      financeParams.set("from", f.since.slice(0, 10));
      financeParams.set("to", f.until.slice(0, 10));
    }
    const financeUrl = `/api/admin/finance?${financeParams.toString()}`;
    try {
      const finRes = await adminFetch(financeUrl);
      if (finRes.ok) {
        const j = await finRes.json();
        setFinance({
          revenue_mtd: j.revenue_mtd ?? 0,
          refunds_mtd: j.refunds_mtd ?? 0,
          cash_sales_mtd: j.cash_sales_mtd ?? j.revenue_mtd ?? 0,
          cash_out_mtd: j.cash_out_mtd ?? null,
          net_cash_flow_mtd: j.net_cash_flow_mtd ?? null,
          eom_net_cash_flow_forecast: j.eom_net_cash_flow_forecast ?? null,
          monthly_costs: j.monthly_costs ?? 0,
          profit: j.profit ?? 0,
          payroll_total: j.payroll_total ?? 0,
          rent_amount: j.rent_amount ?? 0,
          expenses_mtd: j.expenses_mtd ?? 0,
          runway_months: j.runway_months ?? null,
          runway_display: j.runway_display,
          config: j.config,
          payroll_record: j.payroll_record,
        });
        setEomForecastVal(typeof j.eom_net_cash_flow_forecast === "number" ? j.eom_net_cash_flow_forecast : null);
      } else {
        setFinance(null);
        setEomForecastVal(null);
      }
    } catch {
      setFinanceErr(true);
      setFinance(null);
      setEomForecastVal(null);
    } finally {
      setFinanceLoading(false);
    }
  }, [adminFetch, data.filters, horizon]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  const campaignSuppress = (data as { campaign_suppress?: { expiring_7d?: boolean; inactive_30?: boolean } })?.campaign_suppress;
  const alerts = useMemo(() => {
    return buildAnalyticsAlerts(finance, data as never, loc, campaignSuppress);
  }, [finance, data, loc, campaignSuppress]);

  useEffect(() => {
    onAlertsCount?.(alerts.length);
  }, [alerts.length, onAlertsCount]);

  const o = { total_revenue: 0, total_members: 0, active_members: 0, total_visits: 0, ...data.overview };
  const r = { total: 0, over_time: [] as { date: string; total: number }[], ...data.revenue };
  const m = { ...data.members, member_health: data.members?.member_health };
  const mh = {
    active: 0,
    at_risk: 0,
    inactive: 0,
    expiring_soon: 0,
    ...m?.member_health,
  };
  const op = { tasks_overdue: 0, route_resets_overdue: 0, coaching_missed: 0, ...data.operations };

  const criticalOpen =
    (finance?.payroll_record?.status !== "paid" && (finance?.payroll_total ?? 0) > 0 ? 1 : 0) +
    (op.tasks_overdue ?? 0) +
    (op.route_resets_overdue ?? 0) +
    (op.coaching_missed ?? 0);

  const [eomForecastVal, setEomForecastVal] = useState<number | null>(null);

  const cashSales = finance?.cash_sales_mtd ?? finance?.revenue_mtd ?? null;
  const netCash = finance?.net_cash_flow_mtd ?? null;
  const cashBank = finance?.config?.current_cash ?? null;

  const actionQueue: { en: string; vi: string; tab?: Parameters<NonNullable<typeof onOpenTab>>[0] }[] = [];
  if ((finance?.payroll_record?.status !== "paid" && (finance?.payroll_total ?? 0) > 0) ?? false) {
    actionQueue.push({
      en: `Approve / mark payroll paid (${formatVnd(finance?.payroll_total ?? 0)} est.)`,
      vi: `Duyệt / đánh dấu đã trả lương (${formatVnd(finance?.payroll_total ?? 0)} ước tính)`,
      tab: "finance",
    });
  }
  if ((mh.expiring_soon ?? 0) > 0) {
    actionQueue.push({
      en: `Reach out to ${mh.expiring_soon} member(s) expiring within 7 days`,
      vi: `Liên hệ ${mh.expiring_soon} TV hết hạn trong 7 ngày`,
      tab: "marketing",
    });
  }
  if ((mh.at_risk ?? 0) > 0) {
    actionQueue.push({
      en: `${mh.at_risk} at-risk members (7–14d no visit)`,
      vi: `${mh.at_risk} TV rủi ro (7–14 ngày không tới)`,
      tab: "marketing",
    });
  }
  if ((op.tasks_overdue ?? 0) > 0) {
    actionQueue.push({
      en: `${op.tasks_overdue} overdue staff tasks`,
      vi: `${op.tasks_overdue} nhiệm vụ quá hạn`,
      tab: "ops_team",
    });
  }

  const openAlert = (a: AnalyticsAlert) => {
    if (a.navigateTab && onOpenTab) onOpenTab(a.navigateTab);
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider">{t("Executive", "Điều hành")}</p>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            {t("CEO snapshot: cash, members, and exceptions. Same formulas as Finance where noted.", "Tóm tắt CEO: tiền, thành viên và ngoại lệ. Cùng công thức với Tài chính khi có ghi chú.")}
          </p>
        </div>
        {adminFetch && (
          <button
            type="button"
            onClick={() => loadFinance()}
            disabled={financeLoading}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 shrink-0"
          >
            {financeLoading ? t("Refreshing…", "Đang làm mới…") : t("Refresh", "Làm mới")}
          </button>
        )}
      </div>

      {financeErr && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t("Finance summary could not be loaded.", "Không tải được phần tài chính.")}
        </p>
      )}

      {/* Alerts strip */}
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
        <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2">{t("Open alerts", "Cảnh báo")}</p>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-600">{t("No urgent items from current data.", "Không có mục khẩn từ dữ liệu hiện tại.")}</p>
        ) : (
          <ul className="space-y-1.5">
            {alerts.slice(0, 6).map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => openAlert(a)}
                  className={`text-left w-full text-sm rounded-lg px-2 py-1.5 hover:bg-white/80 border border-transparent hover:border-amber-200 ${
                    a.severity === "critical" ? "text-rose-800 font-medium" : a.severity === "warning" ? "text-amber-900" : "text-slate-800"
                  }`}
                >
                  <span className="mr-1 text-xs opacity-70">{a.severity === "critical" ? "●" : a.severity === "warning" ? "◆" : "○"}</span>
                  {isVi ? a.titleVi : a.titleEn}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 8 KPI cards */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t("Top KPIs", "Chỉ số chính")}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile
            label={t("Cash in bank", "Quỹ tiền mặt")}
            value={cashBank != null && Number.isFinite(cashBank) ? formatVnd(cashBank) : "—"}
            info={<MetricInfo label={t("Cash in bank", "Quỹ tiền mặt")}>{isVi ? METRIC_TOOLTIPS.cashInBank.vi : METRIC_TOOLTIPS.cashInBank.en}</MetricInfo>}
          />
          <KpiTile
            label={t(`Cash sales ${getHorizonSuffix(horizon)}`, `Bán thu tiền ${getHorizonSuffix(horizon)}`)}
            value={cashSales != null ? formatVnd(cashSales) : financeLoading ? "…" : "—"}
            info={<MetricInfo label={t("Cash sales", "Bán thu tiền")}>{isVi ? METRIC_TOOLTIPS.cashSalesMtd.vi : METRIC_TOOLTIPS.cashSalesMtd.en}</MetricInfo>}
          />
          <KpiTile
            label={t(`Net cash flow ${getHorizonSuffix(horizon)}`, `Dòng tiền ròng ${getHorizonSuffix(horizon)}`)}
            value={netCash != null ? formatVnd(netCash) : financeLoading ? "…" : "—"}
            sub={t("Cash in − partial cash out (see Finance)", "Tiền vào − tiền ra (xem Tài chính)")}
            info={<MetricInfo label={t("Net cash flow", "Dòng tiền ròng")}>{isVi ? METRIC_TOOLTIPS.netCashFlowMtd.vi : METRIC_TOOLTIPS.netCashFlowMtd.en}</MetricInfo>}
          />
          <KpiTile
            label={t(`${getForecastSuffix(horizon)} net cash flow forecast`, `Dự báo dòng tiền ${getForecastSuffix(horizon)}`)}
            value={
              eomForecastVal != null
                ? formatVnd(eomForecastVal)
                : financeLoading
                  ? "…"
                  : "—"
            }
            sub={t("Cash basis extrapolation (not operating profit)", "Nội suy theo tiền (không phải lợi nhuận P&L)")}
          />
          <KpiTile
            label={t(`Active members ${getHorizonSuffix(horizon)}`, `TV hoạt động ${getHorizonSuffix(horizon)}`)}
            value={o.active_members ?? 0}
            sub={t("Visits in period · filters apply", "Lượt trong kỳ · có lọc")}
            info={<MetricInfo label={t("Active members", "TV hoạt động")}>{isVi ? METRIC_TOOLTIPS.activeMembers.vi : METRIC_TOOLTIPS.activeMembers.en}</MetricInfo>}
          />
          <KpiTile
            label={t(`New members ${getHorizonSuffix(horizon)}`, `TV mới ${getHorizonSuffix(horizon)}`)}
            value={ceo?.new_members_mtd ?? "—"}
          />
          <KpiTile label={t("Expiring in 7 days", "Hết hạn 7 ngày")} value={ceo?.expiring_7d_all ?? mh.expiring_soon ?? 0} />
          <KpiTile label={t("Open operational actions", "Việc cần xử lý")} value={criticalOpen} sub={t("Payroll if pending + ops counters", "Lương chưa trả + vận hành")} />
        </div>
      </div>

      {/* Money + member + ops */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">{t("Money (cash view)", "Tiền (theo dòng tiền)")}</h3>
            <p className="text-xs text-slate-500">
              {horizon === "wtd" && t("Daily cash sales this week.", "Doanh thu theo ngày tuần này.")}
              {horizon === "mtd" && t("Daily cash sales this month.", "Doanh thu theo ngày tháng này.")}
              {horizon === "qtd" && t("Daily cash sales this quarter.", "Doanh thu theo ngày quý này.")}
              {horizon === "ytd" && t("Daily cash sales this year.", "Doanh thu theo ngày năm nay.")}
              {!["wtd", "mtd", "qtd", "ytd"].includes(horizon) && t("Daily cash sales in period (from analytics payments+POS, matched to Finance totals when refreshed).", "Doanh thu theo ngày trong kỳ (thống kê; khớp Tài chính khi làm mới).")}
            </p>
          </div>
          <div className="p-4 space-y-3">
            {r.over_time && r.over_time.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={r.over_time}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatVndAxis(v)} />
                    <Tooltip formatter={(v: unknown) => [typeof v === "number" ? formatVnd(v) : String(v ?? 0), t("Cash sales", "Thu tiền")]} />
                    <Line type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t("No trend data in this period.", "Không có dữ liệu xu hướng trong kỳ này.")}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase">{t("Cash out (MTD, partial)", "Tiền ra (MTD, một phần)")}</p>
                <p className="text-sm font-bold text-slate-900">
                  {finance?.cash_out_mtd != null ? formatVnd(finance.cash_out_mtd) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase">{t("Payroll due", "Lương đến hạn")}</p>
                <p className="text-sm font-bold text-slate-900">
                  {finance?.payroll_record?.status !== "paid" && finance?.payroll_total != null
                    ? formatVnd(finance.payroll_total)
                    : t("Paid", "Đã trả")}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase">{t("Bills due (7d)", "Hóa đơn 7 ngày")}</p>
                <p className="text-sm font-bold text-slate-900">—</p>
                <p className="text-[10px] text-slate-400">{t("Not tracked yet", "Chưa theo dõi")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">{t("Members & health", "Thành viên & sức khỏe")}</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-100 p-2">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">{t("Current paying members", "TV đang trả phí")}</p>
              <p className="text-lg font-bold text-slate-900">{ceo?.current_paying_members ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-100 p-2">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">{t("Renewals (MTD)", "Gia hạn (MTD)")}</p>
              <p className="text-lg font-bold text-slate-900">{ceo?.renewals_mtd ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-100 p-2">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">{t("At-risk members", "TV rủi ro")}</p>
              <p className="text-lg font-bold text-slate-900">{mh.at_risk ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-100 p-2">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">{t("Inactive (30d)", "Không tới 30 ngày")}</p>
              <p className="text-lg font-bold text-slate-900">{mh.inactive ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">{t("Operations today", "Vận hành hôm nay")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile label={t("Check-ins today", "Check-in hôm nay")} value={ceo?.checkins_today ?? "—"} />
          <KpiTile label={t("Newbie class sessions today", "Lớp Newbie hôm nay")} value={ceo?.newbie_class_sessions_today ?? "—"} />
          <KpiTile
            label={t("Staff on shift", "Nhân sự đang làm")}
            value={(ceo as { staff_on_shift_today?: number })?.staff_on_shift_today ?? "—"}
            sub={t("Checked in today", "Đã check-in hôm nay")}
          />
          <KpiTile
            label={t("Issues unresolved today", "Việc chưa xử lý hôm nay")}
            value={(op.tasks_overdue ?? 0) + (op.route_resets_overdue ?? 0) + (op.coaching_missed ?? 0)}
            sub={t("Tasks + resets + coaching", "Nhiệm vụ + reset + coaching")}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">{t("CEO action queue", "Việc ưu tiên")}</h3>
        {actionQueue.length === 0 ? (
          <p className="text-sm text-slate-500">{t("No queued actions from current thresholds.", "Chưa có việc từ ngưỡng hiện tại.")}</p>
        ) : (
          <ul className="space-y-2">
            {actionQueue.slice(0, 8).map((item, i) => (
              <li key={i}>
                {item.tab ? (
                  <button type="button" onClick={() => onOpenTab?.(item.tab!)} className="text-left text-sm text-teal-800 hover:underline w-full">
                    {isVi ? item.vi : item.en}
                  </button>
                ) : (
                  <span className="text-sm text-slate-800">{isVi ? item.vi : item.en}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-slate-500">
        {t(METRIC_BASIS_BADGE.mixed.hintEn, METRIC_BASIS_BADGE.mixed.hintVi)}
      </p>
    </div>
  );
}
