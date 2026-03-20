"use client";

import React, { useCallback, useEffect, useState } from "react";
import { formatVnd } from "@/lib/formatVndCompact";
import { getPeriodRange } from "@/lib/admin/analytics/periodUtils";
import type { TimeHorizon } from "@/lib/admin/analytics/periodUtils";

export default function AcquisitionTab({
  adminFetch,
  locale,
  horizon = "mtd",
}: {
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
  locale: "en" | "vi";
  horizon?: "wtd" | "mtd" | "qtd" | "ytd";
}) {
  const isVi = locale === "vi";
  const t = (en: string, vi: string) => (isVi ? vi : en);

  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([]);
  const [packages, setPackages] = useState<{ packages: Record<string, unknown>[]; package_labels: Record<string, { labelEn: string; labelVi: string }> } | null>(null);
  const [landingPages, setLandingPages] = useState<Record<string, unknown>[]>([]);
  const [timeToConvert, setTimeToConvert] = useState<Record<string, { median_days: number; avg_days: number; count: number }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualStatDate, setManualStatDate] = useState("");
  const [manualPlatform, setManualPlatform] = useState("facebook");
  const [manualCampaign, setManualCampaign] = useState("");
  const [manualSpend, setManualSpend] = useState("");
  const [manualImpressions, setManualImpressions] = useState("");
  const [manualClicks, setManualClicks] = useState("");
  const [manualLeads, setManualLeads] = useState("");
  const [manualSaving, setManualSaving] = useState(false);

  const params = new URLSearchParams();
  params.set("horizon", horizon);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, campaignsRes, packagesRes, landingRes, timeRes] = await Promise.all([
        adminFetch(`/api/admin/acquisition/overview?${params.toString()}`),
        adminFetch(`/api/admin/acquisition/campaigns?${params.toString()}`),
        adminFetch(`/api/admin/acquisition/packages?${params.toString()}`),
        adminFetch(`/api/admin/acquisition/landing-pages?${params.toString()}`),
        adminFetch(`/api/admin/acquisition/time-to-convert?${params.toString()}`),
      ]);
      const [o, c, p, l, tt] = await Promise.all([
        overviewRes.json(),
        campaignsRes.json(),
        packagesRes.json(),
        landingRes.json(),
        timeRes.json(),
      ]);
      if (overviewRes.ok) setOverview(o);
      if (campaignsRes.ok) setCampaigns(c.campaigns ?? []);
      if (packagesRes.ok) setPackages({ packages: p.packages ?? [], package_labels: p.package_labels ?? {} });
      if (landingRes.ok) setLandingPages(l.landing_pages ?? []);
      if (timeRes.ok) setTimeToConvert(tt);
    } catch {
      setOverview(null);
      setCampaigns([]);
      setPackages(null);
      setLandingPages([]);
      setTimeToConvert(null);
    } finally {
      setLoading(false);
    }
  }, [adminFetch, horizon]);

  useEffect(() => {
    load();
  }, [load]);

  const saveManual = async () => {
    if (!manualStatDate || !manualPlatform) return;
    setManualSaving(true);
    try {
      const res = await adminFetch("/api/admin/acquisition/manual-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stat_date: manualStatDate,
          platform: manualPlatform,
          campaign_name: manualCampaign.trim() || manualPlatform,
          spend: Number(manualSpend) || 0,
          impressions: Number(manualImpressions) || 0,
          clicks: Number(manualClicks) || 0,
          leads: Number(manualLeads) || 0,
        }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setManualOpen(false);
        setManualStatDate("");
        setManualCampaign("");
        setManualSpend("");
        setManualImpressions("");
        setManualClicks("");
        setManualLeads("");
        load();
      }
    } finally {
      setManualSaving(false);
    }
  };

  const range = getPeriodRange(horizon as TimeHorizon);

  const diagnostics: { type: string; msgEn: string; msgVi: string }[] = [];
  if (overview) {
    const imp = Number(overview.impressions) || 0;
    const clk = Number(overview.clicks) || 0;
    const ctr = imp > 0 ? (clk / imp) * 100 : 0;
    const signups = Number(overview.signups) || 0;
    const purchases = Number(overview.purchases) || 0;
    const checkins = Number(overview.first_checkins) || 0;
    if (imp > 1000 && ctr < 0.5) diagnostics.push({ type: "ctr", msgEn: "High impressions, low CTR → creative/targeting issue", msgVi: "Lượt hiển thị cao, CTR thấp → vấn đề sáng tạo/đối tượng" });
    if (clk > 50 && signups < 2) diagnostics.push({ type: "landing", msgEn: "Good CTR, low signups → landing page issue", msgVi: "CTR tốt, ít đăng ký → vấn đề trang đích" });
    if (signups > 5 && purchases < 2) diagnostics.push({ type: "pricing", msgEn: "Good signups, low purchase → pricing/offer issue", msgVi: "Đăng ký tốt, ít mua → vấn đề giá/ưu đãi" });
    if (purchases > 3 && checkins < 2) diagnostics.push({ type: "onboarding", msgEn: "Good purchase, low first check-in → onboarding/experience issue", msgVi: "Mua tốt, ít check-in đầu → vấn đề trải nghiệm/onboarding" });
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
        {t("Loading acquisition data…", "Đang tải dữ liệu acquisition…")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {t("Paid ad performance (Meta, Google, TikTok): spend, funnel, package conversion, landing pages. For email campaigns, see CRM & Email tab.", "Hiệu suất quảng cáo trả phí (Meta, Google, TikTok): chi phí, phễu, chuyển đổi gói, trang đích. Để gửi email, xem tab CRM & Email.")}
        </p>
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t("Add ad stats (manual)", "Thêm số liệu quảng cáo (thủ công)")}
        </button>
      </div>

      {/* 1. Overview KPIs — paid ad performance */}
      <section data-tour="acquisition-overview">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">
          {t("Paid ad overview", "Tổng quan quảng cáo trả phí")} ({range.sinceDate} – {range.untilDate})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { k: "spend", l: t("Spend", "Chi phí"), v: overview ? formatVnd(Number(overview.spend) || 0) : "—" },
            { k: "impressions", l: t("Impressions", "Lượt hiển thị"), v: overview ? (Number(overview.impressions) || 0).toLocaleString() : "—" },
            { k: "clicks", l: t("Clicks", "Lượt nhấp"), v: overview ? (Number(overview.clicks) || 0).toLocaleString() : "—" },
            { k: "ctr", l: t("CTR", "CTR"), v: overview ? `${Number(overview.ctr) || 0}%` : "—" },
            { k: "cpc", l: t("CPC", "CPC"), v: overview ? formatVnd(Number(overview.cpc) || 0) : "—" },
            { k: "leads", l: t("Leads", "Lead"), v: overview ? (Number(overview.leads) || 0).toString() : "—" },
            { k: "signups", l: t("Signups", "Đăng ký"), v: overview ? (Number(overview.signups) || 0).toString() : "—" },
            { k: "purchases", l: t("Purchases", "Mua hàng"), v: overview ? (Number(overview.purchases) || 0).toString() : "—" },
            { k: "first_checkins", l: t("First check-ins", "Check-in đầu"), v: overview ? (Number(overview.first_checkins) || 0).toString() : "—" },
            { k: "cac", l: t("CAC", "Chi phí/check-in"), v: overview ? formatVnd(Number(overview.cac) || 0) : "—" },
            { k: "revenue", l: t("Revenue", "Doanh thu"), v: overview ? formatVnd(Number(overview.revenue) || 0) : "—" },
            { k: "roas", l: t("ROAS", "ROAS"), v: overview ? `${Number(overview.roas) || 0}x` : "—" },
          ].map(({ k, l, v }) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{l}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Funnel by campaign */}
      <section>
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">
          {t("Funnel by campaign", "Phễu theo chiến dịch")}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-2 px-3 font-semibold text-slate-700">{t("Channel", "Kênh")}</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-700">{t("Campaign", "Chiến dịch")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Spend", "Chi phí")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Impr.", "Hiển thị")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Clicks", "Nhấp")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Leads", "Lead")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Signups", "ĐK")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Purch.", "Mua")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Check-in", "Check-in")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("CAC", "CAC")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("ROAS", "ROAS")}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-slate-500">
                    {t("No campaign data. Add manual ad stats or connect APIs.", "Chưa có dữ liệu. Thêm số liệu thủ công hoặc kết nối API.")}
                  </td>
                </tr>
              ) : (
                campaigns.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-slate-800">{String(row.channel ?? "—")}</td>
                    <td className="py-2 px-3 text-slate-800">{String(row.campaign_name ?? "—")}</td>
                    <td className="py-2 px-3 text-right text-slate-800">{formatVnd(Number(row.spend) || 0)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{(Number(row.impressions) || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{Number(row.clicks) || 0}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{Number(row.leads) || 0}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{Number(row.signups) || 0}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{Number(row.purchases) || 0}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-800">{Number(row.first_checkins) || 0}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{formatVnd(Number(row.cac) || 0)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{Number(row.roas) || 0}x</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Package conversion */}
      {packages && packages.packages.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">
            {t("Package conversion (which plans each ad drives)", "Chuyển đổi theo gói (chiến dịch quảng cáo nào đưa gói nào)")}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2 px-3 font-semibold text-slate-700">{t("Channel", "Kênh")}</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-700">{t("Campaign", "Chiến dịch")}</th>
                  {["newbie", "day_pass", "visit_pack", "monthly", "half_year", "yearly"].map((k) => (
                    <th key={k} className="text-right py-2 px-3 font-semibold text-slate-700">
                      {isVi ? (packages.package_labels[k]?.labelVi ?? k) : (packages.package_labels[k]?.labelEn ?? k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packages.packages.map((row: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 px-3 text-slate-800">{String(row.channel ?? "—")}</td>
                    <td className="py-2 px-3 text-slate-800">{String(row.campaign_name ?? "—")}</td>
                    {["newbie", "day_pass", "visit_pack", "monthly", "half_year", "yearly"].map((k) => {
                      const bp = (row.by_package as Record<string, { count: number }>)?.[k];
                      return (
                        <td key={k} className="py-2 px-3 text-right text-slate-600">
                          {bp?.count ?? 0}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 4. Landing page performance */}
      {landingPages.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">
            {t("Landing page performance", "Hiệu suất trang đích")}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2 px-3 font-semibold text-slate-700">{t("Landing path", "Đường dẫn")}</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Sessions", "Phiên")}</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Leads", "Lead")}</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Signups", "ĐK")}</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Purchases", "Mua")}</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Check-ins", "Check-in")}</th>
                </tr>
              </thead>
              <tbody>
                {landingPages.map((row: Record<string, unknown>, i: number) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 px-3 text-slate-800 font-mono text-xs">{String(row.landing_path ?? "/")}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{Number(row.sessions) || 0}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{Number(row.leads) || 0}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{Number(row.signups) || 0}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{Number(row.purchases) || 0}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-800">{Number(row.first_checkins) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. Time to convert */}
      {timeToConvert && (
        <section>
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">
            {t("Time to convert", "Thời gian chuyển đổi")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { k: "first_touch_to_signup", l: t("First touch → Signup", "Chạm đầu → Đăng ký") },
              { k: "signup_to_purchase", l: t("Signup → Purchase", "Đăng ký → Mua") },
              { k: "purchase_to_first_checkin", l: t("Purchase → Check-in", "Mua → Check-in") },
              { k: "first_touch_to_first_checkin", l: t("First touch → Check-in", "Chạm đầu → Check-in") },
            ].map(({ k, l }) => {
              const d = timeToConvert[k] as { median_days: number; avg_days: number; count: number } | undefined;
              return (
                <div key={k} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{l}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{d ? `${d.median_days} days` : "—"}</p>
                  <p className="text-xs text-slate-500">{d ? `${t("median", "trung vị")} (n=${d.count})` : ""}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Diagnostics */}
      {diagnostics.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3">
            {t("Diagnostics", "Chẩn đoán")}
          </h3>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-2">
            {diagnostics.map((d, i) => (
              <p key={i} className="text-sm text-amber-900">
                {isVi ? d.msgVi : d.msgEn}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Manual stats modal */}
      {manualOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !manualSaving && setManualOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900">{t("Add paid ad stats (manual)", "Thêm số liệu quảng cáo trả phí (thủ công)")}</h3>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("Date", "Ngày")} (YYYY-MM-DD)</label>
              <input
                type="date"
                value={manualStatDate}
                onChange={(e) => setManualStatDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("Platform", "Nền tảng")}</label>
              <select
                value={manualPlatform}
                onChange={(e) => setManualPlatform(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="meta">Meta (combined)</option>
                <option value="tiktok">TikTok</option>
                <option value="google">Google</option>
                <option value="manual">Manual / Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("Campaign name", "Tên chiến dịch")}</label>
              <input
                type="text"
                value={manualCampaign}
                onChange={(e) => setManualCampaign(e.target.value)}
                placeholder={t("Optional", "Tuỳ chọn")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("Spend (VND)", "Chi phí")}</label>
                <input
                  type="number"
                  value={manualSpend}
                  onChange={(e) => setManualSpend(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("Impressions", "Hiển thị")}</label>
                <input
                  type="number"
                  value={manualImpressions}
                  onChange={(e) => setManualImpressions(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("Clicks", "Nhấp")}</label>
                <input
                  type="number"
                  value={manualClicks}
                  onChange={(e) => setManualClicks(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("Leads", "Lead")}</label>
                <input
                  type="number"
                  value={manualLeads}
                  onChange={(e) => setManualLeads(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                disabled={manualSaving}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                {t("Cancel", "Hủy")}
              </button>
              <button
                type="button"
                onClick={saveManual}
                disabled={manualSaving || !manualStatDate}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {manualSaving ? "…" : t("Save", "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
