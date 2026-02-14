"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getUser } from "@/lib/userStorage";
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

export default function CountdownPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const teamCount = useTeamCount((user?.team ?? "may_nhe") as CloudType);
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
      <div className="absolute inset-0 -z-10 opacity-10 pointer-events-none" aria-hidden>
        <img src="/brand/background.svg" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 -z-10 opacity-[0.08] pointer-events-none" aria-hidden>
        <img src="/brand/holds.svg" alt="" className="w-full h-full object-cover" />
      </div>

      <div className="flex flex-col items-center justify-between w-full max-w-md mx-auto h-full py-1 sm:py-2 overflow-hidden gap-0.5 sm:gap-1">
        {/* 1. Hi [Name] + Team */}
        <div className="text-center shrink-0">
          <p className="font-body text-white/90 text-sm sm:text-base">
            Hi {firstName},
          </p>
          <p className="font-subheadline text-white text-sm sm:text-base">
            You joined: <span style={{ color: accent }}>Team {cloud.name} — {cloud.nameEn}</span>
          </p>
          <div
            className="h-0.5 w-12 mx-auto mt-1 rounded-full"
            style={{ backgroundColor: accent, opacity: 0.8 }}
          />
        </div>

        {/* 2. Team icon (minimal animation) */}
        <div
          className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center animate-pulse"
          style={{ color: accent }}
        >
          <CloudIconByType cloudId={cloud.id} className="w-full h-full" />
        </div>

        {/* 3. Logo */}
        <div className="shrink-0">
          <img
            src="/logo-white.svg"
            alt="Leo Mây"
            className="w-[70px] sm:w-[90px] h-auto object-contain"
          />
        </div>

        {/* 4. IP countdown */}
        <div className="shrink-0 w-[32%] sm:w-[36%] max-w-[140px]">
          <img
            src="/brand/ip-count-down.svg"
            alt=""
            className="w-full h-auto object-contain animate-ip-float"
          />
        </div>

        {/* 5. Trait (locked/unlocked) */}
        <div className="shrink-0 text-center px-2">
          <p
            className="font-caption text-xs sm:text-sm"
            style={{ color: traitUnlocked ? accent : "rgba(255,255,255,0.6)" }}
          >
            {traitUnlocked
              ? cloud.traitUnlocked ?? "Your cloud is forming."
              : "Your cloud is forming…"}
          </p>
        </div>

        {/* 6. Progress bar */}
        <div className="shrink-0 w-full max-w-[180px]">
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: accent }}
            />
          </div>
          <p className="font-caption text-white/70 text-[10px] sm:text-xs text-center mt-0.5">
            {teamCount} member{teamCount !== 1 ? "s" : ""} · {progressPct}%
          </p>
        </div>

        {/* 7. Share button */}
        <button
          type="button"
          onClick={() => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/?team=${cloud.id}`;
            navigator.clipboard?.writeText(url).then(() => {});
          }}
          className="shrink-0 px-4 py-2 rounded-full font-subheadline text-xs sm:text-sm border-2 transition-colors hover:opacity-90"
          style={{ borderColor: accent, color: accent }}
        >
          Share your cloud
        </button>

        {/* 8. Countdown */}
        <div className="flex items-center justify-center gap-0.5 sm:gap-1 shrink-0">
          {[
            { v: pad(days), l: "D" },
            { v: pad(hours), l: "H" },
            { v: pad(minutes), l: "M" },
            { v: pad(seconds), l: "S" },
          ].map((b, i) => (
            <div key={b.l} className="flex items-center gap-1">
              <div
                className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg min-w-[38px] sm:min-w-[46px] flex flex-col items-center"
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  boxShadow: "0 0 12px rgba(255,255,255,0.1)",
                }}
              >
                <span className="font-headline text-base sm:text-lg text-white tabular-nums tracking-headline">
                  {b.v}
                </span>
                <span className="font-caption text-white/60 text-[10px] sm:text-xs">{b.l}</span>
              </div>
              {i < 3 && <span className="font-headline text-white/40 text-sm -mb-4">:</span>}
            </div>
          ))}
        </div>

        {/* 9. Ethos */}
        <div className="shrink-0 text-center">
          <p className="font-subheadline text-white text-xs sm:text-sm">
            Climb the Clouds. Build a Culture.
          </p>
          <p className="font-caption text-white/60 text-[10px] sm:text-xs mt-0.5">Ho Chi Minh City — 2026</p>
        </div>
      </div>
    </main>
  );
}
