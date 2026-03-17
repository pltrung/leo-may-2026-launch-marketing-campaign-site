"use client";

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type AnalyticsData = {
  filters?: { period: string; since: string; until: string; member_type: string; activity: string };
  overview?: { total_revenue: number; total_members: number; active_members: number; total_visits: number };
  revenue?: {
    total: number;
    by_category: Record<string, number>;
    over_time: { date: string; total: number }[];
    arpu: number;
    revenue_per_visit: number;
  };
  members?: {
    total: number;
    active: number;
    inactive: number;
    new_over_time: { date: string; count: number }[];
    churn_rate: number;
    avg_visits_per_member: number;
    membership_distribution?: {
      by_plan: Record<string, { count: number; pct: number; active_count: number }>;
      trend: { plan: string; prev_pct: number; current_pct: number }[];
    };
    member_health?: {
      active: number;
      at_risk: number;
      inactive: number;
      expiring_soon: number;
      by_plan: Record<string, { active: number; at_risk: number; inactive: number; expiring_soon: number }>;
    };
    newbie_conversion_funnel?: {
      purchased_count: number;
      return_7_days_pct: number;
      return_30_days_pct: number;
      converted_to_membership_pct: number;
    };
    activity_segmentation?: { highly_active: number; moderate: number; low_activity: number; inactive: number };
    action_insights?: { type: string; label_en: string; label_vi: string; count: number; recommendation_en: string; recommendation_vi: string }[];
  };
  retention?: {
    day1: number;
    day7: number;
    day30: number;
    newbie_purchased_pct: number;
    newbie_return_7_pct: number;
    newbie_return_30_pct: number;
  };
  behavior?: {
    dau: { date: string; count: number }[];
    wau: number;
    mau: number;
    peak_hours: { hour: number; count: number }[];
  };
  funnel?: {
    first_visit_to_purchase: number;
    newbie_to_return: number;
    return_to_membership: number;
  };
  operations?: {
    tasks_completed: number;
    tasks_overdue: number;
    completion_rate: number;
    route_resets_overdue: number;
    coaching_completed: number;
    coaching_missed: number;
  };
  staff?: {
    staff_id: string;
    display_name: string;
    email: string;
    role: string;
    sales: number;
    commission: number;
    tasks_completed: number;
    attendance_days: number;
  }[];
};

function KpiCard({
  label,
  value,
  sub,
  className = "",
}: {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub != null && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function AnalyticsCharts({
  data,
  tab,
  locale,
  loading,
}: {
  data: AnalyticsData | null;
  tab: string;
  locale: string;
  loading: boolean;
}) {
  const isVi = locale === "vi";
  const t = (en: string, vi: string) => (isVi ? vi : en);

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
        {t("Loading analytics…", "Đang tải phân tích…")}
      </div>
    );
  }

  if (tab === "overview") {
    const o: Partial<NonNullable<AnalyticsData["overview"]>> = data.overview ?? {};
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label={t("Total revenue", "Tổng doanh thu")}
            value={`${(o.total_revenue ?? 0).toLocaleString("vi-VN")} VND`}
          />
          <KpiCard label={t("Total members", "Tổng thành viên")} value={o.total_members ?? 0} />
          <KpiCard label={t("Active (in period)", "Hoạt động (trong kỳ)")} value={o.active_members ?? 0} />
          <KpiCard label={t("Total visits", "Tổng lượt vào")} value={o.total_visits ?? 0} />
        </div>
        {data.revenue?.over_time && data.revenue.over_time.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">{t("Revenue over time", "Doanh thu theo thời gian")}</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.revenue.over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => [typeof v === "number" ? v.toLocaleString("vi-VN") : String(v ?? 0), t("Revenue", "Doanh thu")]} labelFormatter={(l) => l} />
                <Line type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={2} dot={{ r: 3 }} name={t("Revenue", "Doanh thu")} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (tab === "revenue") {
    const r: Partial<NonNullable<AnalyticsData["revenue"]>> = data.revenue ?? {};
    const byCat = r.by_category ?? {};
    const catEntries = Object.entries(byCat).filter(([, v]) => v > 0);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label={t("Total revenue", "Tổng doanh thu")} value={`${(r.total ?? 0).toLocaleString("vi-VN")} VND`} />
          <KpiCard label={t("ARPU", "Doanh thu / người")} value={`${(r.arpu ?? 0).toLocaleString("vi-VN")} VND`} />
          <KpiCard label={t("Revenue per visit", "Doanh thu / lượt")} value={`${(r.revenue_per_visit ?? 0).toLocaleString("vi-VN")} VND`} />
        </div>
        {catEntries.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">{t("Revenue by category", "Doanh thu theo danh mục")}</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={catEntries.map(([name, value]) => ({ name, value }))} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => [typeof v === "number" ? v.toLocaleString("vi-VN") + " VND" : String(v ?? 0), t("Amount", "Số tiền")]} />
                <Bar dataKey="value" fill="#0f766e" radius={[0, 4, 4, 0]} name={t("Revenue", "Doanh thu")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {r.over_time && r.over_time.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">{t("Revenue over time", "Doanh thu theo thời gian")}</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={r.over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => [typeof v === "number" ? v.toLocaleString("vi-VN") : String(v ?? 0), t("Revenue", "Doanh thu")]} />
                <Line type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (tab === "members") {
    const m: Partial<NonNullable<AnalyticsData["members"]>> = data.members ?? {};
    const isVi = locale === "vi";
    const newOverTime = m.new_over_time ?? [];
    const dist = m.membership_distribution;
    const health = m.member_health;
    const newbieFunnel = m.newbie_conversion_funnel;
    const activitySeg = m.activity_segmentation;
    const actions = m.action_insights ?? [];
    const planDisplayNames: Record<string, { en: string; vi: string }> = {
      "30_day": { en: "30 Day Membership", vi: "Gói 30 ngày" },
      "365_day": { en: "365 Day Membership", vi: "Gói 365 ngày" },
      visit_pass: { en: "Visit Pass", vi: "Gói lượt" },
      day_pass: { en: "Day Pass", vi: "Vé ngày" },
    };
    return (
      <div className="space-y-8">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label={t("Total members", "Tổng thành viên")} value={m.total ?? 0} />
          <KpiCard label={t("Active (in period)", "Hoạt động (trong kỳ)")} value={m.active ?? 0} />
          <KpiCard label={t("Churn rate", "Tỷ lệ rời bỏ")} value={`${m.churn_rate ?? 0}%`} />
          <KpiCard label={t("Avg visits per member", "TB lượt / thành viên")} value={m.avg_visits_per_member ?? 0} />
        </div>

        {/* 1. Membership distribution */}
        {dist && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
            <p className="text-sm font-semibold text-slate-800 mb-4">{t("Membership distribution", "Phân bố gói thành viên")}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 font-semibold text-slate-600">{t("Plan type", "Loại gói")}</th>
                    <th className="text-right py-2 font-semibold text-slate-600">{t("Count", "Số lượng")}</th>
                    <th className="text-right py-2 font-semibold text-slate-600">%</th>
                    <th className="text-right py-2 font-semibold text-slate-600">{t("Active (in period)", "Hoạt động (kỳ)")}</th>
                    <th className="text-right py-2 font-semibold text-slate-600">{t("Trend", "Xu hướng")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(["30_day", "365_day", "visit_pass", "day_pass"] as const).map((key) => {
                    const row = dist.by_plan?.[key];
                    if (!row) return null;
                    const names = planDisplayNames[key];
                    const trendRow = dist.trend?.find((r) => r.plan === key);
                    const trendStr = trendRow ? (trendRow.current_pct >= (trendRow.prev_pct ?? 0) ? "↑" : "↓") + ` ${trendRow.current_pct}% vs ${trendRow.prev_pct}%` : "—";
                    return (
                      <tr key={key} className="border-b border-slate-100">
                        <td className="py-2 font-medium text-slate-900">{isVi ? names.vi : names.en}</td>
                        <td className="py-2 text-right text-slate-800">{row.count}</td>
                        <td className="py-2 text-right text-slate-800">{row.pct}%</td>
                        <td className="py-2 text-right text-slate-800">{row.active_count}</td>
                        <td className="py-2 text-right text-slate-600 text-xs">{trendStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Member health metrics */}
        {health && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
            <p className="text-sm font-semibold text-slate-800 mb-4">{t("Member health", "Sức khỏe thành viên")}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <KpiCard label={t("Active (visit in 7d)", "Hoạt động (7 ngày)")} value={health.active} className="border-emerald-200 bg-emerald-50/50" />
              <KpiCard label={t("At-risk (7–14d no visit)", "Có rủi ro (7–14 ngày)")} value={health.at_risk} className="border-amber-200 bg-amber-50/50" />
              <KpiCard label={t("Inactive (30+ days)", "Không hoạt động (30+ ngày)")} value={health.inactive} className="border-slate-200 bg-slate-50" />
              <KpiCard label={t("Expiring soon (≤7 days)", "Sắp hết hạn (≤7 ngày)")} value={health.expiring_soon} className="border-rose-200 bg-rose-50/50" />
            </div>
            {health.by_plan && Object.keys(health.by_plan).length > 0 && (
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t("By membership type", "Theo loại gói")}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-1.5 font-medium text-slate-600">{t("Plan", "Gói")}</th>
                    <th className="text-right py-1.5 font-medium text-slate-600">{t("Active", "Hoạt động")}</th>
                    <th className="text-right py-1.5 font-medium text-slate-600">{t("At-risk", "Rủi ro")}</th>
                    <th className="text-right py-1.5 font-medium text-slate-600">{t("Inactive", "Không HĐ")}</th>
                    <th className="text-right py-1.5 font-medium text-slate-600">{t("Expiring soon", "Sắp hết hạn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(["30_day", "365_day", "visit_pass", "day_pass"] as const).map((key) => {
                    const row = health.by_plan[key];
                    if (!row) return null;
                    const names = planDisplayNames[key];
                    return (
                      <tr key={key} className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-800">{isVi ? names.vi : names.en}</td>
                        <td className="py-1.5 text-right">{row.active}</td>
                        <td className="py-1.5 text-right">{row.at_risk}</td>
                        <td className="py-1.5 text-right">{row.inactive}</td>
                        <td className="py-1.5 text-right">{row.expiring_soon}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Newbie conversion funnel */}
        {newbieFunnel && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
            <p className="text-sm font-semibold text-slate-800 mb-4">{t("Newbie conversion funnel", "Phễu chuyển đổi Newbie")}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label={t("Purchased newbie class", "Mua lớp Newbie")} value={newbieFunnel.purchased_count} />
              <KpiCard label={t("% returned in 7 days", "% quay lại trong 7 ngày")} value={`${newbieFunnel.return_7_days_pct}%`} />
              <KpiCard label={t("% returned in 30 days", "% quay lại trong 30 ngày")} value={`${newbieFunnel.return_30_days_pct}%`} />
              <KpiCard label={t("% converted to membership", "% chuyển sang gói thành viên")} value={`${newbieFunnel.converted_to_membership_pct}%`} />
            </div>
          </div>
        )}

        {/* 4. Activity segmentation */}
        {activitySeg && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
            <p className="text-sm font-semibold text-slate-800 mb-4">{t("Activity segmentation", "Phân đoạn hoạt động")}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label={t("Highly active (3+ visits/week)", "Rất tích cực (3+ lượt/tuần)")} value={activitySeg.highly_active} className="border-emerald-200 bg-emerald-50/50" />
              <KpiCard label={t("Moderate (1–2 visits/week)", "Trung bình (1–2 lượt/tuần)")} value={activitySeg.moderate} />
              <KpiCard label={t("Low activity", "Ít hoạt động")} value={activitySeg.low_activity} />
              <KpiCard label={t("Inactive (0 visits in period)", "Không hoạt động (0 lượt trong kỳ)")} value={activitySeg.inactive} className="border-slate-200 bg-slate-50" />
            </div>
          </div>
        )}

        {/* 5. Action panel */}
        {actions.length > 0 && (
          <div className="rounded-xl border-2 border-teal-200 bg-teal-50/50 p-4 md:p-6">
            <p className="text-sm font-semibold text-teal-900 mb-2">{t("Action panel", "Hành động đề xuất")}</p>
            <p className="text-xs text-teal-800/90 mb-4">{t("Use these insights to decide campaigns and outreach.", "Dùng các gợi ý sau để quyết định chiến dịch và liên hệ.")}</p>
            <ul className="space-y-3">
              {actions.map((a) => (
                <li key={a.type} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-white border border-teal-100">
                  <div>
                    <span className="font-medium text-slate-900">{isVi ? a.label_vi : a.label_en}</span>
                    <span className="ml-2 text-slate-600">({a.count})</span>
                  </div>
                  <p className="text-sm text-slate-700 sm:text-right">{isVi ? a.recommendation_vi : a.recommendation_en}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* New members over time (existing) */}
        {newOverTime.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">{t("New members over time", "Thành viên mới theo thời gian")}</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={newOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name={t("New members", "Thành viên mới")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (tab === "retention") {
    const r: Partial<NonNullable<AnalyticsData["retention"]>> = data.retention ?? {};
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard label={t("Day 1 retention", "Giữ chân ngày 1")} value={`${r.day1 ?? 0}%`} />
          <KpiCard label={t("Day 7 retention", "Giữ chân ngày 7")} value={`${r.day7 ?? 0}%`} />
          <KpiCard label={t("Day 30 retention", "Giữ chân ngày 30")} value={`${r.day30 ?? 0}%`} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">{t("Newbie class conversion", "Chuyển đổi lớp Newbie")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard label={t("% purchased newbie class", "% mua lớp Newbie")} value={`${r.newbie_purchased_pct ?? 0}%`} />
            <KpiCard label={t("% returned within 7 days", "% quay lại trong 7 ngày")} value={`${r.newbie_return_7_pct ?? 0}%`} />
            <KpiCard label={t("% returned within 30 days", "% quay lại trong 30 ngày")} value={`${r.newbie_return_30_pct ?? 0}%`} />
          </div>
        </div>
      </div>
    );
  }

  if (tab === "behavior") {
    const b: Partial<NonNullable<AnalyticsData["behavior"]>> = data.behavior ?? {};
    const dau = b.dau ?? [];
    const peak = b.peak_hours ?? [];
    const peakData = peak.map(({ hour, count }) => ({ hour: `${hour}:00`, count }));
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard label={t("WAU", "Tuần hoạt động")} value={b.wau ?? 0} />
          <KpiCard label={t("MAU", "Tháng hoạt động")} value={b.mau ?? 0} />
        </div>
        {dau.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">{t("Daily active users (visits per day)", "Lượt vào theo ngày")}</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dau}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} name={t("Visits", "Lượt")} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {peakData.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">{t("Peak usage by hour", "Giờ cao điểm")}</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={peakData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} name={t("Check-ins", "Lượt check-in")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (tab === "funnel") {
    const f: Partial<NonNullable<AnalyticsData["funnel"]>> = data.funnel ?? {};
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-700 mb-4">{t("Conversion funnel", "Phễu chuyển đổi")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard
              label={t("First visit → Purchase", "Lần đầu → Mua")}
              value={`${f.first_visit_to_purchase ?? 0}%`}
              sub={t("Conversion rate", "Tỷ lệ chuyển đổi")}
            />
            <KpiCard
              label={t("Newbie class → Return visit", "Lớp Newbie → Quay lại")}
              value={`${f.newbie_to_return ?? 0}%`}
            />
            <KpiCard
              label={t("Return visit → Membership", "Quay lại → Gói thành viên")}
              value={`${f.return_to_membership ?? 0}%`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (tab === "operations") {
    const op: Partial<NonNullable<AnalyticsData["operations"]>> = data.operations ?? {};
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard label={t("Tasks completed", "Nhiệm vụ hoàn thành")} value={op.tasks_completed ?? 0} />
          <KpiCard label={t("Tasks overdue", "Nhiệm vụ quá hạn")} value={op.tasks_overdue ?? 0} />
          <KpiCard label={t("Task completion rate", "Tỷ lệ hoàn thành")} value={`${op.completion_rate ?? 0}%`} />
          <KpiCard label={t("Route resets overdue", "Reset tường quá hạn")} value={op.route_resets_overdue ?? 0} />
          <KpiCard label={t("Coaching completed", "Coaching hoàn thành")} value={op.coaching_completed ?? 0} />
          <KpiCard label={t("Coaching missed", "Coaching chưa giao")} value={op.coaching_missed ?? 0} />
        </div>
      </div>
    );
  }

  if (tab === "staff") {
    const staffList = data.staff ?? [];
    return (
      <div className="space-y-6">
        <p className="text-sm font-semibold text-slate-700">{t("Staff performance (period)", "Hiệu suất nhân sự (kỳ)")}</p>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Staff", "Nhân sự")}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Role", "Vai trò")}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">{t("Sales", "Doanh số")}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">{t("Commission", "Hoa hồng")}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">{t("Tasks done", "Nhiệm vụ")}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">{t("Attendance days", "Số ngày có mặt")}</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => (
                <tr key={s.staff_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{s.display_name}</td>
                  <td className="py-3 px-4 text-slate-600">{s.role}</td>
                  <td className="py-3 px-4 text-right text-slate-900">{(s.sales ?? 0).toLocaleString("vi-VN")} VND</td>
                  <td className="py-3 px-4 text-right text-slate-900">{(s.commission ?? 0).toLocaleString("vi-VN")} VND</td>
                  <td className="py-3 px-4 text-right text-slate-700">{s.tasks_completed ?? 0}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{s.attendance_days ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {staffList.length === 0 && (
            <p className="p-6 text-center text-slate-500">{t("No staff data for this period.", "Không có dữ liệu nhân sự trong kỳ.")}</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
