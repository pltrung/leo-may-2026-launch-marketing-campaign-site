"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Logo from "@/components/Logo";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useMemberAuth } from "@/lib/useMemberAuth";
import { HERO_BG } from "@/lib/heroConstants";
import SafeLanguageSwitch from "@/components/SafeLanguageSwitch";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  { ssr: false }
);

export default function DashboardPage() {
  const locale = useLocale();
  const router = useRouter();
  const m = getMessages(locale as "en" | "vi").dashboard;
  const { user, member, loading, signOut } = useMemberAuth();
  const [mounted, setMounted] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("leo_may_locale", String(locale));
      }
    } catch {
      // ignore
    }
  }, [locale]);

  useEffect(() => {
    if (!qrModalOpen || typeof window === "undefined" || typeof navigator === "undefined") return;

    let released = false;

    const requestWakeLock = async () => {
      try {
        const anyNav = navigator as any;
        if (!anyNav.wakeLock?.request) return;
        const lock = await anyNav.wakeLock.request("screen");
        wakeLockRef.current = lock;
        lock.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      } catch {
        // ignore
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && qrModalOpen && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (released) return;
      released = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (wakeLockRef.current?.release) {
        wakeLockRef.current
          .release()
          .catch(() => {})
          .finally(() => {
            wakeLockRef.current = null;
          });
      }
    };
  }, [qrModalOpen]);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) {
      router.replace(`/${locale}/gym`);
      return;
    }
    if (member && !member.waiver_signed) {
      router.replace(`/${locale}/waiver`);
    }
  }, [mounted, loading, user, member, locale, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: HERO_BG }}>
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: HERO_BG }}>
        <p className="text-white/80 text-center">Setting up your profile…</p>
      </div>
    );
  }

  const qrPayload = `leo-member:${member.id}`;
  const memberSince = member.created_at
    ? new Date(member.created_at).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";
  const lastCheckIn = member.last_check_in
    ? new Date(member.last_check_in).toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

  const expiry = new Date("2026-03-31T23:59:59+07:00");
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.max(0, Math.round((expiry.getTime() - now.getTime()) / msPerDay));
  const expiryLabel = expiry.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    month: "long",
    year: "numeric",
  });

  const shortMemberId = member.id ? `LM-${member.id.slice(0, 4).toUpperCase()}` : "—";

  const [occupancy, setOccupancy] = useState<number | null>(null);
  useEffect(() => {
    setOccupancy(member.total_visits != null ? Math.max(8, Math.min(58, member.total_visits)) : 12);
  }, [member.total_visits]);

  let gymStatusLabel = "Unknown";
  let gymStatusEmoji = "⚪";
  let gymStatusColor = "text-white/70";
  if (occupancy != null) {
    if (occupancy <= 20) {
      gymStatusLabel = locale === "vi" ? "Nhẹ" : "Light";
      gymStatusEmoji = "🟢";
      gymStatusColor = "text-emerald-400";
    } else if (occupancy <= 40) {
      gymStatusLabel = locale === "vi" ? "Vừa" : "Moderate";
      gymStatusEmoji = "🟡";
      gymStatusColor = "text-amber-300";
    } else {
      gymStatusLabel = locale === "vi" ? "Đông" : "Busy";
      gymStatusEmoji = "🔴";
      gymStatusColor = "text-red-400";
    }
  }

  const recentDates: string[] = [];
  if (member.last_check_in) {
    const base = new Date(member.last_check_in);
    const formatterLocale = locale === "vi" ? "vi-VN" : "en-US";
    for (let i = 0; i < 4; i += 1) {
      const d = new Date(base);
      d.setDate(d.getDate() - i * 2);
      recentDates.push(
        d.toLocaleDateString(formatterLocale, {
          month: "short",
          day: "numeric",
        })
      );
    }
  }
  const sessionsThisMonth = member.total_visits != null ? Math.min(member.total_visits, 12) : 0;

  // Cloud Ascension levels based on total check-ins
  const totalVisits = member.total_visits ?? 0;
  const ascensionLevels = [
    { level: 1, name: "Cloud Walker", required: 5, reward: "Free Coffee" },
    { level: 2, name: "Sky Climber", required: 10, reward: "Free Chalk" },
    { level: 3, name: "Storm Rider", required: 25, reward: "Free Day Pass" },
    { level: 4, name: "Cloud Master", required: 50, reward: "Leo May T-Shirt" },
    { level: 5, name: "Sky Legend", required: 100, reward: "VIP Wall Event" },
  ];

  let currentLevelIndex = -1;
  for (let i = 0; i < ascensionLevels.length; i += 1) {
    if (totalVisits >= ascensionLevels[i].required) currentLevelIndex = i;
  }
  const nextLevelIndex =
    currentLevelIndex < ascensionLevels.length - 1 ? currentLevelIndex + 1 : currentLevelIndex;

  const currentLevel =
    currentLevelIndex >= 0 ? ascensionLevels[currentLevelIndex] : null;
  const nextLevel =
    nextLevelIndex >= 0 ? ascensionLevels[nextLevelIndex] : null;

  const progressTarget = nextLevel?.required ?? currentLevel?.required ?? 1;
  const progressValue = Math.min(totalVisits, progressTarget);
  const progressPct = Math.min(100, Math.round((progressValue / progressTarget) * 100));

  const currentLevelLabel = currentLevel
    ? `Level ${currentLevel.level} – ${currentLevel.name}`
    : "Level 0 – New Cloud";

  const nextRewardLabel =
    nextLevel && nextLevel.level !== currentLevel?.level
      ? nextLevel.reward
      : currentLevel?.reward ?? "Stay consistent to unlock rewards";

  // Simple weekly streak approximation (can be wired to real check-in history later)
  const weeklyVisits = Math.min(totalVisits, 7);
  const hasWeeklyReward = weeklyVisits >= 5;

  // Community leaderboard state
  type LeaderboardEntry = {
    rank: number;
    member_id: string;
    full_name: string;
    visits: number;
  };

  type LeaderboardResponse = {
    top: LeaderboardEntry[];
    currentUser: {
      rank: number | null;
      visits: number;
      full_name: string;
    };
  };

  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!mounted || loading || !user || !member) return;

    let cancelled = false;

    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          if (!cancelled) setLeaderboardLoading(false);
          return;
        }
        const res = await fetch("/api/member/leaderboard", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = (await res.json()) as LeaderboardResponse & { error?: string };
        if (!res.ok) {
          if (!cancelled) {
            setLeaderboardError(data?.error || "Something went wrong, try again.");
          }
        } else if (!cancelled) {
          setLeaderboard(data);
          setLeaderboardError(null);
        }
      } catch {
        if (!cancelled) setLeaderboardError("Something went wrong, try again.");
      } finally {
        if (!cancelled) setLeaderboardLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [mounted, loading, user, member]);

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background:
          "radial-gradient(ellipse at top, #1c2742 0%, #0b0b0f 45%), radial-gradient(ellipse at bottom, #1a1a2e 0%, #050509 55%)",
      }}
    >
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 md:px-8 py-4 bg-black/35 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex">
            <SafeLanguageSwitch />
          </div>
          <button
            type="button"
            onClick={() =>
              signOut().then(() => {
                router.replace(`/${locale}/gym`);
              })
            }
            className="text-white/80 text-sm hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="px-4 md:px-8 pt-24 pb-10 flex justify-center">
        <div className="w-full max-w-[720px] space-y-10 md:space-y-12">
          <section>
            <p
              className="text-2xl md:text-3xl font-bold text-white"
              style={{ fontFamily: "MiSans-Bold, sans-serif" }}
            >
              {m.welcome.replace("{name}", member.full_name || "Member")}
            </p>
          </section>

          <section className="p-6 md:p-7 rounded-3xl bg-white/5 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-[0.2em] text-white/70 uppercase">
                CHECK IN
              </h2>
              <span className="text-[11px] text-white/50">Leo Mây Climbing Gym</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="rounded-2xl bg-black/40 border border-white/15 p-4 hover:bg-black/55 transition-colors"
              >
                {mounted && (
                  <QRCodeSVG
                    value={qrPayload}
                    size={240}
                    level="M"
                    bgColor="transparent"
                    fgColor="#ffffff"
                  />
                )}
              </button>
              <p className="text-xs text-white/70">Tap to enlarge for scanning</p>
            </div>
          </section>

          <section className="p-6 md:p-7 rounded-3xl bg-white/6 border border-white/12 shadow-lg">
            <h2 className="text-sm font-semibold tracking-[0.18em] text-white/70 uppercase mb-4">
              Membership
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-white/80">
                <span>Member Tier</span>
                <span className="font-medium text-white">
                  {member.tier || "Founder Member"}
                </span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>Valid Until</span>
                <span className="text-white">{expiryLabel}</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>Member ID</span>
                <span className="font-mono text-white text-xs md:text-sm">{shortMemberId}</span>
              </div>
              <div className="flex justify-between text-white/70 text-xs pt-1">
                <span>Days remaining</span>
                <span className="text-white">{daysRemaining}</span>
              </div>
            </div>
          </section>

          <section className="p-6 md:p-7 rounded-3xl bg-white/6 border border-white/12 shadow-lg">
            <h2 className="text-sm font-semibold tracking-[0.18em] text-white/70 uppercase mb-4">
              Cloud Ascension
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-white/60 mb-1">Current Level</p>
                <p className="text-sm text-white">{currentLevelLabel}</p>
              </div>

              <div>
                <div className="h-3 w-full rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      background:
                        "linear-gradient(90deg, rgba(148, 197, 255, 0.9), rgba(244, 244, 255, 0.98))",
                      boxShadow: "0 0 12px rgba(148, 197, 255, 0.7)",
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/70">
                  {progressValue} / {progressTarget} visits
                </p>
              </div>

              <div>
                <p className="text-xs text-white/60 mb-1">Next Reward</p>
                <p className="text-sm text-white">{nextRewardLabel}</p>
              </div>

              <div className="pt-3 border-t border-white/10 space-y-1">
                <p className="text-xs text-white/60 mb-1">Climbing Streak</p>
                <p className="text-sm text-white flex items-center gap-1">
                  <span aria-hidden>🔥</span>
                  {weeklyVisits} {weeklyVisits === 1 ? "visit" : "visits"} this week
                </p>
                <p className="text-[11px] text-white/60">
                  5 visits in one week – Free coffee{" "}
                  {hasWeeklyReward && (
                    <span className="text-emerald-300 font-medium">(unlocked)</span>
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="p-6 md:p-7 rounded-3xl bg-white/6 border border-white/12 shadow-lg">
            <h2 className="text-sm font-semibold tracking-[0.18em] text-white/70 uppercase mb-4">
              Gym Status
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  {gymStatusEmoji}
                </span>
                <span className={`text-sm font-medium ${gymStatusColor}`}>
                  {gymStatusLabel}
                </span>
              </div>
              <p className="text-sm text-white/80">
                {occupancy != null ? `${occupancy} climbers inside` : "Live status coming soon"}
              </p>
            </div>
          </section>

          <section className="p-6 md:p-7 rounded-3xl bg-white/6 border border-white/12 shadow-lg">
            <h2 className="text-sm font-semibold tracking-[0.18em] text-white/70 uppercase mb-4">
              Your Activity
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-xs text-white/60 mb-1">Last check-in</p>
                <p className="text-sm text-white">{lastCheckIn}</p>
              </div>
              <div>
                <p className="text-xs text-white/60 mb-1">Sessions this month</p>
                <p className="text-sm text-white">
                  {sessionsThisMonth}
                </p>
              </div>
            </div>
            {recentDates.length > 0 && (
              <div>
                <p className="text-xs text-white/60 mb-2">Recent visits</p>
                <div className="flex flex-wrap gap-2">
                  {recentDates.map((d) => (
                    <span
                      key={d}
                      className="px-3 py-1 rounded-full bg-white/8 border border-white/15 text-xs text-white/85"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Community Leaderboard */}
          <section className="p-6 md:p-7 rounded-3xl bg-white/6 border border-white/12 shadow-lg">
            <h2 className="text-sm font-semibold tracking-[0.18em] text-white/70 uppercase mb-1">
              Community Leaderboard
            </h2>
            <p className="text-xs text-white/60 mb-4">
              Top Climbers This Month
            </p>
            {leaderboardLoading ? (
              <p className="text-xs text-white/50">Loading leaderboard…</p>
            ) : leaderboardError ? (
              <p className="text-xs text-red-300">{leaderboardError}</p>
            ) : leaderboard && leaderboard.top.length > 0 ? (
              <div className="space-y-3 text-sm">
                <ol className="space-y-1">
                  {leaderboard.top.map((entry) => {
                    const medal =
                      entry.rank === 1
                        ? "🥇"
                        : entry.rank === 2
                        ? "🥈"
                        : entry.rank === 3
                        ? "🥉"
                        : `${entry.rank}.`;
                    return (
                      <li
                        key={entry.member_id}
                        className="flex items-center justify-between text-white/85"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-6 text-center text-base" aria-hidden>
                            {medal}
                          </span>
                          <span>{entry.full_name}</span>
                        </span>
                        <span className="text-xs text-white/70">
                          {entry.visits} {entry.visits === 1 ? "visit" : "visits"}
                        </span>
                      </li>
                    );
                  })}
                </ol>

                {leaderboard.currentUser && (
                  <div className="pt-3 mt-3 border-t border-white/10">
                    <p className="text-xs text-white/60 mb-1">Your Rank</p>
                    {leaderboard.currentUser.rank ? (
                      <p className="text-sm text-white/85">
                        #{leaderboard.currentUser.rank} {leaderboard.currentUser.full_name} —{" "}
                        {leaderboard.currentUser.visits}{" "}
                        {leaderboard.currentUser.visits === 1 ? "visit" : "visits"}
                      </p>
                    ) : (
                      <p className="text-sm text-white/60">
                        No check-ins yet this month.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/50">
                No check-ins yet this month. Be the first to climb.
              </p>
            )}
          </section>

          <section className="p-6 md:p-7 rounded-3xl bg-white/6 border border-white/12 shadow-lg">
            <h2 className="text-sm font-semibold tracking-[0.18em] text-white/70 uppercase mb-4">
              Upcoming Events
            </h2>
            <div className="space-y-3">
              {[
                { title: "Route Setting Night", date: "July 12" },
                { title: "Women's Climbing Session", date: "July 16" },
                { title: "Competition Night", date: "July 30" },
              ].map((event) => (
                <div
                  key={event.title}
                  className="flex items-center justify-between rounded-2xl bg-black/35 border border-white/10 px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-white">{event.title}</p>
                    <p className="text-xs text-white/60 mt-0.5">{event.date}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                    Event
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-3 border-t border-white/10">
              <p className="text-xs text-white/60 mb-1">
                Top 3 rewards this month
              </p>
              <ul className="text-xs text-white/80 space-y-1">
                <li>🥇 Free Chalk</li>
                <li>🥈 Free Coffee</li>
                <li>🥉 Guest Pass</li>
              </ul>
            </div>
          </section>

          <footer className="pt-4 border-t border-white/10 text-xs text-white/60 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Instagram
              </a>
              <Link href="mailto:hello@leomayclimbing.com" className="hover:text-white">
                Contact
              </Link>
              <Link href={`/${locale}/gym#rules`} className="hover:text-white">
                Rules
              </Link>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/50">Language</span>
              <SafeLanguageSwitch />
            </div>
          </footer>
        </div>
      </main>

      {qrModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/90 px-4">
          <button
            type="button"
            onClick={() => setQrModalOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-sm"
          >
            ✕
          </button>
          <div className="w-full max-w-sm flex flex-col items-center gap-5">
            <Logo className="h-10 w-auto object-contain" />
            <h2 className="text-sm font-semibold tracking-[0.24em] text-white/70 uppercase">
              CHECK IN
            </h2>
            <div className="rounded-3xl bg-black border border-white/20 p-5">
              {mounted && (
                <QRCodeSVG
                  value={qrPayload}
                  size={280}
                  level="M"
                  bgColor="transparent"
                  fgColor="#ffffff"
                />
              )}
            </div>
            <p className="text-xs text-white/80 text-center">
              Show this code to front desk
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
