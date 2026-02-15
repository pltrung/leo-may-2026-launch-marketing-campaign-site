"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearUser } from "@/lib/userStorage";
import { getCloudById } from "@/lib/cloudData";
import type { CloudType } from "@/lib/cloudData";
import CloudIconByType from "@/components/CloudIcons";

const TARGET = new Date("2026-01-01T00:00:00+07:00");
const REFERRAL_UNLOCK = 10;

function useCountdown() {
  const [diff, setDiff] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const tick = () => {
      const d = Math.max(0, TARGET.getTime() - Date.now());
      setDiff({
        days: Math.floor(d / 86400000),
        hours: Math.floor((d % 86400000) / 3600000),
        minutes: Math.floor((d % 3600000) / 60000),
        seconds: Math.floor((d % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return diff;
}

const POLL_INTERVAL_MS = 10000;

function useTeamCount(teamId: CloudType) {
  const [teamCount, setTeamCount] = useState(0);
  useEffect(() => {
    const fetchCount = () => {
      fetch(`/api/team-count?team=${teamId}`)
        .then((r) => r.json())
        .then((d) => setTeamCount(typeof d.count === "number" ? d.count : 0))
        .catch(() => {});
    };
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [teamId]);
  return teamCount;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  nameEn: string;
  accentHex: string;
  count: number;
}

function useLeaderboard() {
  const [teams, setTeams] = useState<LeaderboardEntry[]>([]);
  useEffect(() => {
    const fetchLeaderboard = () => {
      fetch("/api/leaderboard")
        .then((r) => r.json())
        .then((d) => setTeams(d.teams ?? []))
        .catch(() => {});
    };
    fetchLeaderboard();
    const id = setInterval(fetchLeaderboard, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  return teams;
}

interface UserProfile {
  referralCount: number;
  referralCode: string | null;
  traitUnlocked: boolean;
}

function useUserProfile(email?: string, phone?: string) {
  const [profile, setProfile] = useState<UserProfile>({ referralCount: 0, referralCode: null, traitUnlocked: false });
  useEffect(() => {
    if (!email && !phone) return;
    const fetchProfile = () => {
      const params = new URLSearchParams();
      if (email) params.set("email", email);
      if (phone) params.set("phone", phone);
      fetch(`/api/user-profile?${params}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.referralCount !== undefined) {
            setProfile({
              referralCount: typeof d.referralCount === "number" ? d.referralCount : 0,
              referralCode: d.referralCode ?? null,
              traitUnlocked: d.traitUnlocked === true,
            });
          }
        })
        .catch(() => {});
    };
    fetchProfile();
    const id = setInterval(fetchProfile, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [email, phone]);
  return profile;
}

export default function CountdownPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const teamCount = useTeamCount((user?.team ?? "may_nhe") as CloudType);
  const leaderboard = useLeaderboard();
  const profile = useUserProfile(user?.email, user?.phone);
  const { days, hours, minutes, seconds } = useCountdown();

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    if (user === null) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const params = new URLSearchParams();
    if (user.email) params.set("email", user.email);
    else if (user.phone) params.set("phone", user.phone);
    else {
      clearUser();
      router.replace("/");
      return;
    }
    fetch(`/api/waitlist/lookup?${params}`)
      .then((r) => r.json())
      .then((d) => setVerified(!!d?.user))
      .catch(() => setVerified(false));
  }, [user, router]);

  useEffect(() => {
    if (verified === false) {
      clearUser();
      router.replace("/");
    }
  }, [verified, router]);

  const handleLogout = () => {
    clearUser();
    router.replace("/");
  };

  if (!user || verified === false) return null;

  const cloud = getCloudById(user.team);
  if (!cloud) return null;

  const accent = cloud.accentHex;
  const isGiong = cloud.id === "giong";
  const accentContrast = isGiong ? "#ffffff" : accent;
  const firstName = user.name.trim().split(/\s+/)[0] || "there";
  const pad = (n: number) => String(n).padStart(2, "0");
  const referralCount = profile.referralCount;
  const referralCode = profile.referralCode ?? user.referralCode ?? "";
  const traitUnlocked = profile.traitUnlocked || referralCount >= REFERRAL_UNLOCK;
  const progressPct = Math.min(100, Math.round((referralCount / REFERRAL_UNLOCK) * 100));

  return (
    <main
      className="min-h-[100dvh] md:min-h-0 md:h-screen md:max-h-screen overflow-y-auto md:overflow-hidden flex flex-col items-center justify-center px-4 py-4 relative"
      style={{ backgroundColor: "#0242FF" }}
    >
      <button
        type="button"
        onClick={handleLogout}
        className="absolute bottom-5 right-4 md:bottom-auto md:top-8 md:right-10 z-10 py-1.5 px-3 md:py-2 md:px-4 rounded-full border border-white/60 text-white/90 text-xs md:text-sm font-medium hover:bg-white/10 hover:border-white/80 transition-colors"
        aria-label="Log out"
      >
        Log out
      </button>
      <div className="absolute inset-0 -z-10 opacity-10 pointer-events-none" aria-hidden>
        <img src="/brand/background.svg" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 -z-10 opacity-[0.08] pointer-events-none" aria-hidden>
        <img src="/brand/holds.svg" alt="" className="w-full h-full object-cover" />
      </div>

      <div className="flex flex-col items-center w-full max-w-lg mx-auto min-h-full md:h-full pt-4 pb-14 md:pb-3 overflow-visible md:overflow-hidden gap-[0.65em] sm:gap-[0.7em]">
        {/* 1. Cloud card: You joined section */}
        <div
          className="shrink-0 w-[90%] max-w-[420px] text-center rounded-[24px] px-4 sm:px-5 py-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.95)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 0 1px rgba(255,255,255,0.5)",
          }}
        >
          <p className="font-body text-storm/90 text-[1rem] sm:text-[1.05rem]">
            Hi {firstName},
          </p>
          <p className="font-headline font-bold text-storm text-[1.15rem] sm:text-[1.25rem] tracking-headline mt-0.5">
            You joined: <span className="font-bold" style={{ color: accent, textShadow: `0 0 12px ${accent}60` }}>Team {cloud.name}</span>
          </p>
          <p className="font-medium text-storm/80 text-[0.9rem] sm:text-[0.95rem] mt-0.5" style={{ borderBottom: `2px solid ${accent}`, display: "inline-block", paddingBottom: 2 }}>
            {cloud.nameEn}
          </p>
          <div className="mt-2 flex justify-center animate-pulse" style={{ color: accent }}>
            <CloudIconByType cloudId={cloud.id} className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px]" />
          </div>
        </div>

        {/* 3. Logo — maximized for viewport */}
        <div className="shrink-0 w-[min(90vw,200px)] sm:w-[min(85vw,240px)] md:w-[min(80vw,280px)]">
          <img
            src="/logo-white.svg"
            alt="Leo Mây"
            className="w-full h-auto object-contain"
          />
        </div>

        {/* 4. IP countdown — maximized for viewport */}
        <div className="shrink-0 -mt-0.5 w-[min(95vw,240px)] sm:w-[min(90vw,300px)] md:w-[min(85vw,360px)]">
          <img
            src="/brand/ip-count-down.svg"
            alt=""
            className="w-full h-auto object-contain animate-ip-float"
          />
        </div>

        {/* 5. Trait + Progress — white block for contrast (blue accent teams) */}
        <div
          className="shrink-0 w-[85%] sm:w-[70%] max-w-[380px] flex flex-col items-center gap-2 leading-tight rounded-2xl px-4 py-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.95)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <p
            className="font-caption text-center text-[0.95rem] sm:text-[1rem]"
            style={{ color: traitUnlocked ? accent : "#1E2A38", opacity: traitUnlocked ? 1 : 0.7 }}
          >
            {traitUnlocked
              ? cloud.traitUnlocked ?? "Your cloud is forming."
              : "Your cloud is forming…"}
          </p>
          <div
            className="w-full h-[10px] min-h-[10px] rounded-full overflow-hidden flex-shrink-0"
            style={{
              backgroundColor: "rgba(0,0,0,0.1)",
              boxShadow: `0 0 8px ${accent}50`,
            }}
          >
            <div
              className="h-full min-w-0 rounded-full transition-all duration-500 flex-shrink-0"
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%`, backgroundColor: accent }}
            />
          </div>
          <p
            className="font-caption text-xs sm:text-[0.85rem] uppercase font-medium"
            style={{ color: "#1E2A38", letterSpacing: "1px" }}
          >
            {traitUnlocked
              ? "Your cloud trait is unlocked"
              : `${referralCount} of 10 referrals to unlock your cloud trait`}
          </p>
          {!traitUnlocked && (
            <p className="font-caption text-[10px] sm:text-[11px] text-storm/70 tracking-wide">
              10 referrals reveal your team&apos;s defining energy.
            </p>
          )}
        </div>

        {/* 6. Share button — referral link + toast */}
        <button
          type="button"
          onClick={() => {
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const link = referralCode ? `${origin}/?ref=${referralCode}` : `${origin}/?team=${cloud.id}`;
            const msg = referralCode
              ? `Please join my cloud Team ${cloud.name} and be on the countdown with me live for the launch of Leo May Climbing Gym in Ho Chi Minh City, Vietnam — 2026.\n\nJoin here:\n${link}`
              : link;
            navigator.clipboard?.writeText(msg).then(() => {
              setShareToast(true);
              setTimeout(() => setShareToast(false), 2000);
            });
          }}
          className="shrink-0 px-5 py-2.5 rounded-full font-subheadline text-sm border-2 transition-colors hover:opacity-90 -mt-0.5"
          style={{ borderColor: accentContrast, color: accentContrast }}
        >
          Share your cloud
        </button>
        {shareToast && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="px-6 py-4 rounded-xl bg-white/95 shadow-lg text-storm font-medium animate-fade-out-2s">
              Link copied. Share it to grow your cloud.
            </div>
          </div>
        )}

        {/* 7. Leaderboard — block-based, with shimmer background */}
        <div className="shrink-0 flex flex-col items-center w-full max-w-[320px] relative mt-0">
          <div className="absolute inset-0 rounded-2xl leaderboard-shimmer pointer-events-none -z-10" aria-hidden />
          <p className="font-medium text-white/70 text-[0.75rem] sm:text-[0.8rem] tracking-wide mb-1.5">
            Top Clouds Right Now
          </p>
          <div className="flex flex-col gap-2 w-full">
            {leaderboard.slice(0, 3).map((entry, idx) => {
              const isUserTeam = entry.id === cloud.id;
              const entryIsGiong = entry.id === "giong";
              const highlightColor = isUserTeam && entryIsGiong ? "#ffffff" : (isUserTeam ? entry.accentHex : "rgba(255,255,255,0.95)");
              const glowColor = isUserTeam && entryIsGiong ? "rgba(255,255,255,0.8)" : (isUserTeam ? entry.accentHex : "rgba(255,255,255,0.5)");
              const medals = ["🥇", "🥈", "🥉"];
              const rankGradients = [
                "linear-gradient(135deg, #F2C94C 0%, #E8B828 100%)",
                "linear-gradient(135deg, #E0E0E0 0%, #B0B0B0 100%)",
                "linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)",
              ];
              return (
                <div
                  key={entry.id}
                  className={`flex flex-row items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${isUserTeam ? "animate-leaderboard-glow scale-[1.02]" : ""}`}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(8px)",
                    ...(isUserTeam ? { ["--glow-color" as string]: glowColor, color: highlightColor } : { color: "rgba(255,255,255,0.95)" }),
                  }}
                >
                  <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg animate-rank-badge-pulse"
                    style={{
                      background: rankGradients[idx],
                      boxShadow: "0 0 12px rgba(255,255,255,0.3)",
                      border: "1px solid rgba(255,255,255,0.4)",
                    }}
                  >
                    {medals[idx]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-[0.8rem] sm:text-[0.9rem] leading-tight ${isUserTeam ? "font-bold" : ""}`}>
                      Team {entry.name}
                    </p>
                    <p className="font-caption text-white/60 text-[0.7rem] mt-0.5">
                      {entry.count} member{entry.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {leaderboard.length > 0 && !leaderboard.slice(0, 3).some((e) => e.id === cloud.id) && (
            (() => {
              const idx = leaderboard.findIndex((e) => e.id === cloud.id);
              const rank = idx >= 0 ? idx + 1 : leaderboard.length + 1;
              const thirdCount = leaderboard[2]?.count ?? teamCount;
              const diff = Math.max(1, thirdCount - teamCount);
              const isCloseToNext = diff <= 3;
              return (
                <div
                  className="mt-2 w-full rounded-2xl px-4 py-3.5 animate-user-rank-glow"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(8px)",
                    border: `2px solid ${accentContrast}`,
                    ["--glow-color" as string]: accentContrast,
                    boxShadow: `0 0 16px ${isGiong ? "rgba(255,255,255,0.4)" : `${accent}40`}`,
                  }}
                >
                  <p className="font-medium text-white/60 text-[0.7rem] uppercase tracking-wider mb-1">Your Team Rank</p>
                  <div className="flex flex-row items-center gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: accentContrast, color: isGiong ? "#0242FF" : (cloud.joinTextHex ?? "#1E2A38") }}>
                      #{rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-[0.9rem] sm:text-[1rem]">Team {cloud.name}</p>
                      <p className="font-caption text-white/70 text-[0.75rem] mt-0.5">
                        {teamCount} member{teamCount !== 1 ? "s" : ""}
                        {diff > 0 && (
                          <span className="block mt-0.5">
                            +{diff} to reach #3
                            {isCloseToNext && (
                              <span className="inline-block ml-1" style={{ color: accentContrast }} aria-hidden>↑</span>
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Winner message */}
        <p className="shrink-0 text-center text-white/60 text-[0.7rem] sm:text-[0.75rem] max-w-[280px] mt-3 leading-tight">
          The team with the most members when the countdown ends will receive a special prize.
        </p>

        {/* 8. Countdown — fits viewport, spacing from leaderboard */}
        <div className="flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 shrink-0 mt-4 md:mt-3 w-full max-w-full px-1">
          {[
            { v: pad(days), l: "D" },
            { v: pad(hours), l: "H" },
            { v: pad(minutes), l: "M" },
            { v: pad(seconds), l: "S" },
          ].map((b, i) => (
            <div key={b.l} className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
              <div
                className="rounded-xl flex flex-col items-center justify-center w-[52px] min-w-[52px] h-[52px] sm:w-[60px] sm:min-w-[60px] sm:h-[60px] md:w-[72px] md:min-w-[72px] md:h-[72px] lg:w-[84px] lg:min-w-[84px] lg:h-[84px] px-1 sm:px-2 py-2 shrink-0"
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  boxShadow: "0 0 20px rgba(255,255,255,0.15)",
                }}
              >
                <span className="font-headline font-bold text-[1.25rem] sm:text-[1.5rem] md:text-[2rem] lg:text-[2.5rem] text-white tabular-nums tracking-headline">
                  {b.v}
                </span>
                <span className="font-caption text-white/60 text-[10px] sm:text-xs mt-0.5">{b.l}</span>
              </div>
              {i < 3 && <span className="font-headline text-white/40 text-lg sm:text-xl -mb-6">:</span>}
            </div>
          ))}
        </div>

        {/* 9. Ethos */}
        <div className="shrink-0 text-center mt-auto pt-1">
          <p className="font-subheadline font-bold text-white text-[0.9rem] sm:text-[1rem] leading-tight">
            Climb the Clouds. Build a Culture.
          </p>
          <p className="font-caption text-white/60 text-[0.65rem] sm:text-[0.7rem] mt-0.5">Ho Chi Minh City — 2026</p>
        </div>
      </div>
    </main>
  );
}
