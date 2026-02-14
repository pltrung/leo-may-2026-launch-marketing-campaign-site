"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearUser } from "@/lib/userStorage";
import { getCloudById } from "@/lib/cloudData";
import type { CloudType } from "@/lib/cloudData";
import CloudIconByType from "@/components/CloudIcons";

const TARGET = new Date("2026-01-01T00:00:00+07:00");
const TRAIT_THRESHOLD = 50;

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

function useTeamCount(teamId: CloudType) {
  const [teamCount, setTeamCount] = useState(1);
  useEffect(() => {
    fetch(`/api/team-count?team=${teamId}`)
      .then((r) => r.json())
      .then((d) => setTeamCount(d.count ?? 1))
      .catch(() => {});
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
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setTeams(d.teams ?? []))
      .catch(() => {});
  }, []);
  return teams;
}

export default function CountdownPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const teamCount = useTeamCount((user?.team ?? "may_nhe") as CloudType);
  const leaderboard = useLeaderboard();
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
  }, [user, router]);

  const handleLogout = () => {
    clearUser();
    router.replace("/");
  };

  if (!user) return null;

  const cloud = getCloudById(user.team);
  if (!cloud) return null;

  const accent = cloud.accentHex;
  const firstName = user.name.trim().split(/\s+/)[0] || "there";
  const pad = (n: number) => String(n).padStart(2, "0");
  const threshold = cloud.traitThreshold ?? TRAIT_THRESHOLD;
  const traitUnlocked = teamCount >= threshold;
  const progressPct = Math.min(100, Math.round((teamCount / threshold) * 100));

  return (
    <main
      className="h-screen min-h-[100dvh] max-h-screen overflow-hidden flex flex-col items-center justify-center px-4 py-4 relative"
      style={{ backgroundColor: "#0242FF" }}
    >
      <button
        type="button"
        onClick={handleLogout}
        className="absolute top-6 right-6 md:top-8 md:right-10 z-10 px-4 py-2 rounded-full border border-white/60 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/80 transition-colors"
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

      <div className="flex flex-col items-center w-full max-w-lg mx-auto h-full pt-5 pb-4 overflow-hidden gap-[0.85em] sm:gap-[0.9em]">
        {/* 1. Greeting + 2. Team identity + icon (attached) */}
        <div className="shrink-0 text-center">
          <p className="font-body text-white/90 text-[1.05rem] sm:text-[1.16rem]">
            Hi {firstName},
          </p>
          <p className="font-headline font-bold text-white text-[1.26rem] sm:text-[1.47rem] tracking-headline mt-1">
            You joined: <span style={{ color: accent }}>Team {cloud.name}</span>
          </p>
          <p className="font-medium text-white/90 text-[1rem] sm:text-[1.05rem] mt-0.5" style={{ borderBottom: `2px solid ${accent}`, display: "inline-block", paddingBottom: 2 }}>
            {cloud.nameEn}
          </p>
          {/* Team icon: 12px below headline, 28–36px */}
          <div
            className="mt-3 flex justify-center animate-pulse"
            style={{ color: accent }}
          >
            <CloudIconByType cloudId={cloud.id} className="w-[28px] h-[28px] sm:w-[36px] sm:h-[36px]" />
          </div>
        </div>

        {/* 3. Logo: +12% size */}
        <div className="shrink-0">
          <img
            src="/logo-white.svg"
            alt="Leo Mây"
            className="w-[134px] sm:w-[157px] md:w-[202px] h-auto object-contain"
          />
        </div>

        {/* 4. IP countdown: +10% size */}
        <div className="shrink-0">
          <img
            src="/brand/ip-count-down.svg"
            alt=""
            className="w-[176px] sm:w-[220px] md:w-[264px] h-auto object-contain animate-ip-float"
          />
        </div>

        {/* 5. Trait + Progress */}
        <div className="shrink-0 w-[80%] sm:w-[60%] flex flex-col items-center gap-2.5">
          <p
            className="font-caption text-center text-[0.95rem] sm:text-[1rem]"
            style={{ color: traitUnlocked ? accent : "rgba(255,255,255,0.6)" }}
          >
            {traitUnlocked
              ? cloud.traitUnlocked ?? "Your cloud is forming."
              : "Your cloud is forming…"}
          </p>
          <div
            className="w-full h-[10px] rounded-full overflow-hidden"
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              boxShadow: `0 0 12px ${accent}40`,
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: accent }}
            />
          </div>
          <p
            className="font-caption text-xs sm:text-[0.85rem] uppercase"
            style={{ color: accent, opacity: 0.8, letterSpacing: "1px" }}
          >
            {traitUnlocked
              ? "100% to unlock cloud trait"
              : `${100 - progressPct}% to unlock cloud trait`}
          </p>
          <p
            className="font-caption text-[10px] sm:text-[11px] text-white/50 tracking-wide"
            style={{ opacity: 0.85 }}
          >
            100% reveals your team&apos;s defining energy.
          </p>
        </div>

        {/* 6. Share button */}
        <button
          type="button"
          onClick={() => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/?team=${cloud.id}`;
            navigator.clipboard?.writeText(url).then(() => {});
          }}
          className="shrink-0 px-5 py-2.5 rounded-full font-subheadline text-sm border-2 transition-colors hover:opacity-90 -mt-1"
          style={{ borderColor: accent, color: accent }}
        >
          Share your cloud
        </button>

        {/* 7. Countdown - +20% font, slightly larger boxes */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 shrink-0 mt-0.5">
          {[
            { v: pad(days), l: "D" },
            { v: pad(hours), l: "H" },
            { v: pad(minutes), l: "M" },
            { v: pad(seconds), l: "S" },
          ].map((b, i) => (
            <div key={b.l} className="flex items-center gap-1 sm:gap-2">
              <div
                className="rounded-xl flex flex-col items-center justify-center min-w-[64px] min-h-[64px] sm:min-w-[74px] sm:min-h-[74px] md:min-w-[88px] md:min-h-[88px] px-2 py-2"
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  boxShadow: "0 0 20px rgba(255,255,255,0.15)",
                }}
              >
                <span className="font-headline font-bold text-[1.875rem] sm:text-[2.25rem] md:text-[3rem] text-white tabular-nums tracking-headline">
                  {b.v}
                </span>
                <span className="font-caption text-white/60 text-[10px] sm:text-xs mt-0.5">{b.l}</span>
              </div>
              {i < 3 && <span className="font-headline text-white/40 text-lg sm:text-xl -mb-6">:</span>}
            </div>
          ))}
        </div>

        {/* 8. Leaderboard */}
        <div className="shrink-0 flex flex-col items-center gap-1.5 w-full max-w-[280px]">
          <p className="font-medium text-white/70 text-xs sm:text-[0.85rem] tracking-wide">
            Top Clouds Right Now
          </p>
          <div className="flex flex-col gap-0.5 w-full">
            {leaderboard.slice(0, 3).map((entry, idx) => {
              const isUserTeam = entry.id === cloud.id;
              return (
                <div
                  key={entry.id}
                  className={`font-medium text-white/90 text-[0.8rem] sm:text-[0.9rem] leading-tight py-0.5 px-2 rounded transition-colors ${isUserTeam ? "font-bold animate-leaderboard-glow" : ""}`}
                  style={isUserTeam ? { color: entry.accentHex, ["--glow-color" as string]: entry.accentHex } : {}}
                >
                  {idx + 1}. Team {entry.name} — {entry.count} member{entry.count !== 1 ? "s" : ""}
                </div>
              );
            })}
          </div>
          {leaderboard.length > 0 && !leaderboard.slice(0, 3).some((e) => e.id === cloud.id) && (
            <div className="mt-1 pt-1 border-t border-white/20 w-full">
              <p className="font-medium text-white/70 text-[0.75rem] sm:text-[0.8rem]">Your Team:</p>
              {(() => {
                const idx = leaderboard.findIndex((e) => e.id === cloud.id);
                const rank = idx >= 0 ? idx + 1 : leaderboard.length + 1;
                const thirdCount = leaderboard[2]?.count ?? teamCount;
                const diff = Math.max(1, thirdCount - teamCount);
                return (
                  <p
                    className="font-medium text-[0.8rem] sm:text-[0.85rem] mt-0.5"
                    style={{ color: accent }}
                  >
                    #{rank} Team {cloud.name} — {teamCount} member{teamCount !== 1 ? "s" : ""}
                    {rank > 3 && diff > 0 && (
                      <span className="text-white/60 text-[0.7rem] block mt-0.5">
                        +{diff} to reach #3
                      </span>
                    )}
                  </p>
                );
              })()}
            </div>
          )}
        </div>

        {/* 9. Ethos */}
        <div className="shrink-0 text-center mt-auto">
          <p className="font-subheadline font-bold text-white text-[0.95rem] sm:text-[1.05rem]">
            Climb the Clouds. Build a Culture.
          </p>
          <p className="font-caption text-white/60 text-[0.7rem] sm:text-xs mt-1">Ho Chi Minh City — 2026</p>
        </div>
      </div>
    </main>
  );
}
