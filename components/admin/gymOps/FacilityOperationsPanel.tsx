"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type Sub = "incidents" | "maintenance" | "inspections";

export default function FacilityOperationsPanel({
  adminFetch,
  locale,
}: {
  adminFetch: (input: string, init?: RequestInit) => Promise<Response>;
  locale: Locale;
}) {
  const vi = locale === "vi";
  const [sub, setSub] = useState<Sub>("incidents");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [incidents, setIncidents] = useState<unknown[]>([]);
  const [incTitle, setIncTitle] = useState("");
  const [incDesc, setIncDesc] = useState("");
  const [incSev, setIncSev] = useState("medium");

  const [tasks, setTasks] = useState<unknown[]>([]);
  const [mtTitle, setMtTitle] = useState("");
  const [mtCat, setMtCat] = useState("hvac");
  const [mtDesc, setMtDesc] = useState("");

  const [logs, setLogs] = useState<unknown[]>([]);
  const [inspType, setInspType] = useState("daily_mats");
  const [inspNotes, setInspNotes] = useState("");

  const loadInc = useCallback(async () => {
    const res = await adminFetch("/api/admin/gym-operations/incidents");
    const d = await res.json();
    if (res.ok) setIncidents(d.incidents ?? []);
  }, [adminFetch]);

  const loadMaint = useCallback(async () => {
    const res = await adminFetch("/api/admin/gym-operations/maintenance");
    const d = await res.json();
    if (res.ok) setTasks(d.tasks ?? []);
  }, [adminFetch]);

  const loadInsp = useCallback(async () => {
    const res = await adminFetch("/api/admin/gym-operations/inspections");
    const d = await res.json();
    if (res.ok) setLogs(d.logs ?? []);
  }, [adminFetch]);

  useEffect(() => {
    if (sub === "incidents") loadInc().catch(() => {});
    if (sub === "maintenance") loadMaint().catch(() => {});
    if (sub === "inspections") loadInsp().catch(() => {});
  }, [sub, loadInc, loadMaint, loadInsp]);

  const addIncident = async () => {
    setErr(null);
    const res = await adminFetch("/api/admin/gym-operations/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: incTitle.trim(), description: incDesc.trim(), severity: incSev }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr((d as { error?: string }).error ?? "Failed");
      return;
    }
    setIncTitle("");
    setIncDesc("");
    setMsg(vi ? "Đã ghi nhận sự cố." : "Incident logged.");
    loadInc();
    setTimeout(() => setMsg(null), 2500);
  };

  const closeIncident = async (id: string) => {
    await adminFetch("/api/admin/gym-operations/incidents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "closed" }),
    });
    loadInc();
  };

  const addMaint = async () => {
    setErr(null);
    const res = await adminFetch("/api/admin/gym-operations/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: mtTitle.trim(), category: mtCat, description: mtDesc.trim() || null }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr((d as { error?: string }).error ?? "Failed");
      return;
    }
    setMtTitle("");
    setMtDesc("");
    loadMaint();
  };

  const patchMaint = async (id: string, status: string) => {
    await adminFetch("/api/admin/gym-operations/maintenance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadMaint();
  };

  const addInsp = async () => {
    setErr(null);
    const res = await adminFetch("/api/admin/gym-operations/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspection_type: inspType, notes: inspNotes.trim() || null }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr((d as { error?: string }).error ?? "Failed");
      return;
    }
    setInspNotes("");
    loadInsp();
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-3">
      <p className="text-sm text-slate-600">
        {vi
          ? "An toàn & cơ sở (khác reset tường). Ghi nhận sự cố, bảo trì thiết bị/CSH, kiểm tra mat hàng ngày."
          : "Safety & facility (separate from route resets). Incidents, building/equipment maintenance, mat checks."}
      </p>
      <div className="flex flex-wrap gap-1">
        {(
          [
            ["incidents", vi ? "Sự cố" : "Incidents"],
            ["maintenance", vi ? "Bảo trì" : "Maintenance"],
            ["inspections", vi ? "Kiểm tra thiết bị" : "Inspections"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setSub(k);
              setErr(null);
            }}
            className={`px-2 py-1 rounded text-xs font-medium ${
              sub === k ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {sub === "incidents" && (
        <div className="space-y-2 text-sm">
          <div className="grid gap-2">
            <input
              placeholder={vi ? "Tiêu đề" : "Title"}
              value={incTitle}
              onChange={(e) => setIncTitle(e.target.value)}
              className="px-2 py-1.5 rounded border border-slate-300"
            />
            <textarea
              placeholder={vi ? "Mô tả chi tiết" : "Description"}
              value={incDesc}
              onChange={(e) => setIncDesc(e.target.value)}
              rows={3}
              className="px-2 py-1.5 rounded border border-slate-300 text-xs"
            />
            <select value={incSev} onChange={(e) => setIncSev(e.target.value)} className="px-2 py-1.5 rounded border border-slate-300 w-40">
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
            <button type="button" onClick={addIncident} className="w-fit px-3 py-1.5 rounded bg-red-600 text-white text-xs">
              {vi ? "Ghi sự cố" : "Log incident"}
            </button>
          </div>
          <ul className="text-xs space-y-2 max-h-64 overflow-y-auto">
            {(incidents as { id: string; title: string; severity: string; status: string; created_at: string }[]).map((i) => (
              <li key={i.id} className="border border-slate-200 rounded p-2 bg-white flex justify-between gap-2">
                <span>
                  <span className="font-medium">{i.title}</span> ({i.severity}) · {i.status}
                  <br />
                  <span className="text-slate-500">{new Date(i.created_at).toLocaleString()}</span>
                </span>
                {i.status === "open" && (
                  <button type="button" className="text-emerald-700 shrink-0 text-xs" onClick={() => closeIncident(i.id)}>
                    {vi ? "Đóng" : "Close"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sub === "maintenance" && (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <input value={mtTitle} onChange={(e) => setMtTitle(e.target.value)} placeholder={vi ? "Công việc" : "Task"} className="px-2 py-1.5 rounded border border-slate-300 flex-1 min-w-[120px]" />
            <select value={mtCat} onChange={(e) => setMtCat(e.target.value)} className="px-2 py-1.5 rounded border border-slate-300">
              <option value="hvac">HVAC</option>
              <option value="electrical">Electrical</option>
              <option value="plumbing">Plumbing</option>
              <option value="structure">Structure</option>
              <option value="general">General</option>
            </select>
          </div>
          <textarea value={mtDesc} onChange={(e) => setMtDesc(e.target.value)} placeholder={vi ? "Chi tiết" : "Details"} rows={2} className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs" />
          <button type="button" onClick={addMaint} className="px-3 py-1.5 rounded bg-slate-800 text-white text-xs">
            {vi ? "Thêm" : "Add"}
          </button>
          <ul className="text-xs space-y-1 max-h-56 overflow-y-auto">
            {(tasks as { id: string; title: string; status: string; category: string }[]).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 border-b border-slate-200 py-1">
                <span>
                  {t.title} · {t.category} · {t.status}
                </span>
                {t.status !== "done" && (
                  <>
                    <button type="button" className="text-blue-700" onClick={() => patchMaint(t.id, "in_progress")}>
                      {vi ? "Đang làm" : "Progress"}
                    </button>
                    <button type="button" className="text-emerald-700" onClick={() => patchMaint(t.id, "done")}>
                      {vi ? "Xong" : "Done"}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sub === "inspections" && (
        <div className="space-y-2 text-sm">
          <select value={inspType} onChange={(e) => setInspType(e.target.value)} className="px-2 py-1.5 rounded border border-slate-300">
            <option value="daily_mats">{vi ? "Mat hàng ngày" : "Daily mats"}</option>
            <option value="weekly_hardware">{vi ? "Phần cứng tường (tuần)" : "Wall hardware (weekly)"}</option>
            <option value="monthly_ppe">{vi ? "PPE / đồ cứu hộ" : "PPE / safety gear"}</option>
          </select>
          <textarea value={inspNotes} onChange={(e) => setInspNotes(e.target.value)} placeholder={vi ? "Ghi chú / checklist" : "Notes / checklist"} rows={3} className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs" />
          <button type="button" onClick={addInsp} className="px-3 py-1.5 rounded bg-emerald-700 text-white text-xs">
            {vi ? "Lưu phiên kiểm tra" : "Save inspection"}
          </button>
          <ul className="text-xs text-slate-600 max-h-48 overflow-y-auto space-y-1">
            {(logs as { id: string; inspection_type: string; notes: string | null; created_at: string }[]).map((l) => (
              <li key={l.id}>
                {new Date(l.created_at).toLocaleString()} · {l.inspection_type}
                {l.notes ? ` — ${l.notes}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
