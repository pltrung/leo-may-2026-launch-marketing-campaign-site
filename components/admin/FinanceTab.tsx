"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import ForecastPanel from "@/components/admin/ForecastPanel";
import { formatRunway } from "@/lib/admin/analytics/metricCalculators";
import { getHorizonSuffix } from "@/lib/admin/analytics/periodUtils";
import { buildAnalyticsAlerts } from "@/lib/admin/analytics/alerts";

type FinanceData = {
  month_key: string;
  config: { rent_amount: number; rent_due_day: number; payroll_day: number; current_cash: number };
  revenue_mtd: number;
  refunds_mtd?: number;
  cash_sales_mtd?: number;
  cash_out_mtd?: number;
  net_cash_flow_mtd?: number;
  eom_net_cash_flow_forecast?: number | null;
  runway_display?: "months" | "cash_positive" | "unknown";
  recognized_revenue_reliable?: boolean;
  metric_basis?: string;
  payroll_total: number;
  payroll_lines: {
    staff_id: string;
    name: string;
    role: string;
    compensation_type?: "hourly" | "monthly";
    monthly_salary: number;
    check_ins?: number;
    hourly_rate_vnd?: number | null;
    sales_mtd: number;
    variable_pay: number;
    variable_source: string;
    line_total: number;
    commission_rate: number;
  }[];
  rent_amount: number;
  expenses_mtd: number;
  expenses_list: Record<string, unknown>[];
  monthly_costs: number;
  profit: number;
  runway_months: number | null;
  fixed_costs: { category: string; item: string; amount: number; due_date: string; status: string }[];
  payroll_record: { month_key: string; total_amount: number; status: string; paid_at?: string | null };
  unpaid_expenses_sum?: number;
  forecast_cash_out_30d?: number;
  pending_reorders: {
    id: string;
    variant_id: string;
    variant_label: string;
    quantity_requested: number;
    note: string | null;
    status: string;
    created_at: string;
  }[];
  snapshots: Record<string, unknown>[];
  cash_in_out_over_time?: { date: string; cash_in: number; cash_out: number; net: number }[];
  months_history: {
    month_key: string;
    revenue: number;
    expenses_total: number;
    payroll_total: number;
    rent: number;
    costs_total: number;
    profit: number;
  }[];
};

function fmt(n: number) {
  return (n ?? 0).toLocaleString("vi-VN") + " VND";
}

export default function FinanceTab({
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

  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expCat, setExpCat] = useState<"inventory" | "equipment" | "misc">("misc");
  const [expItem, setExpItem] = useState("");
  const [expQty, setExpQty] = useState("1");
  const [expCost, setExpCost] = useState("");
  const [expSaving, setExpSaving] = useState(false);

  const [reorderModal, setReorderModal] = useState<{ id: string; label: string; qty: number } | null>(null);
  const [reorderCost, setReorderCost] = useState("");
  const [reorderSaving, setReorderSaving] = useState(false);

  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgRent, setCfgRent] = useState("");
  const [cfgCash, setCfgCash] = useState("");
  const [cfgRentDay, setCfgRentDay] = useState("");
  const [cfgPayDay, setCfgPayDay] = useState("");
  const [cfgSaving, setCfgSaving] = useState(false);

  const [auditMonth, setAuditMonth] = useState("");
  const [ledger, setLedger] = useState<Record<string, unknown>[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [staffEdit, setStaffEdit] = useState<{
    id: string;
    salary: string;
    rate: string;
    compensation_type: "hourly" | "monthly";
    hourly_rate: string;
  } | null>(null);
  const [snapNote, setSnapNote] = useState("");
  const [financeView, setFinanceView] = useState<"books" | "forecast">("books");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      params.set("horizon", horizon);
      const res = await adminFetch(`/api/admin/finance?${params.toString()}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setData(j);
      if (!auditMonth && j.month_key) setAuditMonth(j.month_key);
    } catch (e) {
      setErr((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [adminFetch, horizon]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!auditMonth) return;
    setLedgerLoading(true);
    adminFetch(`/api/admin/finance/expenses-ledger?month=${encodeURIComponent(auditMonth)}`)
      .then((r) => r.json())
      .then((j) => setLedger(j.expenses ?? []))
      .catch(() => setLedger([]))
      .finally(() => setLedgerLoading(false));
  }, [adminFetch, auditMonth]);

  const saveExpense = async () => {
    const cost = Number(expCost.replace(/,/g, ""));
    if (!expItem.trim() || !Number.isFinite(cost)) return;
    setExpSaving(true);
    try {
      const res = await adminFetch("/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "expense",
          category: expCat,
          item_name: expItem.trim(),
          quantity: Math.max(1, Number(expQty) || 1),
          cost,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setExpenseOpen(false);
      setExpItem("");
      setExpCost("");
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setExpSaving(false);
    }
  };

  const saveReorderExpense = async () => {
    if (!reorderModal) return;
    const cost = Number(reorderCost.replace(/,/g, ""));
    if (!Number.isFinite(cost) || cost < 0) return;
    setReorderSaving(true);
    try {
      const res = await adminFetch("/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder_expense", reorder_id: reorderModal.id, total_cost: cost }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setReorderModal(null);
      setReorderCost("");
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setReorderSaving(false);
    }
  };

  const saveConfig = async () => {
    setCfgSaving(true);
    try {
      const res = await adminFetch("/api/admin/finance/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rent_amount: Number(cfgRent.replace(/,/g, "")) || 0,
          current_cash: Number(cfgCash.replace(/,/g, "")) || 0,
          rent_due_day: Number(cfgRentDay) || 1,
          payroll_day: Number(cfgPayDay) || 25,
        }),
      });
      if (!res.ok) throw new Error("Config failed");
      setCfgOpen(false);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCfgSaving(false);
    }
  };

  const openCfg = () => {
    if (!data) return;
    setCfgRent(String(data.config.rent_amount));
    setCfgCash(String(data.config.current_cash));
    setCfgRentDay(String(data.config.rent_due_day));
    setCfgPayDay(String(data.config.payroll_day));
    setCfgOpen(true);
  };

  const markPayroll = async (paid: boolean) => {
    if (!data) return;
    await adminFetch("/api/admin/finance/payroll-record", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month_key: data.month_key, status: paid ? "paid" : "pending" }),
    });
    load();
  };

  const markExpensePaid = async (expenseId: string, paid: boolean) => {
    const res = await adminFetch(`/api/admin/finance/expense-paid?id=${encodeURIComponent(expenseId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid }),
    });
    if (res.ok) load();
  };

  const saveStaffComp = async () => {
    if (!staffEdit) return;
    const body: Record<string, unknown> = {
      staff_id: staffEdit.id,
      commission_rate: Number(staffEdit.rate) || 0,
      compensation_type: staffEdit.compensation_type,
    };
    if (staffEdit.compensation_type === "monthly") {
      body.monthly_salary = Number(staffEdit.salary.replace(/,/g, "")) || 0;
    } else {
      body.hourly_rate_vnd = Number(staffEdit.hourly_rate.replace(/,/g, "")) || 0;
    }
    const res = await adminFetch("/api/admin/finance/staff-comp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setStaffEdit(null);
      load();
    }
  };

  const recordSnapshot = async () => {
    if (!data) return;
    const m = auditMonth || data.month_key;
    const hist = data.months_history.find((h) => h.month_key === m);
    const res = await adminFetch("/api/admin/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "snapshot",
        month_key: m,
        revenue: hist?.revenue ?? data.revenue_mtd,
        costs_total: hist?.costs_total ?? data.monthly_costs,
        profit: hist?.profit ?? data.profit,
        payroll_total: hist?.payroll_total ?? data.payroll_total,
        rent_amount: hist?.rent ?? data.rent_amount,
        expenses_total: hist?.expenses_total ?? data.expenses_mtd,
        notes: snapNote || null,
      }),
    });
    if (res.ok) {
      setSnapNote("");
      load();
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      <nav className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200" aria-label="Finance sections">
        <button
          type="button"
          onClick={() => setFinanceView("books")}
          className={`flex-1 min-w-[140px] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            financeView === "books" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white/80"
          }`}
        >
          {t("This month", "Tháng này")}
        </button>
        <button
          type="button"
          onClick={() => setFinanceView("forecast")}
          className={`flex-1 min-w-[140px] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            financeView === "forecast" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white/80"
          }`}
        >
          {t("Forecast", "Dự báo")}
        </button>
      </nav>

      {financeView === "forecast" && (
        <ForecastPanel adminFetch={adminFetch} locale={locale} />
      )}

      {financeView === "books" && loading && !data && (
        <p className="text-slate-500 text-sm">{t("Loading…", "Đang tải…")}</p>
      )}
      {financeView === "books" && err && !data && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm">
          {err}
          <p className="mt-2 text-xs">{t("Apply migration 055 if tables are missing.", "Chạy migration 055 nếu thiếu bảng.")}</p>
        </div>
      )}

      {financeView === "books" && data && (
        <>
      {err && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{err}</p>}

      {/* Due soon / obligations (glance) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
          {t("Due soon & obligations", "Sắp đến hạn & nghĩa vụ")}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
          <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">{t("Cash in bank", "Quỹ tiền mặt")}</p>
            <p className="font-bold text-slate-900 mt-1">{fmt(data.config.current_cash)}</p>
          </div>
          <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">{t("Unpaid expenses", "Chi phí chưa trả")}</p>
            <p className="font-bold text-slate-900 mt-1">{data.unpaid_expenses_sum != null ? fmt(data.unpaid_expenses_sum) : "—"}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{t("Pending status", "Trạng thái chờ")}</p>
          </div>
          <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">{t("Forecast cash out (30d)", "Dự kiến tiền ra (30 ngày)")}</p>
            <p className="font-bold text-slate-900 mt-1">{data.forecast_cash_out_30d != null ? fmt(data.forecast_cash_out_30d) : "—"}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{t("Expenses + payroll + rent", "Chi phí + lương + thuê")}</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 shadow-sm">
            <p className="text-[10px] text-amber-900 uppercase font-semibold">{t("Payroll due", "Lương đến hạn")}</p>
            <p className="font-bold text-amber-950 mt-1">{fmt(data.payroll_total)}</p>
            <p className="text-[10px] text-amber-800">{data.payroll_record.status === "paid" ? t("Paid", "Đã trả") : t("Pending", "Chờ trả")}</p>
          </div>
          <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">{t("Rent due", "Tiền thuê")}</p>
            <p className="font-bold text-slate-900 mt-1">{fmt(data.rent_amount)}</p>
            <p className="text-[10px] text-slate-500">{data.fixed_costs.find((x) => x.category === "Rent")?.due_date ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">{t(`Recorded expenses ${getHorizonSuffix(horizon)}`, `Chi phí đã ghi ${getHorizonSuffix(horizon)}`)}</p>
            <p className="font-bold text-slate-900 mt-1">{fmt(data.expenses_mtd)}</p>
            <p className="text-[10px] text-slate-400">{t("Not same as “paid”", "Không = đã trả")}</p>
          </div>
          <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-3 shadow-sm">
            <p className="text-[10px] text-sky-900 uppercase font-semibold">{t("Runway", "Đường băng")}</p>
            <p className="font-bold text-sky-950 mt-1">
              {formatRunway(
                {
                  runway_months: data.runway_months,
                  runway_display: data.runway_display,
                  config: data.config,
                },
                t
              )}
            </p>
          </div>
        </div>
        {(() => {
          const finAlerts = buildAnalyticsAlerts(
            {
              payroll_total: data.payroll_total,
              payroll_record: data.payroll_record,
              config: data.config,
            },
            null,
            locale
          );
          if (finAlerts.length === 0) return null;
          return (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
              <span className="font-semibold">{t("Open alerts:", "Cảnh báo:")}</span>{" "}
              {finAlerts
                .slice(0, 4)
                .map((a) => (isVi ? a.titleVi : a.titleEn))
                .join(" · ")}
            </div>
          );
        })()}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => load()}
          className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 bg-white hover:bg-slate-50"
        >
          {t("Refresh", "Làm mới")}
        </button>
        <button
          type="button"
          onClick={openCfg}
          className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 bg-white hover:bg-slate-50"
        >
          {t("Rent, cash & schedule", "Tiền thuê, quỹ & lịch")}
        </button>
      </div>

      {/* A — Cash-oriented summary (aligned with Executive) */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-sm text-indigo-950 mb-2">
        <p className="font-semibold text-indigo-900">{t("Cash view (primary)", "Theo dòng tiền (chính)")}</p>
        <p className="text-xs text-indigo-800/90 mt-1">
          {t(
            "“Operating profit” from recognized revenue is not enabled yet — profit below is revenue minus prorated accrued costs for the selected period.",
            "P&L ghi nhận doanh thu chưa bật — lợi nhuận bên dưới là doanh thu trừ chi phí dồn tích (theo tỷ lệ kỳ)."
          )}
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          {
            label: t(`Cash sales ${getHorizonSuffix(horizon)}`, `Bán thu tiền ${getHorizonSuffix(horizon)}`),
            value: fmt(data.cash_sales_mtd ?? data.revenue_mtd),
            sub:
              (data.refunds_mtd ?? 0) > 0
                ? t(`incl. net of refunds (${fmt(data.refunds_mtd ?? 0)} ref.)`, `đã trừ hoàn (${fmt(data.refunds_mtd ?? 0)})`)
                : undefined,
            cls: "border-emerald-200 bg-emerald-50/60",
          },
          {
            label: t(`Net cash flow ${getHorizonSuffix(horizon)}`, `Dòng tiền ròng ${getHorizonSuffix(horizon)}`),
            value: data.net_cash_flow_mtd != null ? fmt(data.net_cash_flow_mtd) : "—",
            cls: "border-teal-200 bg-teal-50/50",
          },
          {
            label: t(`Costs ${getHorizonSuffix(horizon)} (accrued mix)`, `Chi phí ${getHorizonSuffix(horizon)} (dồn tích)`),
            value: fmt(data.monthly_costs),
            cls: "border-amber-200 bg-amber-50/60",
          },
          {
            label: t("Period surplus (approx.)", "Chênh lệch kỳ (ước tính)"),
            value: fmt(data.profit),
            sub: t("Not operating P&L", "Không phải P&L ghi nhận"),
            cls: "border-slate-200 bg-slate-50",
          },
          {
            label: t("Runway", "Đường băng"),
            value: formatRunway(
              {
                runway_months: data.runway_months,
                runway_display: data.runway_display,
                config: data.config,
              },
              t
            ),
            cls: "border-sky-200 bg-sky-50/60",
          },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.cls}`}>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{c.label}</p>
            <p className="text-lg font-bold text-slate-900 mt-1 break-words">{c.value}</p>
            {"sub" in c && c.sub ? <p className="text-[11px] text-slate-500 mt-0.5">{c.sub}</p> : null}
          </div>
        ))}
      </div>

      {/* Cash view chart: in vs out */}
      {data.cash_in_out_over_time && data.cash_in_out_over_time.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
          <p className="text-sm font-semibold text-slate-800 mb-3">
            {t(`Cash in vs out ${getHorizonSuffix(horizon)}`, `Tiền vào vs ra ${getHorizonSuffix(horizon)}`)}
          </p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.cash_in_out_over_time} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: unknown) => [typeof v === "number" ? (v as number).toLocaleString("vi-VN") + " VND" : String(v ?? 0), ""]}
                  labelFormatter={(l) => t("Date", "Ngày") + ": " + l}
                />
                <Legend />
                <Bar dataKey="cash_in" name={t("Cash in", "Tiền vào")} fill="#0f766e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="cash_out" name={t("Cash out", "Tiền ra")} fill="#b91c1c" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.recognized_revenue_reliable === false && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">{t("Operating / accrual P&L", "P&L dồn tích")}</p>
          <p className="text-xs text-slate-600 mt-1">
            {t(
              "Operating / accrual view with true revenue recognition is not fully supported yet. This tab prioritizes cash sales and recorded obligations.",
              "Chế độ P&L ghi nhận doanh thu đầy đủ chưa hỗ trợ. Tab này ưu tiên tiền vào và nghĩa vụ đã ghi."
            )}
          </p>
        </div>
      )}

      {/* B — Fixed costs */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 overflow-hidden">
        <p className="text-sm font-semibold text-slate-800 mb-3">{t("Fixed costs", "Chi phí cố định")}</p>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Category", "Hạng mục")}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Item", "Mục")}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">{t("Amount", "Số tiền")}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Due date", "Hạn")}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Status", "Trạng thái")}</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {data.fixed_costs.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{row.category}</td>
                  <td className="py-3 px-4 text-slate-700">{row.item}</td>
                  <td className="py-3 px-4 text-right text-slate-900 font-medium">{fmt(row.amount)}</td>
                  <td className="py-3 px-4 text-slate-600">{row.due_date}</td>
                  <td className="py-3 px-4 text-slate-600">{row.status}</td>
                  <td className="py-3 px-4">
                    {row.category === "Payroll" && (
                      <div className="flex gap-1 flex-wrap">
                        {data.payroll_record.status !== "paid" ? (
                          <button
                            type="button"
                            onClick={() => markPayroll(true)}
                            className="text-xs px-2 py-1 rounded-lg bg-emerald-600 text-white"
                          >
                            {t("Mark paid", "Đã trả")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markPayroll(false)}
                            className="text-xs px-2 py-1 rounded-lg border border-slate-300"
                          >
                            {t("Undo", "Hoàn tác")}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payroll breakdown + staff comp */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 overflow-hidden">
        <p className="text-sm font-semibold text-slate-800 mb-3">
          {t("Payroll breakdown (current month)", "Chi tiết lương (tháng này)")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Staff", "Nhân sự")}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Type", "Loại")}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">{t("Base", "Cố định")}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">{t(`Sales ${getHorizonSuffix(horizon)}`, `DS ${getHorizonSuffix(horizon)}`)}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">{t("Variable", "Biến đổi")}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">{t("Total", "Tổng")}</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {data.payroll_lines.map((s) => {
                const isHourly = s.compensation_type === "hourly";
                const checkIns = s.check_ins ?? 0;
                return (
                <tr key={s.staff_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{s.name}</span>
                    <span className="text-slate-500 text-xs ml-2">{s.role}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-xs">
                    {isHourly
                      ? `${t("Hourly", "Theo ca")} (${checkIns} ${t("check-ins", "ca")})`
                      : t("Monthly", "Tháng")}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900">
                    {isHourly && checkIns > 0 && s.hourly_rate_vnd != null
                      ? `${checkIns} × ${fmt(s.hourly_rate_vnd)} = ${fmt(s.monthly_salary)}`
                      : fmt(s.monthly_salary)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700">{fmt(s.sales_mtd)}</td>
                  <td className="py-3 px-4 text-right text-slate-700">
                    {fmt(s.variable_pay)}
                    <span className="text-xs text-slate-400 block">{s.variable_source}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">{fmt(s.line_total)}</td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => {
                        const line = data.payroll_lines.find((x) => x.staff_id === s.staff_id)!;
                        const rate = line.variable_source === "rate" && s.sales_mtd > 0
                          ? (line.variable_pay / s.sales_mtd).toFixed(4)
                          : "0";
                        setStaffEdit({
                          id: s.staff_id,
                          salary: String(s.monthly_salary),
                          rate,
                          compensation_type: (s.compensation_type === "hourly" ? "hourly" : "monthly") as "hourly" | "monthly",
                          hourly_rate: s.hourly_rate_vnd != null ? String(s.hourly_rate_vnd) : "0",
                        });
                      }}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      {t("Edit comp", "Sửa đãi ngộ")}
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {t(
            "Base: monthly = fixed salary; hourly = check-ins × rate (1 check-in/day). Variable = commission_rate × POS sales or summed commission.",
            "Cố định: tháng = lương cố định; theo ca = số ca × đơn giá (1 ca/ngày). Biến đổi = tỷ lệ × DS POS hoặc HH thực tế."
          )}
        </p>
      </div>

      {/* Pending reorders → finance */}
      {data.pending_reorders.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 md:p-6">
          <p className="text-sm font-semibold text-slate-800 mb-2">
            {t("Inventory restock requests", "Yêu cầu nhập hàng")}
          </p>
          <p className="text-xs text-slate-600 mb-3">
            {t(
              "Record the purchase cost when you place the order — flows into expenses and cost totals.",
              "Ghi chi phí khi đặt hàng — vào chi phí và tổng chi."
            )}
          </p>
          <ul className="space-y-2">
            {data.pending_reorders.map((r) => (
              <li
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div>
                  <span className="font-medium text-slate-900">{r.variant_label}</span>
                  <span className="text-slate-600 text-sm ml-2">×{r.quantity_requested}</span>
                  {r.note && <p className="text-xs text-slate-500">{r.note}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setReorderModal({ id: r.id, label: r.variant_label, qty: r.quantity_requested })}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-sm bg-slate-900 text-white"
                >
                  {t("Record purchase cost", "Ghi chi phí mua")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* C — Expenses */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <p className="text-sm font-semibold text-slate-800">{t(`Expenses ${getHorizonSuffix(horizon)}`, `Chi phí ${getHorizonSuffix(horizon)}`)}</p>
          <button
            type="button"
            onClick={() => setExpenseOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white w-fit"
          >
            + {t("Add expense", "Thêm chi phí")}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Date", "Ngày")}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Category", "Loại")}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Item", "Mục")}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">{t("Qty", "SL")}</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">{t("Cost", "Chi phí")}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Status", "Trạng thái")}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("Paid at", "Ngày trả")}</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t("By", "Bởi")}</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {data.expenses_list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500">
                    {t("No expenses this month.", "Chưa có chi phí tháng này.")}
                  </td>
                </tr>
              ) : (
                data.expenses_list.map((e) => {
                  const status = (e.status as string) || "pending";
                  const paidAt = e.paid_at as string | null | undefined;
                  return (
                    <tr key={String(e.id)} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 text-slate-800">{String(e.expense_date)}</td>
                      <td className="py-2 px-4 text-slate-700">{String(e.category)}</td>
                      <td className="py-2 px-4 text-slate-900 font-medium">{String(e.item_name)}</td>
                      <td className="py-2 px-4 text-right text-slate-700">{String(e.quantity)}</td>
                      <td className="py-2 px-4 text-right font-medium text-slate-900">{fmt(Number(e.cost))}</td>
                      <td className="py-2 px-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {status === "paid" ? t("Paid", "Đã trả") : t("Pending", "Chờ trả")}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-slate-600 text-xs">
                        {paidAt ? new Date(paidAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US", { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </td>
                      <td className="py-2 px-4 text-slate-600 text-xs">{String(e.created_by_name ?? "—")}</td>
                      <td className="py-2 px-4">
                        {status === "paid" ? (
                          <button
                            type="button"
                            onClick={() => markExpensePaid(String(e.id), false)}
                            className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                          >
                            {t("Undo", "Hoàn tác")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markExpensePaid(String(e.id), true)}
                            className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                          >
                            {t("Mark paid", "Đã trả")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit & history */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 space-y-4">
        <p className="text-sm font-semibold text-slate-800">{t("Audit & history", "Kiểm toán & lịch sử")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left py-2 px-3 font-semibold text-slate-700">{t("Month", "Tháng")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Revenue", "Doanh thu")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Payroll", "Lương")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Rent", "Thuê")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Expenses", "Chi khác")}</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-700">{t("Profit", "LN")}</th>
              </tr>
            </thead>
            <tbody>
              {data.months_history.map((h) => (
                <tr key={h.month_key} className="border-b border-slate-100">
                  <td className="py-2 px-3 font-medium text-slate-900">{h.month_key}</td>
                  <td className="py-2 px-3 text-right text-slate-800">{fmt(h.revenue)}</td>
                  <td className="py-2 px-3 text-right text-slate-700">{fmt(h.payroll_total)}</td>
                  <td className="py-2 px-3 text-right text-slate-700">{fmt(h.rent)}</td>
                  <td className="py-2 px-3 text-right text-slate-700">{fmt(h.expenses_total)}</td>
                  <td className="py-2 px-3 text-right font-medium text-slate-900">{fmt(h.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <label className="text-xs font-semibold text-slate-600 block mb-2">
            {t("Expense ledger by month", "Sổ chi phí theo tháng")}
          </label>
          <select
            value={auditMonth}
            onChange={(e) => setAuditMonth(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3 w-full max-w-xs"
          >
            {data.months_history.map((h) => (
              <option key={h.month_key} value={h.month_key}>
                {h.month_key}
              </option>
            ))}
          </select>
          {ledgerLoading ? (
            <p className="text-sm text-slate-500">{t("Loading ledger…", "Đang tải…")}</p>
          ) : (
            <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs min-w-[480px]">
                <thead className="sticky top-0 bg-slate-100">
                  <tr>
                    <th className="text-left py-2 px-2">{t("Date", "Ngày")}</th>
                    <th className="text-left py-2 px-2">{t("Cat.", "Loại")}</th>
                    <th className="text-left py-2 px-2">{t("Item", "Mục")}</th>
                    <th className="text-right py-2 px-2">{t("Cost", "Tiền")}</th>
                    <th className="text-left py-2 px-2">{t("Status", "TT")}</th>
                    <th className="text-left py-2 px-2">{t("Paid at", "Ngày trả")}</th>
                    <th className="text-left py-2 px-2">{t("By", "Người ghi")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((e) => {
                    const st = (e.status as string) || "pending";
                    const pa = e.paid_at as string | null | undefined;
                    return (
                    <tr key={String(e.id)} className="border-b border-slate-100">
                      <td className="py-1.5 px-2">{String(e.expense_date)}</td>
                      <td className="py-1.5 px-2">{String(e.category)}</td>
                      <td className="py-1.5 px-2">{String(e.item_name)}</td>
                      <td className="py-1.5 px-2 text-right">{fmt(Number(e.cost))}</td>
                      <td className="py-1.5 px-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${st === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {st === "paid" ? t("Paid", "Đã trả") : t("Pending", "Chờ")}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-slate-600">{pa ? new Date(pa).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US") : "—"}</td>
                      <td className="py-1.5 px-2">{String(e.created_by_name ?? "—")}</td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex flex-col sm:flex-row gap-2 items-start sm:items-end">
            <input
              type="text"
              placeholder={t("Month-close note (optional)", "Ghi chú khóa tháng")}
              value={snapNote}
              onChange={(e) => setSnapNote(e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => recordSnapshot()}
              className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white"
            >
              {t("Save month snapshot", "Lưu snapshot tháng")}
            </button>
          </div>
          {data.snapshots.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">{t("Recorded snapshots", "Snapshot đã lưu")}</p>
              <ul className="text-xs text-slate-600 space-y-1">
                {(data.snapshots as { month_key: string; profit: number; recorded_at: string; notes?: string }[]).map(
                  (s) => (
                    <li key={s.month_key}>
                      {s.month_key} · {t("profit", "LN")} {fmt(s.profit)} · {new Date(s.recorded_at).toLocaleString()}
                      {s.notes ? ` — ${s.notes}` : ""}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* Modals */}
      {expenseOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setExpenseOpen(false)}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900">{t("Add expense", "Thêm chi phí")}</h3>
            <select value={expCat} onChange={(e) => setExpCat(e.target.value as typeof expCat)} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="inventory">{t("Inventory", "Hàng hóa")}</option>
              <option value="equipment">{t("Equipment", "Thiết bị")}</option>
              <option value="misc">{t("Misc", "Khác")}</option>
            </select>
            <input placeholder={t("Item name", "Tên mục")} value={expItem} onChange={(e) => setExpItem(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <input type="number" min={1} value={expQty} onChange={(e) => setExpQty(e.target.value)} className="w-24 rounded-lg border px-3 py-2 text-sm" />
              <input placeholder={t("Cost (VND)", "Số tiền")} value={expCost} onChange={(e) => setExpCost(e.target.value)} className="flex-1 rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setExpenseOpen(false)} className="px-3 py-2 text-sm border rounded-lg">
                {t("Cancel", "Hủy")}
              </button>
              <button type="button" disabled={expSaving} onClick={() => void saveExpense()} className="px-3 py-2 text-sm bg-slate-900 text-white rounded-lg">
                {expSaving ? "…" : t("Save", "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}

      {reorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setReorderModal(null)}>
          <div className="bg-white rounded-xl border max-w-md w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">{t("Record purchase", "Ghi chi phí mua hàng")}</h3>
            <p className="text-sm text-slate-600">
              {reorderModal.label} ×{reorderModal.qty}
            </p>
            <input
              placeholder={t("Total paid (VND)", "Tổng đã trả")}
              value={reorderCost}
              onChange={(e) => setReorderCost(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setReorderModal(null)} className="px-3 py-2 text-sm border rounded-lg">
                {t("Cancel", "Hủy")}
              </button>
              <button type="button" disabled={reorderSaving} onClick={() => void saveReorderExpense()} className="px-3 py-2 text-sm bg-slate-900 text-white rounded-lg">
                {reorderSaving ? "…" : t("Save", "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}

      {cfgOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCfgOpen(false)}>
          <div className="bg-white rounded-xl border max-w-md w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">{t("Finance settings", "Cài đặt tài chính")}</h3>
            <label className="text-xs text-slate-600">{t("Monthly rent (VND)", "Tiền thuê / tháng")}</label>
            <input value={cfgRent} onChange={(e) => setCfgRent(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <label className="text-xs text-slate-600">{t("Cash on hand (runway)", "Quỹ tiền mặt")}</label>
            <input value={cfgCash} onChange={(e) => setCfgCash(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-600">{t("Rent due day (1–28)", "Ngày trả thuê")}</label>
                <input type="number" min={1} max={28} value={cfgRentDay} onChange={(e) => setCfgRentDay(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-600">{t("Payroll day (1–28)", "Ngày trả lương")}</label>
                <input type="number" min={1} max={28} value={cfgPayDay} onChange={(e) => setCfgPayDay(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCfgOpen(false)} className="px-3 py-2 text-sm border rounded-lg">
                {t("Cancel", "Hủy")}
              </button>
              <button type="button" disabled={cfgSaving} onClick={() => void saveConfig()} className="px-3 py-2 text-sm bg-slate-900 text-white rounded-lg">
                {cfgSaving ? "…" : t("Save", "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}

      {staffEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setStaffEdit(null)}>
          <div className="bg-white rounded-xl border max-w-sm w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">{t("Staff compensation", "Đãi ngộ")}</h3>
            <div>
              <label className="text-xs block mb-1">{t("Compensation type", "Loại lương")}</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={staffEdit.compensation_type === "monthly"}
                    onChange={() => setStaffEdit({ ...staffEdit, compensation_type: "monthly" })}
                  />
                  {t("Monthly", "Tháng")}
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={staffEdit.compensation_type === "hourly"}
                    onChange={() => setStaffEdit({ ...staffEdit, compensation_type: "hourly" })}
                  />
                  {t("Hourly (per check-in)", "Theo ca (mỗi check-in)")}
                </label>
              </div>
            </div>
            {staffEdit.compensation_type === "monthly" ? (
              <>
                <label className="text-xs">{t("Monthly salary (VND)", "Lương tháng")}</label>
                <input value={staffEdit.salary} onChange={(e) => setStaffEdit({ ...staffEdit, salary: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </>
            ) : (
              <>
                <label className="text-xs">{t("Pay per check-in (VND)", "Trả mỗi ca")}</label>
                <input value={staffEdit.hourly_rate} onChange={(e) => setStaffEdit({ ...staffEdit, hourly_rate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </>
            )}
            <label className="text-xs">{t("Commission rate (0–1, e.g. 0.05 = 5%)", "Tỷ lệ HH (0–1)")}</label>
            <input value={staffEdit.rate} onChange={(e) => setStaffEdit({ ...staffEdit, rate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setStaffEdit(null)} className="px-3 py-2 text-sm border rounded-lg">
                {t("Cancel", "Hủy")}
              </button>
              <button type="button" onClick={() => void saveStaffComp()} className="px-3 py-2 text-sm bg-slate-900 text-white rounded-lg">
                {t("Save", "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
