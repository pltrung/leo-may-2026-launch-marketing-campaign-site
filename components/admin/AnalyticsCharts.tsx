"use client";

import React, { useEffect, useState, useCallback } from "react";
import { renderBody } from "@/lib/campaignSegments";
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
export type AdminFetch = (url: string, options?: RequestInit) => Promise<Response>;

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

export interface CampaignSegmentRow {
  id: string;
  nameEn: string;
  nameVi: string;
  descriptionEn: string;
  descriptionVi: string;
  ctaEn: string;
  ctaVi: string;
  subject: string;
  body: string;
  count: number;
}

export default function AnalyticsCharts({
  data,
  tab,
  locale,
  loading,
  adminFetch,
}: {
  data: AnalyticsData | null;
  tab: string;
  locale: string;
  loading: boolean;
  adminFetch?: AdminFetch;
}) {
  const isVi = locale === "vi";
  const t = (en: string, vi: string) => (isVi ? vi : en);

  const [campaignSegments, setCampaignSegments] = useState<CampaignSegmentRow[]>([]);
  const [campaignSegmentsLoading, setCampaignSegmentsLoading] = useState(false);
  const [campaignModal, setCampaignModal] = useState<{
    segment: CampaignSegmentRow;
    subject: string;
    body: string;
  } | null>(null);
  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignSuccess, setCampaignSuccess] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [campaignLogs, setCampaignLogs] = useState<{ id: string; segment: string; subject: string; recipient_count: number; sent_at: string; status: string; promo_code?: string | null; redemption_count?: number }[]>([]);

  const fetchCampaignLogs = useCallback(() => {
    if (!adminFetch) return;
    adminFetch("/api/admin/campaigns/logs?limit=10")
      .then((r) => r.json())
      .then((d) => setCampaignLogs(d.logs ?? []))
      .catch(() => setCampaignLogs([]));
  }, [adminFetch]);

  useEffect(() => {
    if (tab !== "email_campaigns" || !adminFetch) return;
    setCampaignSegmentsLoading(true);
    adminFetch("/api/admin/campaigns/segments")
      .then((r) => r.json())
      .then((d) => setCampaignSegments(d.segments ?? []))
      .catch(() => setCampaignSegments([]))
      .finally(() => setCampaignSegmentsLoading(false));
    fetchCampaignLogs();
  }, [tab, adminFetch, fetchCampaignLogs]);

  const openCampaignModal = useCallback((segment: CampaignSegmentRow) => {
    setCampaignModal({ segment, subject: segment.subject, body: segment.body });
    setCampaignSuccess(null);
    setShowPreview(false);
  }, []);

  const sendCampaign = useCallback(async () => {
    if (!campaignModal || !adminFetch) return;
    setCampaignSending(true);
    try {
      const res = await adminFetch("/api/admin/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment: campaignModal.segment.id,
          subject: campaignModal.subject,
          body: campaignModal.body,
        }),
      });
      const d = await res.json();
      if (res.ok && d.sent != null) {
        setCampaignSuccess(d.sent);
        fetchCampaignLogs();
        setTimeout(() => {
          setCampaignModal(null);
          setCampaignSuccess(null);
          setCampaignSegments((prev) =>
            prev.map((s) => (s.id === campaignModal.segment.id ? { ...s, count: Math.max(0, s.count - d.sent) } : s))
          );
        }, 2000);
      } else {
        setCampaignSuccess(-1);
      }
    } catch {
      setCampaignSuccess(-1);
    } finally {
      setCampaignSending(false);
    }
  }, [campaignModal, adminFetch, fetchCampaignLogs]);

  if (tab !== "email_campaigns" && (loading || !data)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
        {t("Loading analytics…", "Đang tải phân tích…")}
      </div>
    );
  }

  if (tab === "email_campaigns") {
    return (
      <div className="space-y-6">
        {adminFetch ? (
          <div className="rounded-xl border-2 border-teal-200 bg-teal-50/50 p-4 md:p-6">
            <p className="text-sm font-semibold text-teal-900 mb-2">{t("Email campaigns", "Chiến dịch email")}</p>
            <p className="text-xs text-teal-800/90 mb-4">{t("Send targeted emails with pre-built templates. Edit subject/body in the modal before sending.", "Gửi email theo đối tượng với mẫu có sẵn. Chỉnh sửa tiêu đề/nội dung trong hộp thoại trước khi gửi.")}</p>
            {campaignSegmentsLoading ? (
              <p className="text-sm text-slate-500">{t("Loading segments…", "Đang tải nhóm…")}</p>
            ) : (
              <ul className="space-y-3">
                {campaignSegments.map((seg) => (
                  <li key={seg.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-white border border-teal-100">
                    <div>
                      <span className="font-medium text-slate-900">{isVi ? seg.nameVi : seg.nameEn}</span>
                      <span className="ml-2 text-slate-600">({seg.count})</span>
                      <p className="text-xs text-slate-500 mt-0.5">{isVi ? seg.descriptionVi : seg.descriptionEn}</p>
                    </div>
                    <button
                      type="button"
                      disabled={seg.count === 0}
                      onClick={() => openCampaignModal(seg)}
                      className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isVi ? seg.ctaVi : seg.ctaEn}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {campaignLogs.length > 0 && (
              <div className="mt-6 pt-4 border-t border-teal-200">
                <p className="text-sm font-semibold text-teal-900 mb-2">{t("Recent sends", "Đã gửi gần đây")}</p>
                <ul className="space-y-2 text-sm">
                  {campaignLogs.map((log) => (
                    <li key={log.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 p-2 rounded-lg bg-white/80 border border-teal-100">
                      <span className="font-medium text-slate-800">{log.segment}</span>
                      <span className="text-slate-500">—</span>
                      <span className="text-slate-600 truncate max-w-[200px]" title={log.subject}>{log.subject}</span>
                      {log.promo_code && (
                        <>
                          <span className="text-slate-500">·</span>
                          <code className="text-xs font-mono bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">{log.promo_code}</code>
                        </>
                      )}
                      <span className="text-slate-500">·</span>
                      <span className="text-teal-700">{log.recipient_count} {t("recipients", "người nhận")}</span>
                      {(log.redemption_count ?? 0) > 0 && (
                        <>
                          <span className="text-slate-500">·</span>
                          <span className="text-emerald-700 font-medium">{log.redemption_count} {t("redemptions", "đã đổi mã")}</span>
                        </>
                      )}
                      <span className="text-slate-400 text-xs">
                        {new Date(log.sent_at).toLocaleString(locale === "vi" ? "vi-VN" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            {t("Admin access required for email campaigns.", "Cần quyền admin để dùng chiến dịch email.")}
          </div>
        )}
        {campaignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !campaignSending && setCampaignModal(null)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">{isVi ? campaignModal.segment.nameVi : campaignModal.segment.nameEn}</h3>
              <p className="text-sm text-slate-600 mb-4">{t("Recipients", "Người nhận")}: <strong>{campaignModal.segment.count}</strong></p>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("Subject", "Tiêu đề")}</label>
              <input
                type="text"
                value={campaignModal.subject}
                onChange={(e) => setCampaignModal((m) => (m ? { ...m, subject: e.target.value } : null))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4"
              />
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("Body", "Nội dung")}</label>
              <textarea
                value={campaignModal.body}
                onChange={(e) => setCampaignModal((m) => (m ? { ...m, body: e.target.value } : null))}
                rows={10}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4 font-mono text-sm"
              />
              <button type="button" onClick={() => setShowPreview((v) => !v)} className="mb-4 text-sm text-teal-600 hover:underline">
                {showPreview ? t("Hide preview", "Ẩn xem trước") : t("Preview message", "Xem trước nội dung")}
              </button>
              {showPreview && (
                <div className="mb-4 p-4 rounded-lg bg-slate-100 border border-slate-200 text-sm">
                  <p className="font-medium text-slate-700 mb-1">{t("Subject", "Tiêu đề")}: {campaignModal.subject}</p>
                  <pre className="whitespace-pre-wrap font-sans text-slate-800">{renderBody(campaignModal.body, "Alex")}</pre>
                </div>
              )}
              {campaignSuccess !== null && (
                <p className={`text-sm mb-4 ${campaignSuccess >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {campaignSuccess >= 0 ? t(`Sent to ${campaignSuccess} recipients.`, `Đã gửi tới ${campaignSuccess} người nhận.`) : t("Send failed. Check GMAIL_ACCESS_TOKEN and logs.", "Gửi thất bại. Kiểm tra GMAIL_ACCESS_TOKEN và nhật ký.")}
                </p>
              )}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setCampaignModal(null)} disabled={campaignSending} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  {t("Cancel", "Hủy")}
                </button>
                <button type="button" onClick={sendCampaign} disabled={campaignSending || campaignModal.segment.count === 0} className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50">
                  {campaignSending ? t("Sending…", "Đang gửi…") : t("Confirm send", "Xác nhận gửi")}
                </button>
              </div>
            </div>
          </div>
        )}
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
