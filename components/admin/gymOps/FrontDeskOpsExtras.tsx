"use client";

import React, { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

export default function FrontDeskOpsExtras({
  adminFetch,
  locale,
  onOpenWalkInMemberForm,
  gymDateYmd,
}: {
  adminFetch: (input: string, init?: RequestInit) => Promise<Response>;
  locale: Locale;
  onOpenWalkInMemberForm: () => void;
  gymDateYmd: string;
}) {
  const vi = locale === "vi";
  const [cashExp, setCashExp] = useState("");
  const [cashCnt, setCashCnt] = useState("");
  const [variance, setVariance] = useState("");
  const [digital, setDigital] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [recent, setRecent] = useState<{ id: string; gym_date: string; cash_counted_vnd: number; created_at: string }[]>([]);

  const loadRecent = () => {
    adminFetch("/api/admin/gym-operations/shift-close?limit=8")
      .then((r) => r.json())
      .then((d) => setRecent(d.closes ?? []))
      .catch(() => setRecent([]));
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const submitClose = async () => {
    setErr(null);
    setMsg(null);
    const res = await adminFetch("/api/admin/gym-operations/shift-close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gym_date: gymDateYmd,
        cash_expected_vnd: parseInt(cashExp, 10) || 0,
        cash_counted_vnd: parseInt(cashCnt, 10) || 0,
        variance_notes: variance.trim() || null,
        digital_sales_note: digital.trim() || null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr((d as { error?: string }).error ?? "Failed");
      return;
    }
    setMsg(vi ? "Đã lưu chốt ca." : "Shift close saved.");
    setCashExp("");
    setCashCnt("");
    setVariance("");
    setDigital("");
    loadRecent();
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 md:p-4">
        <h4 className="text-xs font-semibold text-amber-200 uppercase tracking-wider mb-2">
          {vi ? "Khách walk-in / vé ngày tại quầy" : "Walk-in / desk day pass"}
        </h4>
        <ol className="text-[11px] md:text-xs text-slate-300 space-y-1.5 list-decimal list-inside mb-3">
          <li>{vi ? "Tạo tài khoản nhanh (tab Thành viên) nếu chưa có app." : "Create quick account (Member tab) if they have no app."}</li>
          <li>{vi ? "Thu tiền (tiền mặt / QR) và xác nhận thanh toán gói day_pass." : "Collect payment and confirm day_pass."}</li>
          <li>{vi ? "Check-in QR sau khi waiver + profile đủ (hoặc quét USB)." : "Check in via QR once waiver + profile are complete."}</li>
        </ol>
        <button
          type="button"
          onClick={onOpenWalkInMemberForm}
          className="w-full py-2 rounded-lg bg-amber-500/90 text-slate-900 text-xs font-bold hover:bg-amber-400"
        >
          {vi ? "Mở form thành viên mới" : "Open new member form"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-600 bg-slate-800/80 p-3 md:p-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          {vi ? "Chốt ca (tiền mặt & ghi chú POS)" : "End of shift (cash & POS notes)"}
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="text-slate-400">
            {vi ? "Tiền mặt dự kiến (VND)" : "Cash expected (VND)"}
            <input value={cashExp} onChange={(e) => setCashExp(e.target.value)} className="mt-0.5 w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-white" />
          </label>
          <label className="text-slate-400">
            {vi ? "Đếm thực tế (VND)" : "Counted (VND)"}
            <input value={cashCnt} onChange={(e) => setCashCnt(e.target.value)} className="mt-0.5 w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-white" />
          </label>
        </div>
        <textarea
          value={variance}
          onChange={(e) => setVariance(e.target.value)}
          placeholder={vi ? "Lệch / lý do" : "Variance / notes"}
          rows={2}
          className="mt-2 w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-white text-xs"
        />
        <textarea
          value={digital}
          onChange={(e) => setDigital(e.target.value)}
          placeholder={vi ? "MoMo / ZaloPay / VNPay trong ca…" : "MoMo / ZaloPay / VNPay totals in shift…"}
          rows={2}
          className="mt-1 w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-white text-xs"
        />
        <button type="button" onClick={submitClose} className="mt-2 w-full py-2 rounded-lg bg-slate-600 text-white text-xs font-medium hover:bg-slate-500">
          {vi ? "Lưu chốt ca" : "Save shift close"}
        </button>
        {msg && <p className="mt-2 text-xs text-emerald-400">{msg}</p>}
        {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
        <ul className="mt-2 text-[10px] text-slate-500 space-y-0.5 max-h-20 overflow-y-auto">
          {recent.map((c) => (
            <li key={c.id}>
              {c.gym_date} · {c.cash_counted_vnd.toLocaleString()} VND
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
