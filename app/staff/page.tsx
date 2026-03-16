"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import { getGymToday, getGymDateFromISO } from "@/lib/gymTimezone";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useRouteSetterAuth } from "@/components/route-setter/RouteSetterAuthContext";
import RouteSetterLoginForm from "@/components/route-setter/RouteSetterLoginForm";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  { ssr: false }
);

const STAFF_LOCALE_KEY = "staff-locale";

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const s = localStorage.getItem(STAFF_LOCALE_KEY);
  return s === "en" || s === "vi" ? s : "en";
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  created_at: string;
}

interface CoachingSession {
  id: string;
  start_time: string;
  end_time: string;
  coach_id: string | null;
  session_type: string;
  status: string;
  location?: string;
  newbie_count?: number;
  staff_profiles?: { email?: string; display_name?: string } | { email?: string; display_name?: string }[] | null;
}

interface RouteZone {
  id: string;
  name: string;
  reset_frequency_days: number;
  last_reset_at: string | null;
  next_reset_at: string | null;
  status: "overdue" | "due" | "recent" | "upcoming";
}

type TaskStatus = "upcoming" | "pending" | "completed" | "overdue";

interface StaffTask {
  id: string;
  title: string;
  description: string | null;
  block: "pre_open" | "during_hours" | "closing";
  start_time: string | null;
  due_time: string | null;
  status: TaskStatus;
  completed_at: string | null;
  completed_by_name?: string | null;
  completers?: string[];
}

export default function StaffPage() {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    setLocale(getStoredLocale());
  }, []);
  const setLocaleAndStore = useCallback((l: Locale) => {
    setLocale(l);
    if (typeof window !== "undefined") localStorage.setItem(STAFF_LOCALE_KEY, l);
  }, []);

  const m = getMessages(locale).staff;
  const { staff, loading, staffFetch, signOut, refreshStaff } = useRouteSetterAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [mySessions, setMySessions] = useState<CoachingSession[]>([]);
  const [unassignedSessions, setUnassignedSessions] = useState<CoachingSession[]>([]);
  const [zones, setZones] = useState<RouteZone[]>([]);
  const [overdueZones, setOverdueZones] = useState<RouteZone[]>([]);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [preOpenTasks, setPreOpenTasks] = useState<StaffTask[]>([]);
  const [duringTasks, setDuringTasks] = useState<StaffTask[]>([]);
  const [closingTasks, setClosingTasks] = useState<StaffTask[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [resettingZoneId, setResettingZoneId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [staffTab, setStaffTab] = useState<"routes" | "coaching">("routes");
  const [completedTasksExpanded, setCompletedTasksExpanded] = useState(false);
  const [teamCompletions, setTeamCompletions] = useState<{ staff_name: string; task_title: string; completed_at: string }[]>([]);

  const loadAttendance = useCallback(async () => {
    const res = await staffFetch("/api/route-setter/attendance");
    const data = await res.json();
    if (res.ok) setAttendance(data.attendance ?? null);
  }, [staffFetch]);

  const loadSessions = useCallback(async () => {
    const res = await staffFetch("/api/route-setter/sessions");
    const data = await res.json();
    if (res.ok) {
      setSessions(data.sessions ?? []);
      setMySessions(data.my_sessions ?? []);
      setUnassignedSessions(data.unassigned ?? []);
    }
  }, [staffFetch]);

  const loadZones = useCallback(async () => {
    const res = await staffFetch("/api/route-setter/zones");
    const data = await res.json();
    if (res.ok) {
      setZones(data.zones ?? []);
      setOverdueZones(data.overdue ?? []);
    }
  }, [staffFetch]);

  const loadTasks = useCallback(async () => {
    const res = await staffFetch("/api/route-setter/tasks");
    const data = await res.json();
    if (res.ok) {
      setTasks(data.tasks ?? []);
      setPreOpenTasks(data.preOpen ?? []);
      setDuringTasks(data.during ?? []);
      setClosingTasks(data.closing ?? []);
      setTeamCompletions(data.teamCompletions ?? []);
    }
  }, [staffFetch]);

  useEffect(() => {
    if (!staff) return;
    loadAttendance();
    loadSessions();
    loadZones();
    loadTasks();
  }, [staff, loadAttendance, loadSessions, loadZones, loadTasks]);

  // Realtime: when admin scans staff QR, staff_attendance is upserted → update UI without refresh
  useEffect(() => {
    if (!staff?.id) return;
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      return;
    }
    const channel = supabase
      .channel(`staff-attendance-${staff.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff_attendance",
          filter: `staff_id=eq.${staff.id}`,
        },
        () => {
          loadAttendance();
          loadSessions();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [staff?.id, loadAttendance, loadSessions]);

  useEffect(() => {
    if (staff?.display_name != null) setProfileName(staff.display_name);
    else if (staff?.email) setProfileName(staff.email.split("@")[0] || "");
  }, [staff?.display_name, staff?.email]);

  // Fetch a short-lived QR token for staff attendance; prevents screenshot reuse.
  // This effect depends on hasAttendanceForToday, which is computed below; TypeScript
  // requires the dependency to be added after declaration, so the hook order must stay consistent.

  const handleSaveProfile = useCallback(async () => {
    setProfileSaving(true);
    setError(null);
    try {
      const res = await staffFetch("/api/route-setter/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: profileName.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || m.failedUpdate);
      setProfileEditing(false);
      refreshStaff();
    } catch (e) {
      setError(e instanceof Error ? e.message : m.failedUpdate);
    } finally {
      setProfileSaving(false);
    }
  }, [staffFetch, profileName, refreshStaff, m.failedUpdate]);

  const handleAttendance = useCallback(
    async (status: "IN" | "NOT_IN") => {
      setAttendanceLoading(true);
      setError(null);
      try {
        const res = await staffFetch("/api/route-setter/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        await loadAttendance();
        await loadSessions();
      } catch (e) {
        setError(e instanceof Error ? e.message : m.failedAttendance);
      } finally {
        setAttendanceLoading(false);
      }
    },
    [staffFetch, loadAttendance, loadSessions, m.failedAttendance]
  );

  const handleAssignSession = useCallback(
    async (sessionId: string) => {
      setAssigningId(sessionId);
      setError(null);
      try {
        const res = await staffFetch("/api/route-setter/sessions/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        await loadSessions();
      } catch (e) {
        setError(e instanceof Error ? e.message : m.failedAssign);
      } finally {
        setAssigningId(null);
      }
    },
    [staffFetch, loadSessions, m.failedAssign]
  );

  const handleZoneReset = useCallback(
    async (zoneId: string) => {
      setResettingZoneId(zoneId);
      setError(null);
      try {
        const res = await staffFetch(`/api/route-setter/zones/${zoneId}/reset`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        await loadZones();
      } catch (e) {
        setError(e instanceof Error ? e.message : m.failedReset);
      } finally {
        setResettingZoneId(null);
      }
    },
    [staffFetch, loadZones, m.failedReset]
  );

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      setCompletingTaskId(taskId);
      setError(null);
      try {
        const res = await staffFetch(`/api/route-setter/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
        if (!res.ok) throw new Error("Failed");
        await loadTasks();
      } catch {
        setError(m.failedTask);
      } finally {
        setCompletingTaskId(null);
      }
    },
    [staffFetch, loadTasks, m.failedTask]
  );

  // Fetch a short-lived QR token for staff attendance; prevents screenshot reuse.
  useEffect(() => {
    if (!staff) {
      setQrToken(null);
      return;
    }
    // hasAttendanceForToday is derived later; avoid fetching tokens when we already checked in.
    if (attendance && attendance.date === getGymToday()) {
      setQrToken(null);
      return;
    }
    let cancelled = false;
    const fetchToken = async () => {
      try {
        const res = await staffFetch("/api/route-setter/qr-token");
        const data = await res.json();
        if (!cancelled && res.ok && data?.token) {
          setQrToken(data.token as string);
        }
      } catch {
        if (!cancelled) setQrToken(null);
      }
    };
    fetchToken();
    const id = window.setInterval(fetchToken, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [staff, attendance, staffFetch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">{m.loading}</p>
      </div>
    );
  }

  if (!staff) {
    return <RouteSetterLoginForm locale={locale} onLocaleChange={setLocaleAndStore} />;
  }

  const today = getGymToday();
  const hasAttendanceForToday = attendance != null && attendance.date === today;
  const isIn = hasAttendanceForToday && attendance.status === "IN";
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit", hour12: locale === "en" });
  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" }) : "—";

  // Current time window: 9:00–10:00 pre_open, 10:00–22:00 during_hours, 22:00–23:00 closing (gym TZ)
  const getCurrentBlock = (): "pre_open" | "during_hours" | "closing" => {
    const t = new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Los_Angeles" });
    const [h, m] = t.slice(0, 5).split(":").map(Number);
    const mins = h * 60 + m;
    if (mins >= 9 * 60 && mins < 10 * 60) return "pre_open";
    if (mins >= 10 * 60 && mins < 22 * 60) return "during_hours";
    if (mins >= 22 * 60 && mins < 23 * 60) return "closing";
    return "during_hours";
  };
  const currentBlock = getCurrentBlock();
  const rawActiveTasks = currentBlock === "pre_open" ? preOpenTasks : currentBlock === "closing" ? closingTasks : duringTasks;
  const isRouteResetDay = zones.some((z) => z.status === "overdue" || (z.next_reset_at && getGymDateFromISO(z.next_reset_at) === today));
  const isEssentialTask = (title: string): boolean => {
    const lower = title.toLowerCase();
    return /anchor|crash|rental|shoe|front desk|pos|bathroom|safety|check bathroom/i.test(lower);
  };
  const activeTasks = isRouteResetDay ? rawActiveTasks.filter((t) => isEssentialTask(t.title)) : rawActiveTasks;
  const overdueTasksList = [...preOpenTasks, ...duringTasks, ...closingTasks].filter((t) => t.status === "overdue");
  const activePending = activeTasks.filter((t) => t.status === "pending");
  const activeCompleted = activeTasks.filter((t) => t.status === "completed");
  const phaseLabel = currentBlock === "pre_open" ? m.phasePreOpen : currentBlock === "closing" ? m.phaseClosing : m.phaseGymOpen;
  const phaseTimeWindow = currentBlock === "pre_open" ? m.timeWindow : currentBlock === "closing" ? m.timeWindowClosing : m.timeWindowOpen;
  const minutesOverdue = (t: StaffTask): number => {
    if (!t.due_time) return 0;
    const due = String(t.due_time).slice(0, 5);
    const [dh, dm] = due.split(":").map(Number);
    const now = new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Los_Angeles" }).slice(0, 5);
    const [nh, nm] = now.split(":").map(Number);
    return (nh * 60 + nm) - (dh * 60 + dm);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/95 backdrop-blur px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/logo-white.svg" alt="Leo Mây logo" className="h-7 w-auto" />
          <h1 className="text-lg font-semibold text-white">{m.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-full border border-slate-600 bg-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setLocaleAndStore("en")}
              className={`px-2 py-1 rounded-full text-xs font-medium ${locale === "en" ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-slate-200"}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocaleAndStore("vi")}
              className={`px-2 py-1 rounded-full text-xs font-medium ${locale === "vi" ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-slate-200"}`}
            >
              VN
            </button>
          </div>
          <span className="text-slate-300 text-sm truncate max-w-[140px]">
            {staff.display_name || staff.email}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
          >
            {m.signOut}
          </button>
        </div>
      </header>

      <main className="p-4 pb-8 space-y-6 max-w-2xl mx-auto">
        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-700 text-red-200 text-sm px-4 py-2">
            {error}
          </div>
        )}

        {/* Not checked in for today: show only QR + Not working (no profile, no dashboard) */}
        {!hasAttendanceForToday && (
          <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
              {m.dailyAttendance}
            </h2>
            <p className="text-slate-200 font-medium mb-1">{m.checkInAtFrontDesk}</p>
            <p className="text-slate-400 text-sm mb-4">{m.checkInAtFrontDeskHint}</p>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl bg-white p-3 inline-block">
                {qrToken ? <QRCodeSVG value={qrToken} size={180} level="M" /> : null}
              </div>
              <button
                type="button"
                disabled={attendanceLoading}
                onClick={() => handleAttendance("NOT_IN")}
                className="w-full max-w-xs py-2.5 rounded-lg font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50"
              >
                {m.notWorkingToday}
              </button>
            </div>
          </section>
        )}

        {/* Checked in as NOT working today: only show message, no QR no dashboard */}
        {hasAttendanceForToday && !isIn && (
          <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
              {m.dailyAttendance}
            </h2>
            <p className="text-slate-400">{m.youAreMarkedNotWorking}</p>
          </section>
        )}

        {/* Checked in (IN): show full dashboard — no QR, profile + tasks + zones + sessions */}
        {isIn && (
          <>
            <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                {m.profile}
              </h2>
              {profileEditing ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder={m.yourNamePlaceholder}
                    className="flex-1 min-w-[160px] px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    disabled={profileSaving}
                    onClick={handleSaveProfile}
                    className="px-3 py-2 rounded-lg bg-amber-600 text-slate-900 text-sm font-medium hover:bg-amber-500 disabled:opacity-50"
                  >
                    {profileSaving ? "…" : m.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setProfileEditing(false); setProfileName(staff.display_name ?? staff.email?.split("@")[0] ?? ""); }}
                    className="px-3 py-2 rounded-lg bg-slate-600 text-slate-200 text-sm hover:bg-slate-500"
                  >
                    {m.cancel}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-slate-200">
                    <span className="text-slate-400 text-sm">{m.nameShownAsCoach} </span>
                    <strong>{staff.display_name || m.notSet}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setProfileEditing(true)}
                    className="text-xs px-2 py-1.5 rounded bg-slate-600 text-slate-200 hover:bg-slate-500"
                  >
                    {staff.display_name ? m.editName : m.setName}
                  </button>
                </div>
              )}
              <p className="text-slate-500 text-xs mt-2">{m.profileHint}</p>
            </section>

            <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{m.dailyAttendance}</h2>
              <p className="text-slate-200"><span className="text-emerald-400 font-medium">{m.youAreCheckedIn}</span></p>
            </section>

            {/* Route Reset Day banner */}
            {isRouteResetDay && (
              <div className="rounded-xl bg-amber-900/40 border border-amber-600 p-3">
                <p className="text-sm font-semibold text-amber-200">⚠ {m.routeResetDay}</p>
                <p className="text-xs text-amber-100/90 mt-0.5">{m.routeResetDayFocus}</p>
              </div>
            )}

            {/* CURRENT SHIFT PHASE */}
            <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{m.currentShiftPhase}</h2>
              <p className="text-lg font-semibold text-white">{phaseLabel}</p>
              <p className="text-sm text-slate-400">{phaseTimeWindow}</p>
            </section>

            {/* ACTIVE TASKS — progress bar, overdue, pending, completed collapsed */}
            <section className="rounded-xl bg-slate-800 border border-slate-700 p-4 space-y-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{m.activeTasks}</h2>
              {activeTasks.length > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{(m.tasksProgress as string).replace("{done}", String(activeCompleted.length)).replace("{total}", String(activeTasks.length))}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${activeTasks.length ? (activeCompleted.length / activeTasks.length) * 100 : 0}%` }} />
                  </div>
                </>
              )}
              {overdueTasksList.filter((t) => !isRouteResetDay || isEssentialTask(t.title)).length > 0 && (
                <div className="rounded-lg bg-red-900/30 border border-red-700 p-2">
                  <p className="text-xs font-semibold text-red-200 uppercase tracking-wider mb-1">⚠ {m.overdueTasks}</p>
                  <ul className="space-y-1">
                    {overdueTasksList.filter((t) => !isRouteResetDay || isEssentialTask(t.title)).map((t) => (
                      <li key={t.id} className="flex justify-between items-center gap-2 text-sm">
                        <span className="text-slate-200">{t.title} — {(m.overdueByMinutes as string).replace("{n}", String(minutesOverdue(t)))}</span>
                        <button type="button" disabled={completingTaskId === t.id} onClick={() => handleCompleteTask(t.id)} className="shrink-0 px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-500 disabled:opacity-50">{completingTaskId === t.id ? "…" : m.complete}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activePending.length === 0 && activeCompleted.length === 0 && (
                <p className="text-slate-500 text-sm">{locale === "vi" ? "Không có công việc trong ca này." : "No tasks in this phase."}</p>
              )}
              <ul className="space-y-1">
                {activePending.map((t) => (
                  <li key={t.id} className="flex justify-between items-center gap-2 py-1.5 border-b border-slate-700 last:border-b-0">
                    <span className="text-slate-200 text-sm">{t.title}</span>
                    <button type="button" disabled={completingTaskId === t.id} onClick={() => handleCompleteTask(t.id)} className="shrink-0 px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-500 disabled:opacity-50">{completingTaskId === t.id ? "…" : m.complete}</button>
                  </li>
                ))}
              </ul>
              {activeCompleted.length > 0 && (
                <div>
                  <button type="button" onClick={() => setCompletedTasksExpanded(!completedTasksExpanded)} className="w-full text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-0.5 flex items-center justify-between">
                    {m.completedTasks} ({activeCompleted.length})
                    <span className="text-slate-500">{completedTasksExpanded ? "▼" : "▶"}</span>
                  </button>
                  {completedTasksExpanded && (
                    <ul className="space-y-0.5 mt-1">
                      {activeCompleted.map((t) => (
                        <li key={t.id} className="text-sm">
                          <span className="text-emerald-400 line-through">{t.title}</span>
                          <p className="text-[11px] text-slate-500">{(t.completers && t.completers.length > 0 ? t.completers : [t.completed_by_name ?? "Staff"].filter(Boolean)).join(", ")}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>

            {/* TEAM STATUS — who completed what */}
            <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{m.teamStatus}</h2>
              {teamCompletions.length === 0 ? (
                <p className="text-slate-500 text-sm">{locale === "vi" ? "Chưa có hoàn thành nào." : "No completions yet."}</p>
              ) : (
                <ul className="space-y-1 text-sm max-h-32 overflow-y-auto">
                  {teamCompletions.slice(0, 20).map((c, i) => (
                    <li key={i} className="flex justify-between gap-2 py-0.5 border-b border-slate-700/50 last:border-0">
                      <span className="text-slate-200 truncate">{c.staff_name} — {c.task_title}</span>
                      <span className="text-slate-500 shrink-0">{new Date(c.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Tabs: Routes, Coaching */}
            <div className="flex gap-1 p-1 rounded-xl bg-slate-800 border border-slate-700">
              <button type="button" onClick={() => setStaffTab("routes")} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${staffTab === "routes" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>{m.tabRoutes}</button>
              <button type="button" onClick={() => setStaffTab("coaching")} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${staffTab === "coaching" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}`}>{m.tabCoaching}</button>
            </div>

            {/* TAB: ROUTES — wall zone, assigned setters, reset progress, route setting tasks */}
            {staffTab === "routes" && (
              <section className="rounded-xl bg-slate-800 border border-slate-700 p-4 space-y-4">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{m.routeResetSchedule}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-slate-400 uppercase border-b border-slate-600">
                        <th className="py-2 pr-2">{m.wallZone}</th>
                        <th className="py-2 pr-2">{m.nextResetDate}</th>
                        <th className="py-2 pr-2">{m.assignedSetters}</th>
                        <th className="py-2 pr-2">{m.resetProgress}</th>
                        <th className="py-2 w-28" />
                      </tr>
                    </thead>
                    <tbody>
                      {zones.map((z) => {
                        const resetComplete = z.last_reset_at && getGymDateFromISO(z.last_reset_at) === today;
                        const setters = (z.assigned_setters as string[] | undefined) ?? [];
                        return (
                          <tr key={z.id} className="border-b border-slate-700 last:border-0">
                            <td className="py-2 pr-2 font-medium text-slate-200">{z.name}</td>
                            <td className="py-2 pr-2 text-slate-400">{formatDate(z.next_reset_at)}</td>
                            <td className="py-2 pr-2 text-slate-500">{setters.length > 0 ? setters.join(", ") : m.noAssignments}</td>
                            <td className="py-2 pr-2">{resetComplete ? <span className="text-emerald-400">{m.resetProgressComplete}</span> : <span className="text-slate-400">{m.resetProgressPending}</span>}</td>
                            <td className="py-2">
                              <div className="flex flex-col gap-1">
                                {z.status !== "recent" && (
                                  <button
                                    type="button"
                                    disabled={resettingZoneId === z.id}
                                    onClick={() => handleZoneReset(z.id)}
                                    className="px-2 py-1 rounded bg-slate-600 text-slate-200 text-xs hover:bg-slate-500 disabled:opacity-50"
                                  >
                                    {resettingZoneId === z.id ? "…" : m.markResetComplete}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const res = await staffFetch(`/api/route-setter/zones/${z.id}/assign`, { method: "POST" });
                                      if (!res.ok) throw new Error("failed");
                                      // Refresh zones list to show updated assignments
                                      const r = await staffFetch("/api/route-setter/zones");
                                      const d = await r.json();
                                      if (r.ok && d?.zones) setZones(d.zones);
                                    } catch {
                                      // ignore, existing error UI will handle generic failures
                                    }
                                  }}
                                  className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs hover:bg-slate-600"
                                >
                                  {m.assignToMe}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500">{m.next}: {zones.map((z) => `${z.name} ${formatDate(z.next_reset_at)}`).join(" · ")}</p>
                {isRouteResetDay && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{m.routeSettingTasks}</h3>
                    <p className="text-slate-400 text-sm mb-1">{locale === "vi" ? "Ưu tiên các công việc set tường. Chỉ hiển thị vận hành thiết yếu ở mục Active tasks." : "Route setting is the main focus. Essential operations only in Active tasks above."}</p>
                    <ul className="space-y-0.5 text-sm text-slate-300">
                      {[...preOpenTasks, ...duringTasks, ...closingTasks].filter((t) => isEssentialTask(t.title)).map((t) => (
                        <li key={t.id} className={t.status === "completed" ? "line-through text-slate-500" : ""}>{t.title} {t.status === "completed" ? "✓" : ""}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* TAB: COACHING */}
            {staffTab === "coaching" && (
              <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{m.todayCoachingSessions}</h2>
                {sessions.length === 0 && <p className="text-slate-500 text-sm">{m.noSessionsScheduled}</p>}
                {mySessions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 mb-2">{m.yourSessions}</p>
                    <ul className="space-y-1.5">
                      {mySessions.map((s) => (
                        <li key={s.id} className="py-2 px-3 rounded-lg bg-slate-700/50 text-sm space-y-1">
                          <div className="flex justify-between items-center">
                            <span>{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                            <span className="text-emerald-400">{m.assignedToYou}</span>
                          </div>
                          <div className="text-xs text-slate-400">{s.location && <span>{s.location}</span>}{(s.newbie_count ?? 0) > 0 && <span className="ml-2">{s.newbie_count} {m.newbiesAttending}</span>}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {unassignedSessions.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">{m.unassignedTapToTake}</p>
                    <ul className="space-y-1.5">
                      {unassignedSessions.map((s) => (
                        <li key={s.id} className="py-2 px-3 rounded-lg bg-slate-700/50 text-sm space-y-1">
                          <div className="flex justify-between items-center">
                            <span>{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                            <button type="button" disabled={assigningId === s.id} onClick={() => handleAssignSession(s.id)} className="text-amber-400 hover:text-amber-300 text-sm font-medium disabled:opacity-50">{assigningId === s.id ? "…" : m.assignToMe}</button>
                          </div>
                          <div className="text-xs text-slate-400">{s.location && <span>{s.location}</span>}{(s.newbie_count ?? 0) > 0 && <span className="ml-2">{s.newbie_count} {m.newbiesAttending}</span>}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
