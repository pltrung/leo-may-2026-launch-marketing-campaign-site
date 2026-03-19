"use client";

import React, { useEffect, useState, useCallback } from "react";
import { renderBody } from "@/lib/campaignSegments";
import { MARKETING_AUDIENCES } from "@/lib/marketingAudienceQueries";
import { SEGMENT_GROUPS, type CampaignSegmentId } from "@/lib/campaignSegments";
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
import ExecutiveSummary from "@/components/admin/ExecutiveSummary";
import { getHorizonSuffix } from "@/lib/admin/analytics/periodUtils";
export type AdminFetch = (url: string, options?: RequestInit) => Promise<Response>;

export type AnalyticsData = {
  fetched_at?: string;
  ceo_snapshot?: {
    checkins_today: number;
    newbie_class_sessions_today: number;
    current_paying_members: number;
    renewals_mtd: number;
    new_members_mtd: number;
    expiring_7d_all: number;
    expiring_30d_all: number;
  };
  retention_cohort?: {
    d1: { pct: number; numerator: number; denominator: number };
    d7: { pct: number; numerator: number; denominator: number };
    d30: { pct: number; numerator: number; denominator: number };
  };
  filters?: { period: string; since: string; until: string; period_horizon?: "wtd" | "mtd" | "qtd" | "ytd" | null; member_type: string; activity: string };
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
      expiring_30_days?: number;
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
  horizon = "mtd",
  loading,
  adminFetch,
  onboardingExtra,
  onOpenAnalyticsTab,
  onExecutiveAlertsCount,
}: {
  data: AnalyticsData | null;
  tab: string;
  locale: string;
  horizon?: "wtd" | "mtd" | "qtd" | "ytd";
  loading: boolean;
  adminFetch?: AdminFetch;
  /** Shown under Ops & people — staff onboarding training table */
  onboardingExtra?: React.ReactNode;
  onOpenAnalyticsTab?: (
    t: "overview" | "revenue_members" | "engagement" | "ops_team" | "marketing" | "finance"
  ) => void;
  onExecutiveAlertsCount?: (n: number) => void;
}) {
  const isVi = locale === "vi";
  const t = (en: string, vi: string) => (isVi ? vi : en);

  const [campaignSegments, setCampaignSegments] = useState<CampaignSegmentRow[]>([]);
  const [marketingAudiences, setMarketingAudiences] = useState<
    { id: string; nameEn: string; nameVi: string; descriptionEn: string; descriptionVi: string; count: number }[]
  >([]);
  const [campaignSegmentsLoading, setCampaignSegmentsLoading] = useState(false);
  const [campaignModal, setCampaignModal] = useState<{
    segment: CampaignSegmentRow;
    subject: string;
    body: string;
  } | null>(null);
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [createAudienceId, setCreateAudienceId] = useState("marketing_all_members");
  const [createSubject, setCreateSubject] = useState("");
  const [createBody, setCreateBody] = useState("");
  const [createShowPreview, setCreateShowPreview] = useState(false);
  const [createTestSending, setCreateTestSending] = useState(false);
  const [createTestMessage, setCreateTestMessage] = useState<string | null>(null);
  const [createSending, setCreateSending] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<number | null>(null);
  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignSuccess, setCampaignSuccess] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [campaignLogs, setCampaignLogs] = useState<{ id: string; segment: string; subject: string; recipient_count: number; sent_at: string; status: string; promo_code?: string | null; redemption_count?: number }[]>([]);
  const [showEmptySegments, setShowEmptySegments] = useState(false);

  const fetchCampaignLogs = useCallback(() => {
    if (!adminFetch) return;
    adminFetch("/api/admin/campaigns/logs?limit=10")
      .then((r) => r.json())
      .then((d) => setCampaignLogs(d.logs ?? []))
      .catch(() => setCampaignLogs([]));
  }, [adminFetch]);

  useEffect(() => {
    if (tab !== "marketing" || !adminFetch) return;
    setCampaignSegmentsLoading(true);
    adminFetch("/api/admin/campaigns/segments")
      .then((r) => r.json())
      .then((d) => {
        setCampaignSegments(d.segments ?? []);
        setMarketingAudiences(d.marketingAudiences ?? []);
      })
      .catch(() => {
        setCampaignSegments([]);
        setMarketingAudiences([]);
      })
      .finally(() => setCampaignSegmentsLoading(false));
    fetchCampaignLogs();
  }, [tab, adminFetch, fetchCampaignLogs]);

  const openCampaignModal = useCallback((segment: CampaignSegmentRow) => {
    setCampaignModal({ segment, subject: segment.subject, body: segment.body });
    setCampaignSuccess(null);
    setShowPreview(false);
  }, []);

  const openCreateCampaign = useCallback(() => {
    setCreateAudienceId("marketing_all_members");
    setCreateSubject("");
    setCreateBody(
      `Hey [Name],\n\nThank you for being part of Leo Mây.\n\n(Write your marketing message here.)\n\nSee you at the gym,\nLeo Mây Team`
    );
    setCreateShowPreview(false);
    setCreateTestMessage(null);
    setCreateSuccess(null);
    setCreateCampaignOpen(true);
  }, []);

  const sendCreateCampaignTest = useCallback(async () => {
    if (!adminFetch || !createSubject.trim() || !createBody.trim()) {
      setCreateTestMessage(t("Fill subject and body first.", "Điền tiêu đề và nội dung trước."));
      return;
    }
    setCreateTestSending(true);
    setCreateTestMessage(null);
    try {
      const res = await adminFetch("/api/admin/campaigns/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: createSubject.trim(),
          body: createBody,
          marketing: true,
          locale: isVi ? "vi" : "en",
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.sent_to) {
        setCreateTestMessage(t(`Test email sent to ${d.sent_to}`, `Đã gửi thử tới ${d.sent_to}`));
      } else {
        setCreateTestMessage(d.error || t("Test send failed.", "Gửi thử thất bại."));
      }
    } catch {
      setCreateTestMessage(t("Test send failed.", "Gửi thử thất bại."));
    } finally {
      setCreateTestSending(false);
    }
  }, [adminFetch, createSubject, createBody, isVi, t]);

  const sendCreateCampaign = useCallback(async () => {
    if (!adminFetch || !createAudienceId || !createSubject.trim() || !createBody.trim()) return;
    setCreateSending(true);
    setCreateSuccess(null);
    try {
      const res = await adminFetch("/api/admin/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketing_audience: createAudienceId,
          subject: createSubject.trim(),
          body: createBody,
        }),
      });
      const d = await res.json();
      if (res.ok && d.sent != null) {
        setCreateSuccess(d.sent);
        fetchCampaignLogs();
        adminFetch("/api/admin/campaigns/segments")
          .then((r) => r.json())
          .then((seg) => {
            setCampaignSegments(seg.segments ?? []);
            setMarketingAudiences(seg.marketingAudiences ?? []);
          })
          .catch(() => {});
        setTimeout(() => {
          setCreateCampaignOpen(false);
          setCreateSuccess(null);
        }, 2200);
      } else {
        setCreateSuccess(-1);
      }
    } catch {
      setCreateSuccess(-1);
    } finally {
      setCreateSending(false);
    }
  }, [adminFetch, createAudienceId, createSubject, createBody, fetchCampaignLogs]);

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

  if (tab !== "marketing" && (loading || !data)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
        {t("Loading analytics…", "Đang tải phân tích…")}
      </div>
    );
  }

  if (tab === "marketing") {
    return (
      <div className="space-y-6">
        {adminFetch ? (
          <div className="rounded-xl border-2 border-teal-200 bg-teal-50/50 p-4 md:p-6">
            <p className="text-sm font-semibold text-teal-900 mb-2">{t("Email campaigns", "Chiến dịch email")}</p>
            <p className="text-xs text-teal-800/90 mb-3">{t("Send targeted emails with pre-built templates. Edit subject/body in the modal before sending.", "Gửi email theo đối tượng với mẫu có sẵn. Chỉnh sửa tiêu đề/nội dung trong hộp thoại trước khi gửi.")}</p>
            <button
              type="button"
              onClick={openCreateCampaign}
              className="mb-6 w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 border border-slate-800 shadow-sm"
            >
              {t("Create a new campaign", "Tạo chiến dịch mới")}
            </button>

            {/* Campaign segments — grouped: Lifecycle, Retention, Upsell */}
            <section className="mb-6">
              <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">
                {t("Campaign segments", "Nhóm chiến dịch")}
              </h3>
              <p className="text-xs text-teal-700/90 mb-2">{t("Targeted cohorts with pre-built templates, grouped by focus.", "Đối tượng có mẫu sẵn, nhóm theo mục tiêu.")}</p>
              <label className="flex items-center gap-2 text-xs text-teal-900 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEmptySegments}
                  onChange={(e) => setShowEmptySegments(e.target.checked)}
                />
                {t("Show empty segments (0 recipients)", "Hiện nhóm rỗng (0 người nhận)")}
              </label>
              {campaignSegmentsLoading ? (
                <p className="text-sm text-slate-500">{t("Loading segments…", "Đang tải nhóm…")}</p>
              ) : (
                <div className="space-y-6">
                  {SEGMENT_GROUPS.map((grp) => {
                    const segs = campaignSegments.filter((s) => grp.segmentIds.includes(s.id as CampaignSegmentId));
                    const visible = showEmptySegments ? segs : segs.filter((s) => s.count > 0);
                    if (visible.length === 0) return null;
                    return (
                      <div key={grp.id} className="rounded-lg border border-teal-200 bg-teal-50/30 p-3">
                        <h4 className="text-xs font-semibold text-teal-900 uppercase tracking-wide mb-2">
                          {isVi ? grp.nameVi : grp.nameEn}
                        </h4>
                        <ul className="space-y-2">
                          {visible.map((seg) => (
                            <li key={seg.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded-lg bg-white border border-teal-100">
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
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Audiences — keyed by MarketingAudienceId */}
            <section>
              <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">
                {t("Audiences", "Đối tượng rộng")}
              </h3>
              <p className="text-xs text-teal-700/90 mb-3">{t("Broad audiences for custom campaigns (used in Create campaign above).", "Đối tượng rộng cho chiến dịch tùy chỉnh.")}</p>
              {campaignSegmentsLoading ? (
                <p className="text-sm text-slate-500">{t("Loading…", "Đang tải…")}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {marketingAudiences.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-lg bg-white/80 border border-teal-100 flex flex-col gap-1"
                    >
                      <span className="font-medium text-slate-900">{isVi ? a.nameVi : a.nameEn}</span>
                      <span className="text-sm text-teal-600">{a.count} {t("recipients", "người nhận")}</span>
                      <p className="text-xs text-slate-500 line-clamp-2">{isVi ? a.descriptionVi : a.descriptionEn}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateAudienceId(a.id);
                          setCreateCampaignOpen(true);
                        }}
                        className="mt-1 text-xs text-teal-600 hover:text-teal-800 font-medium self-start"
                      >
                        {t("Use for campaign →", "Dùng cho chiến dịch →")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

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
        {createCampaignOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !createSending && !createTestSending && setCreateCampaignOpen(false)}
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {t("New marketing campaign", "Chiến dịch marketing mới")}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {t("No promo code — general announcement. Use Test send to preview in your inbox.", "Không kèm mã ưu đãi — thông báo chung. Dùng Gửi thử để xem trong hộp thư của bạn.")}
              </p>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("Audience", "Đối tượng")}</label>
              <select
                value={createAudienceId}
                onChange={(e) => setCreateAudienceId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white mb-4"
              >
                {(marketingAudiences.length
                  ? marketingAudiences
                  : MARKETING_AUDIENCES.map((a) => ({ ...a, count: 0 }))
                ).map((a) => (
                  <option key={a.id} value={a.id}>
                    {isVi ? a.nameVi : a.nameEn} ({a.count})
                  </option>
                ))}
              </select>
              {(() => {
                const a =
                  marketingAudiences.find((x) => x.id === createAudienceId) ||
                  MARKETING_AUDIENCES.find((x) => x.id === createAudienceId);
                return a ? (
                  <p className="text-xs text-slate-500 mb-4">{isVi ? a.descriptionVi : a.descriptionEn}</p>
                ) : null;
              })()}
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("Subject", "Tiêu đề")}</label>
              <input
                type="text"
                value={createSubject}
                onChange={(e) => setCreateSubject(e.target.value)}
                placeholder={t("e.g. Spring climbing social", "vd: Sự kiện leo mùa xuân")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white mb-2"
              />
              <p className="text-xs text-slate-500 mb-4">
                {t("Subject will show as “Leo Mây — …” (no promo-code line).", "Tiêu đề hiển thị dạng “Leo Mây — …” (không dòng mã ưu đãi).")}
              </p>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("Body", "Nội dung")}</label>
              <textarea
                value={createBody}
                onChange={(e) => setCreateBody(e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white mb-2 font-mono"
              />
              <p className="text-xs text-slate-500 mb-4">{t("Use [Name] for the member’s first name.", "Dùng [Name] cho tên thành viên.")}</p>
              <button type="button" onClick={() => setCreateShowPreview((v) => !v)} className="mb-3 text-sm text-teal-600 hover:underline">
                {createShowPreview ? t("Hide preview", "Ẩn xem trước") : t("Preview message", "Xem trước nội dung")}
              </button>
              {createShowPreview && (
                <div className="mb-4 p-4 rounded-lg bg-slate-100 border border-slate-200 text-sm">
                  <p className="font-medium text-slate-700 mb-1">
                    {t("Sample", "Mẫu")} (Alex): {createSubject || "—"}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-slate-800">{renderBody(createBody || "", "Alex")}</pre>
                </div>
              )}
              {createTestMessage && <p className="text-sm mb-3 text-teal-700">{createTestMessage}</p>}
              {createSuccess !== null && (
                <p className={`text-sm mb-3 ${createSuccess >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {createSuccess >= 0
                    ? t(`Sent to ${createSuccess} recipients.`, `Đã gửi tới ${createSuccess} người nhận.`)
                    : t("Send failed.", "Gửi thất bại.")}
                </p>
              )}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setCreateCampaignOpen(false)}
                  disabled={createSending || createTestSending}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {t("Cancel", "Hủy")}
                </button>
                <button
                  type="button"
                  onClick={sendCreateCampaignTest}
                  disabled={createTestSending || createSending || !createSubject.trim() || !createBody.trim()}
                  className="px-4 py-2 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                >
                  {createTestSending ? t("Sending test…", "Đang gửi thử…") : t("Test send (to me)", "Gửi thử (tới tôi)")}
                </button>
                <button
                  type="button"
                  onClick={sendCreateCampaign}
                  disabled={
                    createSending ||
                    createTestSending ||
                    !createSubject.trim() ||
                    !createBody.trim() ||
                    (() => {
                      const c = marketingAudiences.find((a) => a.id === createAudienceId)?.count;
                      return c !== undefined && c === 0;
                    })()
                  }
                  className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50"
                >
                  {createSending ? t("Sending…", "Đang gửi…") : t("Send campaign", "Gửi chiến dịch")}
                </button>
              </div>
            </div>
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400 mb-4"
              />
              <p className="text-xs text-slate-500 mb-2">{t("Subject will be prefixed with “Leo Mây — ” and “ · Code inside” when sent.", "Khi gửi, tiêu đề sẽ có thêm “Leo Mây — ” và “ · Mã nằm trong email”.")}</p>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("Body", "Nội dung")}</label>
              <textarea
                value={campaignModal.body}
                onChange={(e) => setCampaignModal((m) => (m ? { ...m, body: e.target.value } : null))}
                rows={10}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400 mb-2 font-mono"
              />
              <p className="text-xs text-slate-500 mb-4">{t("A unique promo code will be added to the email when you send.", "Một mã ưu đãi sẽ được thêm vào email khi bạn gửi.")}</p>
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

  if (tab === "overview" && data) {
    return (
      <ExecutiveSummary
        data={data}
        locale={locale}
        horizon={horizon}
        adminFetch={adminFetch}
        onOpenTab={onOpenAnalyticsTab}
        onAlertsCount={onExecutiveAlertsCount}
      />
    );
  }

  if (tab === "revenue_members") {
    const r: Partial<NonNullable<AnalyticsData["revenue"]>> = data?.revenue ?? {};
    const byCat = r.by_category ?? {};
    const catEntries = Object.entries(byCat).filter(([, v]) => v > 0);
    const cashTotal = r.total ?? 0;
    const membershipMtd = byCat.membership ?? 0;
    const passMtd = (byCat.day_pass ?? 0) + (byCat.visit_pass ?? 0);
    const classMtd = byCat.newbie ?? 0;
    const merchMtd = (byCat.merch ?? 0) + (byCat.rental ?? 0);
    const payingMembers = data?.ceo_snapshot?.current_paying_members ?? 0;
    const aovContext = payingMembers > 0 ? Math.round(cashTotal / payingMembers) : 0;
    const m: Partial<NonNullable<AnalyticsData["members"]>> = data?.members ?? {};
    const isViMem = locale === "vi";
    const newOverTime = m.new_over_time ?? [];
    const dist = m.membership_distribution;
    const health = m.member_health;
    const newbieFunnel = m.newbie_conversion_funnel;
    const activitySeg = m.activity_segmentation;
    const planDisplayNames: Record<string, { en: string; vi: string }> = {
      "30_day": { en: "30 Day Membership", vi: "Gói 30 ngày" },
      "180_day": { en: "180 Day Membership", vi: "Gói 180 ngày" },
      "365_day": { en: "365 Day Membership", vi: "Gói 365 ngày" },
      visit_pass: { en: "Visit Pass", vi: "Gói lượt" },
      day_pass: { en: "Day Pass", vi: "Vé ngày" },
    };
    return (
      <div className="space-y-14">
        <section data-tour="analytics-section-revenue">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{t("Revenue", "Doanh thu")}</h2>
          <p className="text-xs text-slate-500 mb-4">{t("Income and trends for the selected period.", "Thu nhập và xu hướng trong kỳ đã chọn.")}</p>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard
                label={t(`Cash sales ${getHorizonSuffix(horizon)}`, `Bán thu tiền ${getHorizonSuffix(horizon)}`)}
                value={`${cashTotal.toLocaleString("vi-VN")} VND`}
                sub={t("Same basis as Finance tab", "Cùng cơ sở với Tài chính")}
              />
              <KpiCard label={t(`Membership sales ${getHorizonSuffix(horizon)}`, `Bán gói ${getHorizonSuffix(horizon)}`)} value={`${membershipMtd.toLocaleString("vi-VN")} VND`} />
              <KpiCard label={t(`Day / visit passes ${getHorizonSuffix(horizon)}`, `Vé ngày / lượt ${getHorizonSuffix(horizon)}`)} value={`${passMtd.toLocaleString("vi-VN")} VND`} />
              <KpiCard
                label={t(`Class / newbie ${getHorizonSuffix(horizon)}`, `Lớp / newbie ${getHorizonSuffix(horizon)}`)}
                value={`${classMtd.toLocaleString("vi-VN")} VND`}
              />
              <KpiCard label={t(`Merch & retail ${getHorizonSuffix(horizon)}`, `Bán lẻ ${getHorizonSuffix(horizon)}`)} value={`${merchMtd.toLocaleString("vi-VN")} VND`} />
              <KpiCard label={t(`Renewals ${getHorizonSuffix(horizon)}`, `Gia hạn ${getHorizonSuffix(horizon)}`)} value={data?.ceo_snapshot?.renewals_mtd ?? "—"} />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {t("Secondary:", "Phụ:")}{" "}
              {t("Approx. cash ÷ paying members", "Ước tiền ÷ TV trả phí")}{" "}
              {aovContext > 0 ? `≈ ${aovContext.toLocaleString("vi-VN")} VND — ` : ""}
              {t("distorted by prepayments; not primary KPI.", "lệch khi trả trước; không phải KPI chính.")}
            </p>
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
        </section>

        <section className="pt-6 border-t border-slate-200" data-tour="analytics-section-members">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{t("Members", "Thành viên")}</h2>
          <p className="text-xs text-slate-500 mb-4">{t("Base size, plans, health, and growth.", "Quy mô, gói, sức khỏe cơ sở và tăng trưởng.")}</p>
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard
                label={t("Current paying members", "TV đang trả phí")}
                value={data?.ceo_snapshot?.current_paying_members ?? "—"}
                sub={t("All active memberships (snapshot)", "Tất cả gói còn hạn")}
              />
              <KpiCard label={t(`Active members ${getHorizonSuffix(horizon)}`, `TV hoạt động ${getHorizonSuffix(horizon)}`)} value={m.active ?? 0} />
              <KpiCard label={t(`New members ${getHorizonSuffix(horizon)}`, `TV mới ${getHorizonSuffix(horizon)}`)} value={data?.ceo_snapshot?.new_members_mtd ?? "—"} />
              <KpiCard label={t("Expiring in 7 days", "Hết hạn 7 ngày")} value={data?.ceo_snapshot?.expiring_7d_all ?? "—"} />
              <KpiCard label={t("Expiring in 14 days", "Hết hạn 14 ngày")} value={(data?.ceo_snapshot as { expiring_14d_all?: number })?.expiring_14d_all ?? "—"} />
              <KpiCard label={t("Expiring in 30 days", "Hết hạn 30 ngày")} value={data?.ceo_snapshot?.expiring_30d_all ?? "—"} />
              <KpiCard
                label={t("Visits / active member", "Lượt / TV hoạt động")}
                value={
                  (m.active ?? 0) > 0 ? ((data?.overview?.total_visits ?? 0) / (m.active ?? 1)).toFixed(2) : "—"
                }
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800 mb-3">{t("Expiry & renewal pipeline", "Hết hạn & gia hạn")}</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiCard label={t("Expiring ≤7d", "Hết hạn ≤7 ngày")} value={data?.ceo_snapshot?.expiring_7d_all ?? "—"} />
                <KpiCard label={t("Expiring 8–14d", "Hết hạn 8–14 ngày")} value={(data?.ceo_snapshot as { expiring_14d_all?: number })?.expiring_14d_all ?? "—"} />
                <KpiCard
                  label={t("Expiring 15–30d", "Hết hạn 15–30 ngày")}
                  value={Math.max(0, (data?.ceo_snapshot?.expiring_30d_all ?? 0) - ((data?.ceo_snapshot as { expiring_14d_all?: number })?.expiring_14d_all ?? 0) - (data?.ceo_snapshot?.expiring_7d_all ?? 0))}
                />
                <KpiCard label={t("Renewed already", "Đã gia hạn")} value={data?.ceo_snapshot?.renewals_mtd ?? "—"} sub={getHorizonSuffix(horizon)} />
                <KpiCard label={t("Not renewed yet", "Chưa gia hạn")} value="—" sub={t("Expired; not tracked", "Đã hết hạn; chưa theo dõi")} />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {t("Filtered cohort (filters above):", "Có lọc:")} {m.total ?? 0}{" "}
              {t("members in segment", "TV trong phân đoạn")}; {t("churn", "rời bỏ")}{" "}
              {m.churn_rate ?? 0}%
            </p>
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
                      {(["30_day", "180_day", "365_day", "visit_pass", "day_pass"] as const).map((key) => {
                        const row = dist.by_plan?.[key];
                        if (!row) return null;
                        const names = planDisplayNames[key];
                        const trendRow = dist.trend?.find((tr) => tr.plan === key);
                        const trendStr = trendRow
                          ? (trendRow.current_pct >= (trendRow.prev_pct ?? 0) ? "↑" : "↓") +
                            ` ${trendRow.current_pct}% vs ${trendRow.prev_pct}%`
                          : "—";
                        return (
                          <tr key={key} className="border-b border-slate-100">
                            <td className="py-2 font-medium text-slate-900">{isViMem ? names.vi : names.en}</td>
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
                  <table className="w-full text-sm text-slate-900">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-1.5 font-semibold text-slate-700">{t("Plan", "Gói")}</th>
                        <th className="text-right py-1.5 font-semibold text-slate-700">{t("Active", "Hoạt động")}</th>
                        <th className="text-right py-1.5 font-semibold text-slate-700">{t("At-risk", "Rủi ro")}</th>
                        <th className="text-right py-1.5 font-semibold text-slate-700">{t("Inactive", "Không HĐ")}</th>
                        <th className="text-right py-1.5 font-semibold text-slate-700">{t("Expiring soon", "Sắp hết hạn")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(["30_day", "180_day", "365_day", "visit_pass", "day_pass"] as const).map((key) => {
                        const row = health.by_plan[key];
                        if (!row) return null;
                        const names = planDisplayNames[key];
                        return (
                          <tr key={key} className="border-b border-slate-100">
                            <td className="py-2 text-slate-800 font-medium">{isViMem ? names.vi : names.en}</td>
                            <td className="py-2 text-right text-slate-900 font-semibold tabular-nums">{row.active}</td>
                            <td className="py-2 text-right text-slate-900 font-semibold tabular-nums">{row.at_risk}</td>
                            <td className="py-2 text-right text-slate-900 font-semibold tabular-nums">{row.inactive}</td>
                            <td className="py-2 text-right text-slate-900 font-semibold tabular-nums">{row.expiring_soon}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
        </section>
      </div>
    );
  }

  if (tab === "engagement") {
    const r: Partial<NonNullable<AnalyticsData["retention"]>> = data?.retention ?? {};
    const rc = data?.retention_cohort;
    const b: Partial<NonNullable<AnalyticsData["behavior"]>> = data?.behavior ?? {};
    const f: Partial<NonNullable<AnalyticsData["funnel"]>> = data?.funnel ?? {};
    const mh = data?.members?.member_health;
    const actionInsights = data?.members?.action_insights ?? [];
    const dau = b.dau ?? [];
    const peak = b.peak_hours ?? [];
    const peakData = peak.map(({ hour, count }) => ({ hour: `${hour}:00`, count }));
    const act = data?.overview?.active_members ?? 0;
    const visits = data?.overview?.total_visits ?? 0;
    const vph = act > 0 ? (visits / act).toFixed(2) : "—";
    return (
      <div className="space-y-14">
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{t("Retention", "Giữ chân")}</h2>
          <p className="text-xs text-slate-500 mb-4">
            {t(
              "Cohort retention: eligible = first visit ≥ N days before period end; returned = another visit within N days (distinct users).",
              "Cohort: đủ điều kiện = lần đầu ≥ N ngày trước cuối kỳ; quay lại = có lượt trong N ngày sau lần đầu."
            )}
          </p>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KpiCard
                label={t("D1 retention", "Giữ chân D1")}
                value={`${rc?.d1?.pct ?? r.day1 ?? 0}%`}
                sub={rc ? `${rc.d1.numerator} / ${rc.d1.denominator}` : undefined}
              />
              <KpiCard
                label={t("D7 retention", "Giữ chân D7")}
                value={`${rc?.d7?.pct ?? r.day7 ?? 0}%`}
                sub={rc ? `${rc.d7.numerator} / ${rc.d7.denominator}` : undefined}
              />
              <KpiCard
                label={t("D30 retention", "Giữ chân D30")}
                value={`${rc?.d30?.pct ?? r.day30 ?? 0}%`}
                sub={rc ? `${rc.d30.numerator} / ${rc.d30.denominator}` : undefined}
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">{t("Newbie class conversion", "Chuyển đổi lớp Newbie")}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  label={t("% purchased newbie class", "% mua lớp Newbie")}
                  value={`${Math.min(100, Math.max(0, r.newbie_purchased_pct ?? 0))}%`}
                  sub={(r as { newbie_purchased_num?: number; newbie_purchased_den?: number }).newbie_purchased_den != null ? `${(r as { newbie_purchased_num?: number }).newbie_purchased_num ?? 0} / ${(r as { newbie_purchased_den?: number }).newbie_purchased_den}` : undefined}
                />
                <KpiCard
                  label={t("% returned within 7 days", "% quay lại trong 7 ngày")}
                  value={`${Math.min(100, Math.max(0, r.newbie_return_7_pct ?? 0))}%`}
                  sub={(r as { newbie_return_7_den?: number }).newbie_return_7_den != null ? `${(r as { newbie_return_7_num?: number }).newbie_return_7_num ?? 0} / ${(r as { newbie_return_7_den?: number }).newbie_return_7_den}` : undefined}
                />
                <KpiCard
                  label={t("% returned within 30 days", "% quay lại trong 30 ngày")}
                  value={`${Math.min(100, Math.max(0, r.newbie_return_30_pct ?? 0))}%`}
                  sub={(r as { newbie_return_30_den?: number }).newbie_return_30_den != null ? `${(r as { newbie_return_30_num?: number }).newbie_return_30_num ?? 0} / ${(r as { newbie_return_30_den?: number }).newbie_return_30_den}` : undefined}
                />
              </div>
            </div>
          </div>
        </section>
        <section className="pt-6 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{t("Visit patterns", "Mẫu đến phòng")}</h2>
          <p className="text-xs text-slate-500 mb-4">{t("When members show up.", "Thời điểm thành viên tới.")}</p>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label={t("WAU", "Tuần hoạt động")} value={b.wau ?? 0} />
              <KpiCard label={t("MAU", "Tháng hoạt động")} value={b.mau ?? 0} />
              <KpiCard label={t("Avg days between visits", "TB ngày giữa các lượt")} value={(b as { avg_days_between_visits?: number | null })?.avg_days_between_visits ?? "—"} />
              <KpiCard label={t("Avg visits / active member", "TB lượt / TV HĐ")} value={vph} />
              <KpiCard
                label={t("Visit load (period)", "Tải lượt (kỳ)")}
                value={visits}
                sub={t("total visits in filters", "tổng lượt theo lọc")}
              />
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
        </section>
        <section className="pt-6 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{t("Follow-up queue", "Hàng chờ theo dõi")}</h2>
          <p className="text-xs text-slate-500 mb-3">{t("Action insights: members needing outreach with recommended actions.", "Thành viên cần liên hệ với hành động đề xuất.")}</p>
          {actionInsights.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">{t("Segment", "Phân đoạn")}</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Count", "Số lượng")}</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">{t("Recommended action", "Hành động đề xuất")}</th>
                  </tr>
                </thead>
                <tbody>
                  {actionInsights.map((ins, i) => (
                    <tr key={ins.type + String(i)} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 px-3 text-slate-900">{locale === "vi" ? ins.label_vi : ins.label_en}</td>
                      <td className="py-2 px-3 text-right font-semibold tabular-nums text-slate-900">{ins.count}</td>
                      <td className="py-2 px-3 text-slate-600">{locale === "vi" ? ins.recommendation_vi : ins.recommendation_en}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4">{t("No action items — all segments healthy.", "Không có việc cần làm — các phân đoạn đều ổn.")}</p>
          )}
        </section>
        <section className="pt-6 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{t("Risk & inactivity", "Rủi ro & không tới")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label={t("At-risk (7–14d)", "Rủi ro 7–14 ngày")} value={mh?.at_risk ?? 0} />
            <KpiCard label={t("Inactive (30+ days)", "Không tới 30+ ngày")} value={mh?.inactive ?? 0} />
            <KpiCard label={t("Expiring ≤7d (segment)", "Hết hạn ≤7 ngày")} value={mh?.expiring_soon ?? 0} />
            <KpiCard label={t("Expiring ≤30d (segment)", "Hết hạn ≤30 ngày")} value={mh?.expiring_30_days ?? 0} />
          </div>
        </section>
        <section className="pt-6 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{t("Conversion funnel", "Phễu chuyển đổi")}</h2>
          <p className="text-xs text-slate-500 mb-4">{t("From first visit to membership.", "Từ lần đầu đến gói thành viên.")}</p>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KpiCard
                label={t("First visit → Purchase", "Lần đầu → Mua")}
                value={`${f.first_visit_to_purchase ?? 0}%`}
                sub={t("Distinct visitors with ≥1 payment · capped 100%", "TV có thanh toán · tối đa 100%")}
              />
              <KpiCard
                label={t("Newbie class → Return visit", "Lớp Newbie → Quay lại")}
                value={`${f.newbie_to_return ?? 0}%`}
                sub={t("Among newbie buyers", "Trong nhóm mua newbie")}
              />
              <KpiCard
                label={t("Return visit → Membership", "Quay lại → Gói thành viên")}
                value={`${f.return_to_membership ?? 0}%`}
                sub={t("Active in period / visit-based; capped 100%", "Trong kỳ; tối đa 100%")}
              />
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (tab === "ops_team") {
    const op: Partial<NonNullable<AnalyticsData["operations"]>> = data?.operations ?? {};
    const staffList = data?.staff ?? [];
    return (
      <div className="space-y-14 min-w-0 max-w-full">
        <section className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{t("Operations", "Vận hành")}</h2>
          <p className="text-xs text-slate-500 mb-4">{t("Tasks, walls, coaching — period totals.", "Nhiệm vụ, tường, coaching trong kỳ.")}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard label={t("Tasks completed", "Nhiệm vụ hoàn thành")} value={op.tasks_completed ?? 0} />
            <KpiCard label={t("Tasks overdue", "Nhiệm vụ quá hạn")} value={op.tasks_overdue ?? 0} />
            <KpiCard label={t("Task completion rate", "Tỷ lệ hoàn thành")} value={`${op.completion_rate ?? 0}%`} />
            <KpiCard label={t("Route resets overdue", "Reset tường quá hạn")} value={op.route_resets_overdue ?? 0} />
            <KpiCard label={t("Coaching completed", "Coaching hoàn thành")} value={op.coaching_completed ?? 0} />
            <KpiCard label={t("Coaching missed", "Coaching chưa giao")} value={op.coaching_missed ?? 0} />
          </div>
        </section>
        <section className="pt-6 border-t border-slate-200 min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{t("Staff performance", "Hiệu suất nhân sự")}</h2>
          <p className="text-xs text-slate-500 mb-4">{t("POS sales, variable pay, tasks, attendance.", "Doanh số POS, trả biến đổi, nhiệm vụ, chấm công.")}</p>
          <p className="text-xs text-slate-400 mb-2 md:hidden">{t("Swipe horizontally to see all columns.", "Vuốt ngang để xem đủ các cột.")}</p>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {staffList.length === 0 ? (
              <p className="p-6 text-center text-slate-500">{t("No staff data for this period.", "Không có dữ liệu nhân sự trong kỳ.")}</p>
            ) : (
              <div
                className="overflow-x-auto max-w-full min-w-0 overscroll-x-contain touch-pan-x"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">{t("Staff", "Nhân sự")}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">{t("Role", "Vai trò")}</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">{t("Sales", "Doanh số")}</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">{t("Commission", "Hoa hồng")}</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">{t("Tasks done", "Nhiệm vụ")}</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">{t("Attendance days", "Số ngày có mặt")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((s) => (
                      <tr key={s.staff_id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">{s.display_name}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{s.role}</td>
                        <td className="py-3 px-4 text-right text-slate-900 whitespace-nowrap tabular-nums">{(s.sales ?? 0).toLocaleString("vi-VN")} VND</td>
                        <td className="py-3 px-4 text-right text-slate-900 whitespace-nowrap tabular-nums">{(s.commission ?? 0).toLocaleString("vi-VN")} VND</td>
                        <td className="py-3 px-4 text-right text-slate-700 tabular-nums">{s.tasks_completed ?? 0}</td>
                        <td className="py-3 px-4 text-right text-slate-700 tabular-nums">{s.attendance_days ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        {onboardingExtra ? (
          <section className="pt-6 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">{t("Staff training", "Đào tạo nhân sự")}</h2>
            <p className="text-xs text-slate-500 mb-4">{t("Onboarding program progress (admin).", "Tiến độ chương trình onboarding.")}</p>
            {onboardingExtra}
          </section>
        ) : null}
      </div>
    );
  }

  return null;
}
