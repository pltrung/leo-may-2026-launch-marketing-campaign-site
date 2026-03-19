"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { REFUND_REASONS, type RefundReasonValue } from "@/lib/refundReasons";

type HubSection = "settings" | "refunds" | "corporate" | "birthday" | "roster";

export default function GymOperationsHub({
  adminFetch,
  locale,
}: {
  adminFetch: (input: string, init?: RequestInit) => Promise<Response>;
  locale: Locale;
}) {
  const vi = locale === "vi";
  const [section, setSection] = useState<HubSection>("settings");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [maxOcc, setMaxOcc] = useState("30");
  const [busyPct, setBusyPct] = useState("70");
  const [gbiz, setGbiz] = useState("");
  const [gmaps, setGmaps] = useState("");
  const [zalo, setZalo] = useState("");
  const [taxId, setTaxId] = useState("");
  const [eInv, setEInv] = useState("");
  const [birthdaySendMode, setBirthdaySendMode] = useState<"manual" | "campaign">("manual");
  const [firstVisitSendMode, setFirstVisitSendMode] = useState<"manual" | "campaign">("manual");
  const [allowSelfCheckinToday, setAllowSelfCheckinToday] = useState(false);
  const [allowSelfCheckinDate, setAllowSelfCheckinDate] = useState("");

  const [adjMemberId, setAdjMemberId] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState<RefundReasonValue>("other");
  const [adjustments, setAdjustments] = useState<unknown[]>([]);

  const [corp, setCorp] = useState<unknown[]>([]);
  const [bdays, setBdays] = useState<unknown[]>([]);
  const [bdHorizon, setBdHorizon] = useState("14");
  const [fvMemberId, setFvMemberId] = useState("");

  const [roster, setRoster] = useState<unknown[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; display_name: string | null; email: string | null }[]>([]);
  const [rStaff, setRStaff] = useState("");
  const [rDate, setRDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rLabel, setRLabel] = useState("09:00–15:00");

  const loadSettings = useCallback(async () => {
    const res = await adminFetch("/api/admin/gym-operations/settings");
    const d = await res.json();
    if (res.ok && d.settings) {
      setMaxOcc(String(d.settings.max_occupancy ?? 30));
      setBusyPct(String(d.settings.busy_threshold_pct ?? 70));
      setGbiz(String(d.settings.google_business_url ?? ""));
      setGmaps(String(d.settings.google_maps_url ?? ""));
      setZalo(String(d.settings.zalo_oa_url ?? ""));
      setTaxId(String(d.settings.business_tax_id ?? ""));
      setEInv(String(d.settings.e_invoice_workflow_note ?? ""));
      setBirthdaySendMode(d.settings.birthday_send_mode === "campaign" ? "campaign" : "manual");
      setFirstVisitSendMode(d.settings.first_visit_send_mode === "campaign" ? "campaign" : "manual");
      setAllowSelfCheckinToday(Boolean(d.settings.allow_self_checkin_today));
      setAllowSelfCheckinDate(String(d.settings.allow_self_checkin_date ?? ""));
    }
  }, [adminFetch]);

  const loadAdjustments = useCallback(async () => {
    const res = await adminFetch("/api/admin/gym-operations/payment-adjustments?limit=50");
    const d = await res.json();
    if (res.ok) setAdjustments(d.adjustments ?? []);
  }, [adminFetch]);

  const loadCorp = useCallback(async () => {
    const res = await adminFetch("/api/admin/gym-operations/corporate-inquiries");
    const d = await res.json();
    if (res.ok) setCorp(d.inquiries ?? []);
  }, [adminFetch]);

  const loadBirthdays = useCallback(async () => {
    const res = await adminFetch(`/api/admin/gym-operations/birthday-queue?days=${encodeURIComponent(bdHorizon)}`);
    const d = await res.json();
    if (res.ok) setBdays(d.upcoming ?? []);
  }, [adminFetch, bdHorizon]);

  const loadRoster = useCallback(async () => {
    const from = new Date();
    from.setDate(from.getDate() - 1);
    const to = new Date();
    to.setDate(to.getDate() + 21);
    const res = await adminFetch(
      `/api/admin/gym-operations/roster?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&include_staff=1`
    );
    const d = await res.json();
    if (res.ok) {
      setRoster(d.shifts ?? []);
      const dir = d.staff_directory as { id: string; display_name: string | null; email: string | null }[] | undefined;
      if (dir) setStaffList(dir);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadSettings().catch(() => {});
  }, [loadSettings]);

  useEffect(() => {
    if (section === "refunds") loadAdjustments().catch(() => {});
    if (section === "corporate") loadCorp().catch(() => {});
    if (section === "birthday") loadBirthdays().catch(() => {});
    if (section === "roster") loadRoster().catch(() => {});
  }, [section, loadAdjustments, loadCorp, loadBirthdays, loadRoster, adminFetch]);

  const saveSettings = async () => {
    setErr(null);
    setMsg(null);
    const res = await adminFetch("/api/admin/gym-operations/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_occupancy: parseInt(maxOcc, 10),
        busy_threshold_pct: parseInt(busyPct, 10),
        google_business_url: gbiz || null,
        google_maps_url: gmaps || null,
        zalo_oa_url: zalo || null,
        business_tax_id: taxId || null,
        e_invoice_workflow_note: eInv || null,
        birthday_send_mode: birthdaySendMode,
        first_visit_send_mode: firstVisitSendMode,
        allow_self_checkin_today: allowSelfCheckinToday,
        allow_self_checkin_date: allowSelfCheckinToday ? allowSelfCheckinDate : null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr((d as { error?: string }).error ?? "Save failed");
      return;
    }
    setMsg(vi ? "Đã lưu." : "Saved.");
    setTimeout(() => setMsg(null), 3000);
  };

  const addAdjustment = async () => {
    setErr(null);
    const res = await adminFetch("/api/admin/gym-operations/payment-adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: adjMemberId.trim(),
        amount_vnd: parseInt(adjAmount, 10),
        reason: adjReason,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr((d as { error?: string }).error ?? "Failed");
      return;
    }
    setAdjAmount("");
    setAdjReason("other");
    loadAdjustments();
    setMsg(vi ? "Đã ghi nhận." : "Recorded.");
    setTimeout(() => setMsg(null), 2500);
  };

  const patchCorp = async (id: string, status: string) => {
    await adminFetch("/api/admin/gym-operations/corporate-inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadCorp();
  };

  const markBirthday = async (memberId: string) => {
    await adminFetch("/api/admin/gym-operations/birthday-mark-sent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId, year: new Date().getFullYear() }),
    });
    loadBirthdays();
  };

  const markFirstVisit = async () => {
    setErr(null);
    if (!fvMemberId.trim()) return;
    const res = await adminFetch("/api/admin/gym-operations/first-visit-welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: fvMemberId.trim() }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr((d as { error?: string }).error ?? "Failed");
      return;
    }
    setFvMemberId("");
    setMsg(vi ? "Đã đánh dấu chào mừng lần đầu." : "First visit marked.");
    setTimeout(() => setMsg(null), 2500);
  };

  const addRoster = async () => {
    setErr(null);
    const res = await adminFetch("/api/admin/gym-operations/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: rStaff, roster_date: rDate, shift_label: rLabel }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr((d as { error?: string }).error ?? "Failed");
      return;
    }
    loadRoster();
  };

  const delRoster = async (id: string) => {
    await adminFetch(`/api/admin/gym-operations/roster?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    loadRoster();
  };

  const tabs: { id: HubSection; vi: string; en: string }[] = [
    { id: "settings", vi: "Cài đặt & sức chứa", en: "Settings & capacity" },
    { id: "refunds", vi: "Hoàn tiền / điều chỉnh", en: "Refunds & adjustments" },
    { id: "corporate", vi: "Doanh nghiệp / nhóm", en: "Corporate leads" },
    { id: "birthday", vi: "Sinh nhật & lần đầu", en: "Birthday & first visit" },
    { id: "roster", vi: "Lịch ca", en: "Shift roster" },
  ];

  return (
    <div className="rounded-2xl bg-slate-800/90 border border-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.8)] p-4 md:p-5 space-y-4">
      <div>
        <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-300 uppercase mb-1">
          {vi ? "Vận hành & tuân thủ" : "Operations & compliance"}
        </h3>
        <p className="text-xs text-slate-400">
          {vi
            ? "Kết nối admin ↔ dashboard: cài đặt sức chứa, VAT/hóa đơn, hoàn tiền, doanh nghiệp, sinh nhật."
            : "Links admin settings to member app: capacity, tax/invoice notes, refunds, corporate leads, birthdays."}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setSection(t.id);
              setErr(null);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
              section === t.id ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-200 hover:bg-slate-600"
            }`}
          >
            {vi ? t.vi : t.en}
          </button>
        ))}
      </div>

      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}

      {section === "settings" && (
        <div className="space-y-3 text-sm">
          <p className="text-slate-400 text-xs">
            {vi
              ? "Dashboard dùng max capacity + % để hiển thị đông/vắng. Liên kết Google Maps / Business / Zalo hiện ở footer /gym."
              : "Dashboard uses max capacity + % for busy state. Public links show on /gym footer when set."}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-slate-300">
              {vi ? "Sức chứa tối đa (ước lượng)" : "Max capacity (estimate)"}
              <input
                value={maxOcc}
                onChange={(e) => setMaxOcc(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white"
              />
            </label>
            <label className="block text-slate-300">
              {vi ? "Ngưỡng 'đông' (% capacity)" : "Busy threshold (% of max)"}
              <input
                value={busyPct}
                onChange={(e) => setBusyPct(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white"
              />
            </label>
          </div>
          <label className="block text-slate-300">
            Google Business URL
            <input value={gbiz} onChange={(e) => setGbiz(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs" />
          </label>
          <label className="block text-slate-300">
            Google Maps URL
            <input value={gmaps} onChange={(e) => setGmaps(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs" />
          </label>
          <label className="block text-slate-300">
            Zalo OA / chat URL
            <input value={zalo} onChange={(e) => setZalo(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs" />
          </label>
          <label className="block text-slate-300">
            {vi ? "Mã số thuế / MST (ghi chú)" : "Business tax ID (reference)"}
            <input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs" />
          </label>
          <label className="block text-slate-300">
            {vi ? "Quy trình hóa đơn điện tử (SOP nội bộ)" : "E-invoice workflow (internal SOP)"}
            <textarea
              value={eInv}
              onChange={(e) => setEInv(e.target.value)}
              rows={4}
              className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs"
              placeholder={vi ? "Ví dụ: Xuất qua phần mềm X, ký số…" : "e.g. Issue via software X, signing…"}
            />
          </label>
          <div className="space-y-2 pt-2 border-t border-slate-600">
            <p className="text-xs text-slate-400">{vi ? "Sinh nhật & chào mừng lần đầu: gửi thủ công tại tab bên dưới hoặc dùng campaign trong Analytics." : "Birthday & first-visit: send manually in tab below or use Analytics campaigns."}</p>
            <label className="block text-slate-300">
              {vi ? "Sinh nhật" : "Birthday"}
              <select value={birthdaySendMode} onChange={(e) => setBirthdaySendMode(e.target.value as "manual" | "campaign")} className="mt-1 block w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs">
                <option value="manual">{vi ? "Thủ công (đánh dấu ở tab Sinh nhật)" : "Manual (mark sent in Birthday tab)"}</option>
                <option value="campaign">{vi ? "Campaign (Analytics → segment 'Sinh nhật trong tuần')" : "Campaign (Analytics → segment 'Birthday this week')"}</option>
              </select>
            </label>
            <label className="block text-slate-300">
              {vi ? "Chào mừng lần đầu" : "First visit welcome"}
              <select value={firstVisitSendMode} onChange={(e) => setFirstVisitSendMode(e.target.value as "manual" | "campaign")} className="mt-1 block w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs">
                <option value="manual">{vi ? "Thủ công (đánh dấu ở tab)" : "Manual (mark in tab)"}</option>
                <option value="campaign">{vi ? "Campaign (Analytics → segment 'Lần đầu chưa chào mừng')" : "Campaign (Analytics → segment 'First visit not welcomed')"}</option>
              </select>
            </label>
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
              <p className="text-xs text-amber-200 font-medium">
                {vi ? "Khẩn cấp check-in" : "Emergency check-in"}
              </p>
              <p className="text-xs text-slate-300">
                {vi
                  ? "Chỉ bật khi QR/quầy gặp sự cố. Staff/frontdesk có thể tự check-in trong ngày đã chọn."
                  : "Enable only when QR/front desk check-in fails. Staff/frontdesk can self check-in for the selected day."}
              </p>
              <label className="inline-flex items-center gap-2 text-slate-200 text-xs">
                <input
                  type="checkbox"
                  checked={allowSelfCheckinToday}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setAllowSelfCheckinToday(next);
                    if (next && !allowSelfCheckinDate) {
                      setAllowSelfCheckinDate(new Date().toISOString().slice(0, 10));
                    }
                  }}
                />
                {vi ? "Cho phép tự check-in" : "Allow self check-in"}
              </label>
              <label className="block text-slate-300 text-xs">
                {vi ? "Ngày áp dụng" : "Effective date"}
                <input
                  type="date"
                  value={allowSelfCheckinDate}
                  onChange={(e) => setAllowSelfCheckinDate(e.target.value)}
                  disabled={!allowSelfCheckinToday}
                  className="mt-1 w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white disabled:opacity-50"
                />
              </label>
            </div>
          </div>
          <button type="button" onClick={saveSettings} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500">
            {vi ? "Lưu cài đặt" : "Save settings"}
          </button>
        </div>
      )}

      {section === "refunds" && (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-slate-400">
            {vi
              ? "Ghi nhận hoàn tiền / điều chỉnh (số âm = hoàn). Không tự động sửa membership — dùng cùng quy trình gia hạn thủ công nếu cần."
              : "Log refunds/credits (negative VND = refund). Does not auto-change membership — reconcile manually if needed."}
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            <input
              placeholder="member_id (uuid)"
              value={adjMemberId}
              onChange={(e) => setAdjMemberId(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs"
            />
            <input
              placeholder={vi ? "Số tiền VND (- hoàn → credit)" : "Amount VND (- refund → credit)"}
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs"
            />
            <select value={adjReason} onChange={(e) => setAdjReason(e.target.value as RefundReasonValue)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs w-full">
              {REFUND_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{vi ? r.labelVi : r.labelEn}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={addAdjustment} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium">
            {vi ? "Ghi nhận" : "Record"}
          </button>
          <ul className="text-xs text-slate-300 space-y-1 max-h-48 overflow-y-auto border border-slate-700 rounded-lg p-2">
            {(adjustments as { id: string; amount_vnd: number; reason: string; created_at: string }[]).map((a) => (
              <li key={a.id}>
                {new Date(a.created_at).toLocaleString()} · {a.amount_vnd.toLocaleString()}đ · {a.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {section === "corporate" && (
        <div className="space-y-2 text-sm">
          <p className="text-xs text-slate-400">
            {vi ? "Form công khai: POST /api/gym/corporate-interest (trang /gym)." : "Public form posts to /api/gym/corporate-interest from /gym."}
          </p>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {(corp as { id: string; company_name: string; contact_name: string; email: string; phone: string; status: string; created_at: string }[]).map((c) => (
              <li key={c.id} className="border border-slate-700 rounded-lg p-2 text-xs text-slate-200">
                <div className="font-medium">{c.company_name}</div>
                <div>{c.contact_name}</div>
                <div className="text-slate-400">{c.email} · {c.phone}</div>
                <div className="mt-1 flex gap-1">
                  <span className="text-slate-500">{c.status}</span>
                  {c.status !== "contacted" && (
                    <button type="button" className="text-emerald-400" onClick={() => patchCorp(c.id, "contacted")}>
                      {vi ? "Đã liên hệ" : "Contacted"}
                    </button>
                  )}
                  {c.status !== "closed" && (
                    <button type="button" className="text-slate-400" onClick={() => patchCorp(c.id, "closed")}>
                      {vi ? "Đóng" : "Close"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {section === "birthday" && (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-slate-400">
            {vi
              ? "Danh sách sinh nhật sắp tới (theo timezone gym). Nhấn 'Đã gửi' sau khi nhắn Zalo/SMS thủ công. Cron tóm tắt: GET /api/cron/gym-ops-digest?secret=CRON_SECRET"
              : "Upcoming birthdays (gym TZ). Mark sent after manual Zalo/SMS. Ops digest: GET /api/cron/gym-ops-digest?secret=CRON_SECRET"}
          </p>
          <div className="flex gap-2 items-center">
            <input
              value={bdHorizon}
              onChange={(e) => setBdHorizon(e.target.value)}
              className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-600 text-white text-xs"
            />
            <span className="text-slate-400 text-xs">{vi ? "ngày tới" : "days ahead"}</span>
            <button type="button" onClick={() => loadBirthdays()} className="text-xs text-emerald-400">
              {vi ? "Tải lại" : "Refresh"}
            </button>
          </div>
          <ul className="space-y-1 max-h-48 overflow-y-auto text-xs">
            {(bdays as { id: string; full_name: string; nextOccurrenceYmd: string; birthday_message_sent_year: number | null }[]).map((b) => (
              <li key={b.id} className="flex justify-between gap-2 border-b border-slate-700 py-1">
                <span>
                  {b.full_name} · {b.nextOccurrenceYmd}
                  {b.birthday_message_sent_year ? ` · ✓ ${b.birthday_message_sent_year}` : ""}
                </span>
                <button type="button" className="text-emerald-400 shrink-0" onClick={() => markBirthday(b.id)}>
                  {vi ? "Đã gửi" : "Mark sent"}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-700 pt-3 mt-2">
            <p className="text-xs text-slate-400 mb-2">{vi ? "Đánh dấu chào mừng lần đầu (hiển thị cho member)" : "Mark first-visit welcome (syncs to member record)"}</p>
            <div className="flex gap-2">
              <input
                placeholder="member_id"
                value={fvMemberId}
                onChange={(e) => setFvMemberId(e.target.value)}
                className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-600 text-white text-xs"
              />
              <button type="button" onClick={markFirstVisit} className="px-3 py-1 rounded bg-slate-600 text-white text-xs">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {section === "roster" && (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2 items-end">
            <select value={rStaff} onChange={(e) => setRStaff(e.target.value)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs">
              <option value="">{vi ? "Chọn staff" : "Staff"}</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name || s.email || s.id}
                </option>
              ))}
            </select>
            <input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs" />
            <input value={rLabel} onChange={(e) => setRLabel(e.target.value)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-xs w-36" />
            <button type="button" onClick={addRoster} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs">
              {vi ? "Thêm ca" : "Add shift"}
            </button>
          </div>
          <ul className="text-xs text-slate-300 space-y-1 max-h-56 overflow-y-auto">
            {(roster as { id: string; staff_id: string; roster_date: string; shift_label: string }[]).map((s) => (
              <li key={s.id} className="flex justify-between border-b border-slate-700 py-1">
                <span>
                  {s.roster_date} · {s.shift_label} · {s.staff_id.slice(0, 8)}…
                </span>
                <button type="button" className="text-red-400" onClick={() => delRoster(s.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
