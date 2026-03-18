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
import { nextMonthMembers, runwayFromFirstMonth } from "@/lib/forecast";
import type { AnalyticsData } from "./AnalyticsCharts";

type AdminFetch = (url: string, options?: RequestInit) => Promise<Response>;

function fmtVnd(n: number) {
  return `${(n ?? 0).toLocaleString("vi-VN")} VND`;
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MiniKpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 min-w-0">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-base font-bold text-slate-900 mt-0.5 break-words">{value}</p>
      {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function ExecutiveSummary({
  data,
  locale,
  adminFetch,
}: {
  data: AnalyticsData;
  locale: string;
  adminFetch?: AdminFetch;
}) {
  const isVi = locale === "vi";
  const t = (en: string, vi: string) => (isVi ? vi : en);

  const [finance, setFinance] = useState<{
    revenue_mtd: number;
    monthly_costs: number;
    profit: number;
    runway_months: number | null;
    config?: { current_cash: number };
  } | null>(null);
  const [forecastExtra, setForecastExtra] = useState<{
    m1Profit: number;
    nextMembers: number;
    runwayInfinite: boolean;
    runwayMo: number | null;
  } | null>(null);
  const [onboardingSum, setOnboardingSum] = useState<{
    total_staff: number;
    certified_count?: number;
    avg_ai?: number | null;
  } | null>(null);
  const [campaignLogs, setCampaignLogs] = useState<
    { segment: string; recipient_count: number; sent_at: string; redemption_count?: number }[]
  >([]);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasErr, setExtrasErr] = useState(false);

  const loadExtras = useCallback(async () => {
    if (!adminFetch) return;
    setExtrasLoading(true);
    setExtrasErr(false);
    const f = data.filters;
    const financeParams = new URLSearchParams();
    if (f?.period) {
      financeParams.set("period", f.period);
      if (f.period === "custom" && f.since && f.until) {
        financeParams.set("from", f.since.slice(0, 10));
        financeParams.set("to", f.until.slice(0, 10));
      }
    }
    const financeUrl = `/api/admin/finance${financeParams.toString() ? `?${financeParams.toString()}` : ""}`;
    try {
      const [finRes, fcRes, onbRes, logRes] = await Promise.all([
        adminFetch(financeUrl),
        adminFetch("/api/admin/forecast"),
        adminFetch("/api/admin/onboarding/analytics"),
        adminFetch("/api/admin/campaigns/logs?limit=5"),
      ]);
      if (finRes.ok) {
        const j = await finRes.json();
        setFinance({
          revenue_mtd: j.revenue_mtd ?? 0,
          monthly_costs: j.monthly_costs ?? 0,
          profit: j.profit ?? 0,
          runway_months: j.runway_months ?? null,
          config: j.config,
        });
      } else setFinance(null);

      if (fcRes.ok) {
        const d = await fcRes.json();
        const c = d.config ?? {};
        const cm = d.current_members ?? 0;
        const mc = d.monthly_costs ?? 0;
        const rr = Number(c.retention_rate) || 0.92;
        const nm = Number(c.new_members_per_month) || 0;
        const amp = Number(c.avg_member_price) || 0;
        const cash = Number(c.current_cash) || 0;
        const rw = runwayFromFirstMonth(cash, cm, rr, nm, amp, mc);
        const m1Members = nextMonthMembers(cm, rr, nm);
        const m1Rev = m1Members * amp;
        setForecastExtra({
          m1Profit: m1Rev - mc,
          nextMembers: m1Members,
          runwayInfinite: rw.infinite,
          runwayMo: rw.months,
        });
      } else setForecastExtra(null);

      if (onbRes.ok) {
        const j = await onbRes.json();
        const s = j.summary ?? {};
        setOnboardingSum({
          total_staff: s.total_staff ?? 0,
          certified_count: s.certified_count,
          avg_ai: s.avg_ai_score_overall ?? null,
        });
      } else setOnboardingSum(null);

      if (logRes.ok) {
        const j = await logRes.json();
        setCampaignLogs((j.logs ?? []).slice(0, 5));
      } else setCampaignLogs([]);
    } catch {
      setExtrasErr(true);
    } finally {
      setExtrasLoading(false);
    }
  }, [adminFetch, data.filters]);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  const f = data.filters;
  const periodLabel = useMemo(() => {
    if (!f) return "";
    if (f.period === "custom" && f.since && f.until) {
      return `${f.since.slice(0, 10)} → ${f.until.slice(0, 10)}`;
    }
    const map: Record<string, string> = isVi
      ? { day: "Hôm nay", week: "Tuần này", month: "Tháng này", quarter: "Quý này", custom: "Tùy chọn" }
      : { day: "Today", week: "This week", month: "This month", quarter: "This quarter", custom: "Custom" };
    return map[f.period] ?? f.period;
  }, [f, isVi]);

  const o: NonNullable<AnalyticsData["overview"]> = {
    total_revenue: 0,
    total_members: 0,
    active_members: 0,
    total_visits: 0,
    ...data.overview,
  };
  const r: NonNullable<AnalyticsData["revenue"]> = {
    total: 0,
    by_category: {},
    over_time: [],
    arpu: 0,
    revenue_per_visit: 0,
    ...data.revenue,
  };
  const m: NonNullable<AnalyticsData["members"]> = {
    total: 0,
    active: 0,
    inactive: 0,
    new_over_time: [],
    churn_rate: 0,
    avg_visits_per_member: 0,
    ...data.members,
  };
  const ret: NonNullable<AnalyticsData["retention"]> = {
    day1: 0,
    day7: 0,
    day30: 0,
    newbie_purchased_pct: 0,
    newbie_return_7_pct: 0,
    newbie_return_30_pct: 0,
    ...data.retention,
  };
  const beh: NonNullable<AnalyticsData["behavior"]> = {
    dau: [],
    wau: 0,
    mau: 0,
    peak_hours: [],
    ...data.behavior,
  };
  const fun: NonNullable<AnalyticsData["funnel"]> = {
    first_visit_to_purchase: 0,
    newbie_to_return: 0,
    return_to_membership: 0,
    ...data.funnel,
  };
  const op: NonNullable<AnalyticsData["operations"]> = {
    tasks_completed: 0,
    tasks_overdue: 0,
    completion_rate: 0,
    route_resets_overdue: 0,
    coaching_completed: 0,
    coaching_missed: 0,
    ...data.operations,
  };
  const staffList = data.staff ?? [];
  const staffAgg = useMemo(() => {
    let sales = 0;
    let comm = 0;
    let tasks = 0;
    for (const s of staffList) {
      sales += s.sales ?? 0;
      comm += s.commission ?? 0;
      tasks += s.tasks_completed ?? 0;
    }
    return { count: staffList.length, sales, comm, tasks };
  }, [staffList]);

  const mh = {
    active: 0,
    at_risk: 0,
    inactive: 0,
    expiring_soon: 0,
    ...m.member_health,
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
            {t("Executive summary", "Tóm tắt điều hành")}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            {t("Holistic snapshot across finance, members, ops, and team.", "Toàn cảnh tài chính, thành viên, vận hành và đội ngũ.")}{" "}
            <span className="font-medium text-slate-800">{periodLabel}</span>
            {f?.member_type && f.member_type !== "all" && (
              <span className="text-slate-500">
                {" · "}
                {f.member_type}
              </span>
            )}
          </p>
        </div>
        {adminFetch && (
          <button
            type="button"
            onClick={() => loadExtras()}
            disabled={extrasLoading}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 shrink-0"
          >
            {extrasLoading ? t("Refreshing…", "Đang làm mới…") : t("Refresh finance & extras", "Làm mới tài chính")}
          </button>
        )}
      </div>
      {extrasErr && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t("Some finance / training / email data could not be loaded.", "Không tải được một phần tài chính / đào tạo / email.")}
        </p>
      )}

      {/* Financial health — MTD + forecast */}
      <Section
        title={t("Financial health", "Sức khỏe tài chính")}
        subtitle={t("This month (books) + membership forecast", "Tháng này (sổ sách) + dự báo thành viên")}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniKpi
            label={t("Profit (MTD)", "Lợi nhuận (tháng)")}
            value={finance != null ? fmtVnd(finance.profit) : extrasLoading ? "…" : "—"}
            hint={t("Revenue − costs (month to date)", "Doanh thu − chi phí (đầu tháng đến nay)")}
          />
          <MiniKpi
            label={t("Revenue (MTD)", "Doanh thu (tháng)")}
            value={finance != null ? fmtVnd(finance.revenue_mtd) : extrasLoading ? "…" : fmtVnd(r.total ?? o.total_revenue ?? 0)}
          />
          <MiniKpi
            label={t("Costs (MTD)", "Chi phí (tháng)")}
            value={finance != null ? fmtVnd(finance.monthly_costs) : extrasLoading ? "…" : "—"}
          />
          <MiniKpi
            label={t("Runway (cash ÷ burn)", "Đường băng (quỹ)")}
            value={
              finance?.runway_months != null
                ? `${finance.runway_months} ${t("mo", "tháng")}`
                : extrasLoading
                  ? "…"
                  : "—"
            }
            hint={t("From Finance cash & MTD costs", "Từ quỹ & chi phí tháng (Tài chính)")}
          />
        </div>
        {forecastExtra && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-3 gap-3">
            <MiniKpi
              label={t("Forecast — M1 profit", "Dự báo — lãi T1")}
              value={fmtVnd(forecastExtra.m1Profit)}
            />
            <MiniKpi label={t("Forecast — next month members", "Dự báo — TV tháng tới")} value={forecastExtra.nextMembers} />
            <MiniKpi
              label={t("Forecast — runway (M1 net)", "Dự báo — đường băng")}
              value={
                forecastExtra.runwayInfinite
                  ? t("∞", "∞")
                  : forecastExtra.runwayMo != null
                    ? `${forecastExtra.runwayMo.toFixed(1)} ${t("mo", "tháng")}`
                    : "—"
              }
            />
          </div>
        )}
      </Section>

      {/* Revenue & visits */}
      <Section
        title={t("Revenue & visits", "Doanh thu & lượt vào")}
        subtitle={t("Period totals (same filters as other tabs)", "Tổng trong kỳ (cùng bộ lọc các tab khác)")}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniKpi label={t("Total revenue", "Tổng doanh thu")} value={fmtVnd(r.total ?? o.total_revenue ?? 0)} />
          <MiniKpi label={t("ARPU", "Doanh thu/TV")} value={fmtVnd(r.arpu ?? 0)} />
          <MiniKpi label={t("Revenue / visit", "Doanh thu/lượt")} value={fmtVnd(r.revenue_per_visit ?? 0)} />
          <MiniKpi label={t("Total visits", "Tổng lượt vào")} value={o.total_visits ?? 0} />
        </div>
        {r.over_time && r.over_time.length > 0 && (
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={r.over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: unknown) => [typeof v === "number" ? v.toLocaleString("vi-VN") : String(v ?? 0), t("Revenue", "Doanh thu")]}
                />
                <Line type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Members */}
      <Section
        title={t("Members", "Thành viên")}
        subtitle={t("Base, activity in period, health", "Cơ sở, hoạt động trong kỳ, sức khỏe")}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <MiniKpi label={t("Total (filtered)", "Tổng (đã lọc)")} value={m.total ?? o.total_members ?? 0} />
          <MiniKpi label={t("Active in period", "Hoạt động trong kỳ")} value={m.active ?? o.active_members ?? 0} />
          <MiniKpi label={t("Churn rate", "Tỷ lệ rời bỏ")} value={`${m.churn_rate ?? 0}%`} />
          <MiniKpi label={t("Avg visits / member", "Lượt/TV TB")} value={m.avg_visits_per_member ?? 0} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniKpi label={t("Health: active", "SK: đang tốt")} value={mh.active ?? 0} />
          <MiniKpi label={t("Health: at risk", "SK: rủi ro")} value={mh.at_risk ?? 0} />
          <MiniKpi label={t("Health: expiring soon", "SK: sắp hết hạn")} value={mh.expiring_soon ?? 0} />
          <MiniKpi label={t("Health: inactive", "SK: không HĐ")} value={mh.inactive ?? 0} />
        </div>
      </Section>

      {/* Retention & engagement */}
      <Section title={t("Retention & engagement", "Giữ chân & tương tác")}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <MiniKpi label={t("Return D1", "Quay lại D1")} value={`${ret.day1 ?? 0}%`} />
          <MiniKpi label={t("Return D7", "Quay lại D7")} value={`${ret.day7 ?? 0}%`} />
          <MiniKpi label={t("Return D30", "Quay lại D30")} value={`${ret.day30 ?? 0}%`} />
          <MiniKpi label={t("MAU", "MAU")} value={beh.mau ?? 0} />
          <MiniKpi label={t("WAU", "WAU")} value={beh.wau ?? 0} />
          <MiniKpi
            label={t("Newbie → membership", "Newbie → gói")}
            value={`${m.newbie_conversion_funnel?.converted_to_membership_pct ?? 0}%`}
          />
        </div>
      </Section>

      {/* Funnel */}
      <Section title={t("Funnel (conversion)", "Phễu (chuyển đổi)")}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniKpi label={t("First visit → purchase", "Lần đầu → mua")} value={`${fun.first_visit_to_purchase ?? 0}%`} />
          <MiniKpi label={t("Newbie → return", "Newbie → quay lại")} value={`${fun.newbie_to_return ?? 0}%`} />
          <MiniKpi label={t("Return → membership", "Quay lại → gói")} value={`${fun.return_to_membership ?? 0}%`} />
        </div>
      </Section>

      {/* Operations */}
      <Section title={t("Operations", "Vận hành")}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniKpi label={t("Tasks done", "NV xong")} value={op.tasks_completed ?? 0} />
          <MiniKpi label={t("Tasks overdue", "NV quá hạn")} value={op.tasks_overdue ?? 0} />
          <MiniKpi label={t("Task completion %", "Hoàn thành NV %")} value={`${op.completion_rate ?? 0}%`} />
          <MiniKpi label={t("Route resets overdue", "Reset tường quá hạn")} value={op.route_resets_overdue ?? 0} />
          <MiniKpi label={t("Coaching completed", "Coaching xong")} value={op.coaching_completed ?? 0} />
          <MiniKpi label={t("Coaching unassigned", "Coaching chưa giao")} value={op.coaching_missed ?? 0} />
        </div>
      </Section>

      {/* Staff performance */}
      <Section title={t("Staff (period)", "Nhân sự (kỳ)")}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniKpi label={t("Headcount in report", "Số người trong báo cáo")} value={staffAgg.count} />
          <MiniKpi label={t("Total POS sales", "Tổng DS POS")} value={fmtVnd(staffAgg.sales)} />
          <MiniKpi label={t("Total variable pay", "Tổng trả biến đổi")} value={fmtVnd(staffAgg.comm)} />
          <MiniKpi label={t("Tasks completed (sum)", "NV hoàn thành")} value={staffAgg.tasks} />
        </div>
      </Section>

      {/* Email + Training row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Section title={t("Recent email campaigns", "Chiến dịch email gần đây")}>
          {campaignLogs.length === 0 ? (
            <p className="text-sm text-slate-500">
              {extrasLoading ? t("Loading…", "Đang tải…") : t("No recent sends.", "Chưa có lần gửi gần đây.")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-2 pr-2">{t("Segment", "Phân khúc")}</th>
                    <th className="py-2 pr-2 text-right">{t("Sent", "Gửi")}</th>
                    <th className="py-2 pr-2 text-right">{t("Redeem", "Đổi mã")}</th>
                    <th className="py-2">{t("Date", "Ngày")}</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignLogs.map((log, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 pr-2 font-medium text-slate-800 truncate max-w-[140px]">{log.segment}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-slate-900 font-medium">{log.recipient_count}</td>
                      <td className="py-2 pr-2 text-right tabular-nums text-slate-900 font-medium">{log.redemption_count ?? "—"}</td>
                      <td className="py-2 text-slate-600 whitespace-nowrap">
                        {log.sent_at ? new Date(log.sent_at).toLocaleDateString(isVi ? "vi-VN" : "en-US") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={t("Staff training (onboarding)", "Đào tạo nhân sự")}>
          {onboardingSum == null && extrasLoading ? (
            <p className="text-sm text-slate-500">{t("Loading…", "Đang tải…")}</p>
          ) : onboardingSum && onboardingSum.total_staff > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <MiniKpi label={t("Staff in program", "Nhân sự trong chương trình")} value={onboardingSum.total_staff} />
              <MiniKpi
                label={t("Certified", "Đã chứng nhận")}
                value={onboardingSum.certified_count ?? "—"}
              />
              <MiniKpi
                label={t("Avg AI score", "Điểm AI TB")}
                value={onboardingSum.avg_ai != null ? onboardingSum.avg_ai : "—"}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("No onboarding data or restricted.", "Không có dữ liệu hoặc hạn chế quyền.")}</p>
          )}
        </Section>
      </div>
    </div>
  );
}
