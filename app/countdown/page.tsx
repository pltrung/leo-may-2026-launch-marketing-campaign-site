"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getUser, clearUser } from "@/lib/userStorage";
import { getCloudById } from "@/lib/cloudData";
import type { CloudType } from "@/lib/cloudData";
import CloudIconByType from "@/components/CloudIcons";
import CloudFooter from "@/components/CloudFooter";
import { useCountdownHeroEntrance, CONTENT_STAGGER_MS, EASE_APPLE_IN_OUT, EASE_APPLE_SETTLE, EASE_MICRO_SETTLE } from "@/lib/enterCountdownHero";

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
  const { phase } = useCountdownHeroEntrance();
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
    <div
      className="min-h-[100dvh] md:min-h-[100svh] flex flex-col w-full"
      style={{ backgroundColor: "#0242FF" }}
    >
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 relative overflow-y-auto overflow-x-hidden min-h-0">
      <motion.button
        type="button"
        onClick={handleLogout}
        className="hidden md:flex absolute top-8 right-10 z-10 py-2 px-4 rounded-full border border-white/60 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/80 transition-colors items-center justify-center"
        aria-label="Log out"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "content" ? 1 : 0 }}
        transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[5] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
      >
        Log out
      </motion.button>
      <div className="fixed inset-0 -z-10 opacity-10 pointer-events-none" aria-hidden>
        <img src="/brand/background.svg" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="fixed inset-0 -z-10 opacity-[0.08] pointer-events-none" aria-hidden>
        <img src="/brand/holds.svg" alt="" className="w-full h-full object-cover" />
      </div>

      {/* Hero entrance: scale up → pause → settle (move+scale together) → micro-settle → rest → handoff */}
      <AnimatePresence>
        {(phase === "phase1-scale" || phase === "phase2-pause" || phase === "phase3-settle" || phase === "phase4-micro-settle" || phase === "phase5-rest") && (
          <motion.div
            className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none"
            initial={false}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_APPLE_IN_OUT }}
            aria-hidden
          >
            <motion.div
              className="countdown-ip flex items-center justify-center mx-auto origin-center"
              style={{ transformOrigin: "center center" }}
              initial={{ scale: 0.35, opacity: 0, y: "0vh" }}
              animate={{
                scale:
                  phase === "phase1-scale" || phase === "phase2-pause" ? 1.08 :
                  phase === "phase3-settle" ? 1 :
                  phase === "phase4-micro-settle" || phase === "phase5-rest" ? 0.998 : 1,
                y:
                  phase === "phase1-scale" || phase === "phase2-pause" ? "0vh" :
                  phase === "phase3-settle" ? "4vh" :
                  phase === "phase4-micro-settle" || phase === "phase5-rest" ? "4.02vh" : "4vh",
                opacity: 1,
              }}
              transition={
                phase === "phase1-scale"
                  ? { duration: 0.8, ease: EASE_APPLE_IN_OUT }
                  : phase === "phase2-pause"
                  ? { duration: 0 }
                  : phase === "phase3-settle"
                  ? { duration: 0.9, ease: EASE_APPLE_SETTLE }
                  : phase === "phase4-micro-settle"
                  ? { duration: 0.12, ease: EASE_MICRO_SETTLE }
                  : { duration: 0 }
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/ip-count-down.svg"
                alt=""
                className="w-full h-auto object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center w-full max-w-lg mx-auto flex-1 pt-4 pb-14 md:pb-3">
        {/* 1. Cloud card: You joined — max 2 lines, no icon */}
        <motion.div
          className="joined-card shrink-0 countdown-spacing-after-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[0] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          <p className="greeting">Hi {firstName},</p>
          <p className="team-name">
            You joined <span style={{ color: accent, textShadow: `0 0 12px ${accent}60` }}>Team {cloud.name}</span>
          </p>
        </motion.div>

        {/* 2. Logo */}
        <motion.div
          className="shrink-0 w-[min(90vw,200px)] sm:w-[min(85vw,240px)] md:w-[min(80vw,280px)] countdown-spacing-after-logo"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[1] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          <img
            src="/logo-white.svg"
            alt="Leo Mây"
            className="w-full h-auto object-contain"
          />
        </motion.div>

        {/* 3. IP — primary visual focus (visible when overlay settles in phase5, then floats) */}
        <motion.div
          className={`shrink-0 countdown-ip countdown-spacing-after-ip origin-center ${phase === "content" ? "countdown-ip-float" : ""}`}
          style={{
            transformOrigin: "center center",
            visibility: phase === "hidden" || phase === "phase1-scale" || phase === "phase2-pause" || phase === "phase3-settle" || phase === "phase4-micro-settle" ? "hidden" : "visible",
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: phase === "phase5-rest" || phase === "content" ? 1 : 0,
          }}
          transition={{
            duration: 0.5,
            delay: phase === "phase5-rest" ? 0.15 : 0,
            ease: EASE_APPLE_IN_OUT,
          }}
        >
          <img
            src="/brand/ip-count-down.svg"
            alt=""
            className="w-full h-auto object-contain"
          />
        </motion.div>

        {/* 4. Cloud progress — immersive referral copy */}
        <motion.div
          className="cloud-progress shrink-0 w-[85%] sm:w-[70%] max-w-[380px] flex flex-col items-center gap-2 leading-tight rounded-2xl px-4 py-3 countdown-spacing-after-progress"
          style={{
            backgroundColor: "rgba(255,255,255,0.95)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[2] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          <div className="progress-title font-caption text-center" style={{ color: traitUnlocked ? accent : "#1E2A38", opacity: traitUnlocked ? 1 : 0.7 }}>
            {traitUnlocked ? (cloud.traitUnlocked ?? "Your cloud reveals its true form.") : "Your cloud is gathering energy"}
          </div>
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
          <div className="progress-count font-caption text-xs sm:text-[0.85rem] font-medium" style={{ color: "#1E2A38", letterSpacing: "0.5px" }}>
            <span className="referral-current">{referralCount}</span>
            <span className="referral-total"> / 10</span> climbers joined your cloud
          </div>
          {!traitUnlocked && (
            <div className="progress-sub font-caption text-[10px] sm:text-[11px] text-storm/70 tracking-wide">
              Invite others to awaken its true form
            </div>
          )}
        </motion.div>

        {/* 6. Share button — referral link + toast */}
        <motion.button
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
          className="shrink-0 px-5 py-2.5 rounded-full font-subheadline text-sm border-2 transition-colors hover:opacity-90 countdown-spacing-after-share"
          style={{ borderColor: accentContrast, color: accentContrast }}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[5] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          Power your cloud
        </motion.button>

        {/* Countdown timer + winner message — directly below Share */}
        <motion.div
          className="countdown-timer-block shrink-0 w-full flex flex-col items-center countdown-spacing-after-timer"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[3] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          <div className="flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 w-full max-w-full px-1">
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
          <p className="countdown-winner-text text-center text-white/60 text-[0.7rem] sm:text-[0.75rem] max-w-[280px] mt-3 leading-tight">
            The team with the most climbers when the countdown ends will receive a special prize.
          </p>
        </motion.div>

        {shareToast && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="px-6 py-4 rounded-xl bg-white/95 shadow-lg text-storm font-medium animate-fade-out-2s">
              Link copied. Share it to grow your cloud.
            </div>
          </div>
        )}

        {/* Leaderboard — after countdown */}
        <motion.div
          className="shrink-0 flex flex-col items-center w-full max-w-[320px] relative countdown-spacing-after-leaderboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[4] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          <div className="absolute inset-0 rounded-2xl leaderboard-shimmer pointer-events-none -z-10" aria-hidden />
          <p className="sky-header font-medium text-white text-center">
            The Sky is Shifting
          </p>
          <p className="sky-sub font-caption text-white/90 text-center">
            Which cloud will rise?
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
                  className={`leaderboard-card flex flex-row items-center justify-between transition-all duration-300 ${idx === 0 ? "rank-1" : ""} ${isUserTeam ? "leaderboard-card-highlight animate-leaderboard-glow scale-[1.02]" : ""}`}
                  style={{
                    ...(isUserTeam ? { ["--glow-color" as string]: glowColor, color: highlightColor } : { color: "rgba(255,255,255,0.95)" }),
                  }}
                >
                  <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
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
                    <div className="leaderboard-text flex flex-col min-w-0">
                      <p className={`team-name font-medium text-[0.8rem] sm:text-[0.9rem] leading-tight ${isUserTeam ? "font-bold" : ""}`}>
                        Team {entry.name}
                      </p>
                      <p className="team-count font-caption text-white/60 text-[0.7rem] mt-0.5">
                        {entry.count} climber{entry.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div
                    className="team-icon-right shrink-0 flex items-center justify-center"
                    style={{ color: entry.accentHex }}
                  >
                    <CloudIconByType cloudId={entry.id as CloudType} className="w-[42px] h-[42px]" />
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
                  <div className="flex flex-row items-center justify-between gap-3">
                    <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
                      <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: accentContrast, color: isGiong ? "#0242FF" : (cloud.joinTextHex ?? "#1E2A38") }}>
                        #{rank}
                      </div>
                      <div className="leaderboard-text flex flex-col min-w-0">
                        <p className="font-bold text-white text-[0.9rem] sm:text-[1rem]">Team {cloud.name}</p>
                        <p className="font-caption text-white/70 text-[0.75rem] mt-0.5">
                          {teamCount} climber{teamCount !== 1 ? "s" : ""}
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
                    <div
                      className="team-icon-right shrink-0 flex items-center justify-center"
                      style={{ color: accentContrast }}
                    >
                      <CloudIconByType cloudId={cloud.id} className="w-[42px] h-[42px]" />
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </motion.div>

        {/* Mobile logout — bottom center above footer */}
        <motion.div
          className="logout-mobile md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[5] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          <button
            type="button"
            onClick={handleLogout}
            className="logout-mobile-btn"
            aria-label="Log out"
          >
            Log out
          </button>
        </motion.div>
      </div>
      </main>
      <motion.footer
        className="flex-shrink-0 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "content" ? 1 : 0 }}
        transition={{
          duration: 1.1,
          delay: phase === "content" ? CONTENT_STAGGER_MS[5] / 1000 + 0.25 : 0,
          ease: EASE_APPLE_IN_OUT,
        }}
      >
        <CloudFooter />
      </motion.footer>
    </div>
  );
}
