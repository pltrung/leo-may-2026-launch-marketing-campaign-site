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

      <div className="flex flex-col items-center w-full max-w-lg mx-auto h-full pt-6 pb-5 overflow-hidden gap-5 sm:gap-6">
        {/* 1. Greeting + 2. Team identity + icon (attached) */}
        <div className="shrink-0 text-center">
          <p className="font-body text-white/90 text-[1rem] sm:text-[1.1rem]">
            Hi {firstName},
          </p>
          <p className="font-headline text-white text-[1.2rem] sm:text-[1.4rem] tracking-headline mt-1">
            You joined: <span style={{ color: accent }}>Team {cloud.name}</span>
          </p>
          <p className="font-medium text-white/90 text-[0.95rem] sm:text-[1rem] mt-0.5" style={{ borderBottom: `2px solid ${accent}`, display: "inline-block", paddingBottom: 2 }}>
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

        {/* 3. Logo: 160–200px desktop, 120–140px mobile */}
        <div className="shrink-0">
          <img
            src="/logo-white.svg"
            alt="Leo Mây"
            className="w-[120px] sm:w-[140px] md:w-[180px] h-auto object-contain"
          />
        </div>

        {/* 4. IP countdown: 220–260px desktop, 160–200px mobile, dominant */}
        <div className="shrink-0">
          <img
            src="/brand/ip-count-down.svg"
            alt=""
            className="w-[160px] sm:w-[200px] md:w-[240px] h-auto object-contain animate-ip-float"
          />
        </div>

        {/* 5. Trait + Progress */}
        <div className="shrink-0 w-[80%] sm:w-[60%] flex flex-col items-center gap-3">
          <p
            className="font-caption text-center text-sm"
            style={{ color: traitUnlocked ? accent : "rgba(255,255,255,0.6)" }}
          >
            {traitUnlocked
              ? cloud.traitUnlocked ?? "Your cloud is forming."
              : "Your cloud is forming…"}
          </p>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
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
            className="font-caption text-[10px] sm:text-xs tracking-widest uppercase"
            style={{ color: accent, opacity: 0.8 }}
          >
            {traitUnlocked
              ? "100% to unlock cloud trait"
              : `${100 - progressPct}% to unlock trait`}
          </p>
        </div>

        {/* 6. Share button - 16px below progress */}
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

        {/* 7. Countdown - 24px below share, larger boxes */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 shrink-0 mt-1">
          {[
            { v: pad(days), l: "D" },
            { v: pad(hours), l: "H" },
            { v: pad(minutes), l: "M" },
            { v: pad(seconds), l: "S" },
          ].map((b, i) => (
            <div key={b.l} className="flex items-center gap-1 sm:gap-2">
              <div
                className="rounded-xl flex flex-col items-center justify-center min-w-[60px] min-h-[60px] sm:min-w-[70px] sm:min-h-[70px] md:min-w-[84px] md:min-h-[84px]"
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  boxShadow: "0 0 20px rgba(255,255,255,0.15)",
                }}
              >
                <span className="font-headline text-2xl sm:text-3xl md:text-4xl text-white tabular-nums tracking-headline">
                  {b.v}
                </span>
                <span className="font-caption text-white/60 text-[10px] sm:text-xs mt-0.5">{b.l}</span>
              </div>
              {i < 3 && <span className="font-headline text-white/40 text-lg sm:text-xl -mb-6">:</span>}
            </div>
          ))}
        </div>

        {/* 8. Ethos */}
        <div className="shrink-0 text-center mt-auto">
          <p className="font-subheadline text-white text-sm sm:text-base">
            Climb the Clouds. Build a Culture.
          </p>
          <p className="font-caption text-white/60 text-xs mt-1">Ho Chi Minh City — 2026</p>
        </div>
      </div>
    </main>
  );
}
