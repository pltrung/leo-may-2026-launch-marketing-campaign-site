"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
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

interface StaffTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  completed_at: string | null;
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
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [resettingZoneId, setResettingZoneId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

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
    if (res.ok) setTasks(data.tasks ?? []);
  }, [staffFetch]);

  useEffect(() => {
    if (!staff) return;
    loadAttendance();
    loadSessions();
    loadZones();
    loadTasks();
  }, [staff, loadAttendance, loadSessions, loadZones, loadTasks]);

  useEffect(() => {
    if (staff?.display_name != null) setProfileName(staff.display_name);
    else if (staff?.email) setProfileName(staff.email.split("@")[0] || "");
  }, [staff?.display_name, staff?.email]);

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

  const today = new Date().toISOString().slice(0, 10);
  const hasAnsweredAttendance = attendance?.date === today;
  const isIn = attendance?.status === "IN";
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit", hour12: locale === "en" });
  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/95 backdrop-blur px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-semibold">{m.title}</h1>
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
        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-700 text-red-200 text-sm px-4 py-2">
            {error}
          </div>
        )}

        <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            {m.dailyAttendance}
          </h2>
          {!hasAnsweredAttendance ? (
            <>
              <p className="text-slate-200 font-medium mb-1">{m.checkInAtFrontDesk}</p>
              <p className="text-slate-400 text-sm mb-4">{m.checkInAtFrontDeskHint}</p>
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl bg-white p-3 inline-block">
                  <QRCodeSVG value={`leo-staff:${staff.id}`} size={180} level="M" />
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
            </>
          ) : isIn ? (
            <p className="text-slate-200">
              <span className="text-emerald-400 font-medium">{m.youAreCheckedIn}</span>
            </p>
          ) : (
            <p className="text-slate-400">{m.youAreMarkedNotWorking}</p>
          )}
        </section>

        {isIn && tasks.some((t) => t.status === "pending") && (
          <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
              {m.dailyOperationsTasks}
            </h2>
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2 border-b border-slate-700 last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className={t.status === "completed" ? "line-through text-slate-500" : "text-slate-200"}>
                      {t.title}
                    </span>
                    {t.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                    )}
                  </div>
                  {t.status === "pending" && (
                    <button
                      type="button"
                      disabled={completingTaskId === t.id}
                      onClick={() => handleCompleteTask(t.id)}
                      className="shrink-0 px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {completingTaskId === t.id ? "…" : m.complete}
                    </button>
                  )}
                  {t.status === "completed" && (
                    <span className="text-emerald-400 text-sm">{m.done}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {isIn && (
        <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            {m.routeResetSchedule}
          </h2>
          {overdueZones.length > 0 && (
            <div className="mb-3 p-2 rounded-lg bg-amber-900/30 border border-amber-700">
              <p className="text-xs font-semibold text-amber-200 uppercase tracking-wider mb-2">{m.overdue}</p>
              <ul className="space-y-1.5">
                {overdueZones.map((z) => (
                  <li key={z.id} className="flex justify-between items-center text-sm">
                    <span>{z.name}</span>
                    <button
                      type="button"
                      disabled={resettingZoneId === z.id}
                      onClick={() => handleZoneReset(z.id)}
                      className="px-2 py-1 rounded bg-amber-600 text-amber-100 text-xs font-medium hover:bg-amber-500 disabled:opacity-50"
                    >
                      {resettingZoneId === z.id ? "…" : m.markResetComplete}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="space-y-2">
            {zones.map((z) => (
              <li key={z.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-700 last:border-0">
                <div>
                  <span className="font-medium">{z.name}</span>
                  <span className={`ml-2 text-xs ${
                    z.status === "overdue" ? "text-red-400" :
                    z.status === "due" ? "text-amber-400" :
                    z.status === "recent" ? "text-emerald-400" : "text-slate-500"
                  }`}>
                    {z.status === "overdue" && m.overdue}
                    {z.status === "due" && m.dueSoon}
                    {z.status === "recent" && m.recentlyReset}
                    {z.status === "upcoming" && `${m.next}: ${formatDate(z.next_reset_at)}`}
                  </span>
                </div>
                {z.status !== "recent" && (
                  <button
                    type="button"
                    disabled={resettingZoneId === z.id}
                    onClick={() => handleZoneReset(z.id)}
                    className="px-3 py-1.5 rounded bg-slate-600 text-slate-200 text-sm hover:bg-slate-500 disabled:opacity-50"
                  >
                    {resettingZoneId === z.id ? "…" : m.markResetComplete}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
        )}

        {isIn && (
        <section className="rounded-xl bg-slate-800 border border-slate-700 p-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            {m.todayCoachingSessions}
          </h2>
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
                    <div className="text-xs text-slate-400">
                      {s.location && <span>{s.location}</span>}
                      {(s.newbie_count ?? 0) > 0 && (
                        <span className="ml-2">{s.newbie_count} {m.newbiesAttending}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {unassignedSessions.length > 0 && isIn && (
            <div>
              <p className="text-xs text-slate-400 mb-2">{m.unassignedTapToTake}</p>
              <ul className="space-y-1.5">
                {unassignedSessions.map((s) => (
                  <li key={s.id} className="py-2 px-3 rounded-lg bg-slate-700/50 text-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <span>{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                      <button
                        type="button"
                        disabled={assigningId === s.id}
                        onClick={() => handleAssignSession(s.id)}
                        className="text-amber-400 hover:text-amber-300 text-sm font-medium disabled:opacity-50"
                      >
                        {assigningId === s.id ? "…" : m.assignToMe}
                      </button>
                    </div>
                    <div className="text-xs text-slate-400">
                      {s.location && <span>{s.location}</span>}
                      {(s.newbie_count ?? 0) > 0 && (
                        <span className="ml-2">{s.newbie_count} {m.newbiesAttending}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        )}
      </main>
    </div>
  );
}
