"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getUser, clearUser } from "@/lib/userStorage";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { getCloudById } from "@/lib/cloudData";
import type { CloudType } from "@/lib/cloudData";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";
import CloudIconByType from "@/components/CloudIcons";
import CloudFooter from "@/components/CloudFooter";
import SafeLanguageSwitch from "@/components/SafeLanguageSwitch";
import AboutUsModal from "@/components/AboutUsModal";
import PowerYourCloudShareModal, { buildShareMessage } from "@/components/PowerYourCloudShareModal";
import PowerYourCloudModal from "@/components/PowerYourCloudModal";
import { useCountdownHeroEntrance, CONTENT_STAGGER_MS, EASE_APPLE_IN_OUT, EASE_APPLE_SETTLE, EASE_MICRO_SETTLE } from "@/lib/enterCountdownHero";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";
import { useLocale } from "@/components/LocaleProvider";
import { getMascotPartColors, type MascotPartColors } from "@/lib/mascotSpeciesColors";
import {
  getEvolutionLevel,
  getXpInLevel,
  getXpRequiredForLevel,
  getLevelProgressFraction,
  getNextFormName,
  getLevelName,
} from "@/lib/evolutionLevels";
import { backendTierToDisplay, ASCENSION_TIERS, getProgressToNextTier } from "@/lib/tiers";
import AscensionTimeline from "@/components/AscensionTimeline";
import EvolutionCeremonyModal, { LAST_SEEN_TIER_KEY } from "@/components/EvolutionCeremonyModal";
import VerifyToEvolveModal from "@/components/VerifyToEvolveModal";
import CountdownIntroModal from "@/components/CountdownIntroModal";
import AnnouncementModal from "@/components/AnnouncementModal";
import { SOCIAL_LINKS } from "@/lib/announcementConfig";
import { ANNOUNCEMENT_ID, LAST_SEEN_ANNOUNCEMENT_KEY } from "@/lib/announcementConfig";
import { getAscensionEnergyVars } from "@/lib/ascensionEnergy";
import VerificationModal from "@/components/VerificationModal";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { HERO_BG } from "@/lib/heroConstants";

const HeroStarfield = dynamic(
  () => import("@/components/HeroStarfield").catch(() => ({ default: () => null })),
  { ssr: false }
);

const PENDING_REF_CODE_KEY = "leo_may_pending_ref_code";
const COUNTDOWN_INTRO_VIEW_COUNT_KEY = "leo_may_countdown_intro_view_count";
const COUNTDOWN_INTRO_MAX_VIEWS = 3;
/** Once per session: intro ("what this page is") is the first popup on countdown. */
const COUNTDOWN_INTRO_SESSION_KEY = "leo_may_countdown_intro_seen_this_session";

/** Mascot SVG path by evolution stage index (0–5). Index 5 uses cloud-specific hero final (ip-hero-final-{cloud}). */
const COUNTDOWN_MASCOT_BY_STAGE = [
  "/brand/ip-sleeping.svg",
  "/brand/ip-waking-up.svg",
  "/brand/ip-looking-around.svg",
  "/brand/ip-energized.svg",
  "/brand/ip-on-cloud-evo.svg",
  "/brand/ip-count-down.svg", // fallback; tier 5 uses getFinalMascotSrc(cloudId)
] as const;

/** Final evolution (tier 5) per-cloud hero image: ip-hero-final-may-nhe, ip-hero-final-suong-mu, etc. */
function getFinalMascotSrc(cloudId: string): string {
  const slug = cloudId.replace(/_/g, "-");
  return `/brand/ip-hero-final-${slug}.svg`;
}

/** Scale factors so each evo’s character appears similar size to sleeping (evo 0). Evos 2–5 (and final hero 1024×1024) use same scale. */
const MASCOT_SCALE_BY_STAGE: number[] = [
  1,
  1410 / 1024,
  (1410 / 1024) * 0.88,
  (1410 / 1024) * 0.88,
  (1410 / 1024) * 0.88,
  (1410 / 1024) * 0.88, // final hero SVGs are 1024×1024; same as evos 2–4
];

/** Evolution stages 0 and 1 (sleeping, waking-up): left eye stays open and blue; only right eye gets species color. */
const EVO_LEFT_EYE_FIXED_BLUE = [0, 1];

/** Applies species colors to mascot SVG groups via object ref when loaded. Re-applies when partColors (cloud type) changes.
 * For evo 0–1 (sleeping, waking-up), left eye is never recolored so it stays blue; only right eye gets partColors. */
function MascotSvgObject({
  src,
  partColors,
  cloudId,
  evolutionStageIndex,
}: {
  src: string;
  partColors: MascotPartColors;
  cloudId: string;
  /** 0–5; when 0 or 1, left eye is not recolored (stays blue). */
  evolutionStageIndex?: number;
}) {
  const objectRef = useRef<HTMLObjectElement>(null);
  const leftEyeFixedBlue = evolutionStageIndex !== undefined && EVO_LEFT_EYE_FIXED_BLUE.includes(evolutionStageIndex);

  const applyColors = useCallback(
    (doc: Document | null) => {
      if (!doc) return;
      const eyeLeft = doc.getElementById("eye-left") as SVGElement | null;
      const eyeRight = doc.getElementById("eye-right") as SVGElement | null;
      const ribbonEl = doc.getElementById("ribbon") as SVGElement | null;
      const mascotRibbon = doc.getElementById("mascot-ribbon") as SVGElement | null;
      const scarfId =
        evolutionStageIndex !== undefined && evolutionStageIndex <= 4
          ? `mascot-scarf-${evolutionStageIndex}`
          : "mascot-scarf";
      const mascotScarf = doc.getElementById(scarfId) as SVGElement | null;
      const mascotScarf2 = doc.getElementById("mascot-scarf-2") as SVGElement | null;
      const cloudOutline = doc.getElementById("cloud-outline") as SVGElement | null;
      const mascotLeftEyes = doc.getElementById("mascot-left-eyes") as SVGElement | null;
      const mascotAura = doc.getElementById("mascot-aura") as SVGElement | null;
      const mascotParticles = doc.getElementById("mascot-particles") as SVGElement | null;

      const setFill = (el: SVGElement, value: string) => {
        el.style.setProperty("fill", value, "important");
      };
      const setFillRecursive = (el: SVGElement, value: string) => {
        setFill(el, value);
        el.querySelectorAll("path, circle, ellipse, polygon, polyline").forEach((child) => setFill(child as SVGElement, value));
      };
      const mascotRightEyes = doc.getElementById("mascot-right-eyes") as SVGElement | null;
      if (!leftEyeFixedBlue) {
        if (eyeLeft) setFill(eyeLeft, partColors.eyeLeft);
        if (mascotLeftEyes) setFill(mascotLeftEyes, partColors.eyeLeft);
      }
      if (eyeRight) setFill(eyeRight, partColors.eyeRight);
      if (mascotRightEyes) setFill(mascotRightEyes, partColors.eyeRight);
      if (mascotRibbon) setFill(mascotRibbon, partColors.nose);
      if (ribbonEl) setFill(ribbonEl, partColors.nose);
      if (mascotScarf) setFillRecursive(mascotScarf, partColors.scarf);
      if (mascotScarf2) setFillRecursive(mascotScarf2, partColors.scarf);
      if (cloudOutline) {
        cloudOutline.style.setProperty("stroke", partColors.cloudOutline, "important");
        if (!cloudOutline.hasAttribute("stroke-width")) cloudOutline.setAttribute("stroke-width", "2");
      }
      if (mascotAura) mascotAura.setAttribute("opacity", "0");
      if (mascotParticles) mascotParticles.setAttribute("opacity", "0");
    },
    [partColors.eyeLeft, partColors.eyeRight, partColors.nose, partColors.scarf, partColors.cloudOutline, leftEyeFixedBlue, evolutionStageIndex]
  );

  useEffect(() => {
    const el = objectRef.current;
    if (!el) return;

    const tryApply = () => applyColors(el.contentDocument);

    const onLoad = () => {
      tryApply();
      setTimeout(tryApply, 0);
      setTimeout(tryApply, 50);
      setTimeout(tryApply, 150);
    };
    const doc = el.contentDocument;
    if (doc?.readyState === "complete") {
      tryApply();
    } else {
      el.addEventListener("load", onLoad);
    }
    tryApply();
    const t1 = setTimeout(tryApply, 100);
    const t2 = setTimeout(tryApply, 350);
    const t3 = setTimeout(tryApply, 600);
    const t4 = setTimeout(tryApply, 1000);
    return () => {
      el.removeEventListener("load", onLoad);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [applyColors, cloudId, evolutionStageIndex]);

  return (
    <object
      ref={objectRef}
      data={src}
      type="image/svg+xml"
      aria-hidden
      className="w-full h-auto object-contain pointer-events-none"
    />
  );
}

/** Applies cloud-outline color to the countdown clouds SVG (used behind evo 1–5). */
function CountdownCloudsLayer({ partColors }: { partColors: MascotPartColors }) {
  const objectRef = useRef<HTMLObjectElement>(null);
  const applyCloudOutline = useCallback(
    (doc: Document | null) => {
      if (!doc) return;
      const cloudOutline = doc.getElementById("cloud-outline") as SVGElement | null;
      if (cloudOutline) {
        cloudOutline.style.setProperty("stroke", partColors.cloudOutline, "important");
        if (!cloudOutline.hasAttribute("stroke-width")) cloudOutline.setAttribute("stroke-width", "2");
      }
    },
    [partColors.cloudOutline]
  );
  useEffect(() => {
    const el = objectRef.current;
    if (!el) return;
    const tryApply = () => applyCloudOutline(el.contentDocument);
    const onLoad = () => tryApply();
    if (el.contentDocument?.readyState === "complete") tryApply();
    else el.addEventListener("load", onLoad);
    tryApply();
    const t1 = setTimeout(tryApply, 100);
    const t2 = setTimeout(tryApply, 350);
    return () => {
      el.removeEventListener("load", onLoad);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [applyCloudOutline]);
  return (
    <object
      ref={objectRef}
      data="/brand/countdown-clouds.svg"
      type="image/svg+xml"
      className="w-full h-full min-h-full object-contain"
      aria-hidden
    />
  );
}

/** Background + holds (ms); hero entrance starts after this. */
const COUNTDOWN_BG_FADE_MS = 1000;

/** Countdown target: December 1st 2026, 00:00 Vietnam (UTC+7) */
const TARGET = new Date("2026-12-01T00:00:00+07:00");
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

import { useWaitlist } from "@/lib/useWaitlist";

function CountdownPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromMist = searchParams.get("fromMist") === "1";
  const debugPerf = searchParams.get("debugPerf") === "1";
  const locale = useLocale();
  const [perfDelta, setPerfDelta] = useState<number>(0);
  const perfRef = useRef<number>(0);
  const perfAccRef = useRef<number>(0);
  const perfCountRef = useRef<number>(0);
  const messages = getMessages(locale);
  const t = messages.countdown;
  const tVerification = messages.verification;
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [shareModal, setShareModal] = useState<{ referralUrl: string; shareMessage: string } | null>(null);
  const [powerYourCloudModalOpen, setPowerYourCloudModalOpen] = useState(false);
  const [shareAuraPulseKey, setShareAuraPulseKey] = useState(0);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const { profile, refreshWaitlist } = useWaitlist(user?.email ?? undefined, user?.phone ?? undefined);
  const [tierBadgeGlow, setTierBadgeGlow] = useState(false);
  const [upgradeSuccessToast, setUpgradeSuccessToast] = useState(false);
  const [verificationSuccessOverlay, setVerificationSuccessOverlay] = useState(false);
  const [shouldAnimateVerifiedBadge, setShouldAnimateVerifiedBadge] = useState(false);
  const { phase } = useCountdownHeroEntrance({ startDelay: COUNTDOWN_BG_FADE_MS });
  const teamCount = useTeamCount((user?.team ?? "may_nhe") as CloudType);
  const leaderboard = useLeaderboard();
  const { days, hours, minutes, seconds } = useCountdown();

  useEffect(() => {
    if (!shouldAnimateVerifiedBadge || !profile.isVerified) return;
    const t = setTimeout(() => setShouldAnimateVerifiedBadge(false), 400);
    return () => clearTimeout(t);
  }, [shouldAnimateVerifiedBadge, profile.isVerified]);
  const [prevLeaderboardOrder, setPrevLeaderboardOrder] = useState<string>("");
  const [skyUnstable, setSkyUnstable] = useState(false);
  const prevLevelIndexRef = useRef<number>(-1);
  const ceremonyShownOrDismissedRef = useRef(false);
  const [levelUpFlash, setLevelUpFlash] = useState(false);
  const [evolutionCeremony, setEvolutionCeremony] = useState<{ displayTier: number } | null>(null);
  const [showVerifyToEvolve, setShowVerifyToEvolve] = useState(false);
  const [showCountdownIntro, setShowCountdownIntro] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // Announcement (social) shows after the countdown intro; intro is always the first popup.
  useEffect(() => {
    if (phase !== "content" || showAnnouncement || showCountdownIntro) return;
    let lastSeen = -1;
    try {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem(LAST_SEEN_ANNOUNCEMENT_KEY);
        if (stored != null && stored !== "") lastSeen = parseInt(stored, 10);
      }
    } catch {
      // ignore
    }
    if (Number.isNaN(lastSeen)) lastSeen = -1;
    if (ANNOUNCEMENT_ID > lastSeen) setShowAnnouncement(true);
  }, [phase, showAnnouncement, showCountdownIntro]);

  // Countdown intro ("what this page is") is always the first popup every time (once per session). Then announcement, then verify/ceremony.
  useEffect(() => {
    if (phase !== "content") return;
    if (showAnnouncement) return;
    let seenIntroThisSession = false;
    try {
      if (typeof window !== "undefined") seenIntroThisSession = window.sessionStorage.getItem(COUNTDOWN_INTRO_SESSION_KEY) === "1";
    } catch {
      // ignore
    }
    if (!seenIntroThisSession) {
      setShowCountdownIntro(true);
      setShowVerifyToEvolve(false);
      return;
    }
    if (!profile.isVerified) {
      setShowVerifyToEvolve(true);
      return;
    }
    setShowVerifyToEvolve(false);
    setShowCountdownIntro(false);
    if (ceremonyShownOrDismissedRef.current) return;
    if (evolutionCeremony !== null) return;
    ceremonyShownOrDismissedRef.current = true;
    const currentTier = backendTierToDisplay(profile.tierLevel);
    setEvolutionCeremony({ displayTier: currentTier });
  }, [phase, profile.tierLevel, profile.isVerified, evolutionCeremony, showAnnouncement]);

  useEffect(() => {
    const order = leaderboard.slice(0, 3).map((e) => e.id).join(",");
    if (prevLeaderboardOrder && order !== prevLeaderboardOrder) {
      setSkyUnstable(true);
      const t = setTimeout(() => setSkyUnstable(false), 4000);
      return () => clearTimeout(t);
    }
    setPrevLeaderboardOrder(order);
  }, [leaderboard, prevLeaderboardOrder]);

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    const refCode = searchParams.get("ref")?.trim();
    if (refCode && typeof window !== "undefined") {
      try {
        localStorage.setItem(PENDING_REF_CODE_KEY, refCode);
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  const upgradeSuccess = searchParams.get("upgrade") === "success";
  useEffect(() => {
    if (!upgradeSuccess || !user) return;
    refreshWaitlist();
    setTierBadgeGlow(true);
    const delayToast = setTimeout(() => setUpgradeSuccessToast(true), 600);
    const t1 = setTimeout(() => setTierBadgeGlow(false), 2000);
    const t2 = setTimeout(() => setUpgradeSuccessToast(false), 4000);
    return () => {
      clearTimeout(delayToast);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [upgradeSuccess, user?.email, user?.phone]);

  useEffect(() => {
    if (user === null) return;
    if (!user) {
      router.replace(`/${locale}`);
      return;
    }
    const searchParams = new URLSearchParams();
    if (user.email) searchParams.set("email", user.email);
    else if (user.phone) searchParams.set("phone", user.phone);
    else {
      getSupabaseBrowserClient().auth.signOut().catch(() => {});
      clearUser();
      router.replace(`/${locale}`);
      return;
    }
    fetch(`/api/waitlist/lookup?${searchParams}`)
      .then((r) => r.json())
      .then((d) => setVerified(!!d?.user))
      .catch(() => setVerified(false));
  }, [user, router, locale]);

  useEffect(() => {
    if (verified === false) {
      getSupabaseBrowserClient().auth.signOut().catch(() => {});
      clearUser();
      router.replace(`/${locale}`);
    }
  }, [verified, router, locale]);

  const perfMountedRef = useRef(true);
  useEffect(() => {
    perfMountedRef.current = true;
    return () => {
      perfMountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (!debugPerf) return;
    let rafId: number;
    const tick = (t: number) => {
      if (!perfMountedRef.current) return;
      if (perfRef.current) {
        const delta = t - perfRef.current;
        perfAccRef.current += delta;
        perfCountRef.current += 1;
        if (perfCountRef.current >= 30) {
          setPerfDelta(perfAccRef.current / perfCountRef.current);
          perfAccRef.current = 0;
          perfCountRef.current = 0;
        }
      }
      perfRef.current = t;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [debugPerf]);

  const handleLogout = () => {
    getSupabaseBrowserClient().auth.signOut().catch(() => {});
    clearUser();
    // Full page navigation to avoid client-side exception when unmounting countdown
    // and mounting home (avoids React state/async races during client-side nav).
    const path = typeof locale === "string" && locale ? `/${locale}` : "/en";
    window.location.href = path;
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
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralUrl = referralCode ? `${origin}/${locale}?ref=${referralCode}` : `${origin}/${locale}?team=${cloud.id}`;
  const shareMessage = buildShareMessage(locale, cloud, referralUrl);
  const traitUnlocked = profile.traitUnlocked || referralCount >= REFERRAL_UNLOCK;
  const currentLevel = getEvolutionLevel(referralCount);
  const xpInLevel = getXpInLevel(referralCount);
  const xpRequired = getXpRequiredForLevel(referralCount);
  const levelProgressFraction = getLevelProgressFraction(referralCount);
  const levelProgressPct = Math.min(100, Math.round(levelProgressFraction * 100));
  const nextFormName = getNextFormName(referralCount, locale);
  const currentLevelName = getLevelName(currentLevel, locale);

  const displayTierForBadge = backendTierToDisplay(profile.tierLevel);
  /** Mascot (IP) follows tier so it matches badge and title (e.g. 4 and 7 refs both tier 1 → same IP). */
  const evolutionStageIndex = displayTierForBadge;
  const tierProgress = getProgressToNextTier(displayTierForBadge, referralCount);
  const progressBarPct =
    tierProgress.isMaxTier || tierProgress.nextTierDelta <= 0
      ? 0
      : Math.min(100, (tierProgress.progressToNext / tierProgress.nextTierDelta) * 100);
  const progressLabelText = tierProgress.isMaxTier
    ? t.finalEvolutionReached
    : t.progressToNextTier
        .replace("{current}", String(tierProgress.progressToNext))
        .replace("{required}", String(tierProgress.nextTierDelta));
  const tierNameFromConfig = ASCENSION_TIERS[displayTierForBadge]
    ? (locale === "vi" ? ASCENSION_TIERS[displayTierForBadge].nameVi : ASCENSION_TIERS[displayTierForBadge].nameEn)
    : currentLevelName;
  const daysRemaining = days;
  const leadingTeamId = leaderboard[0]?.id ?? "";
  const skyDominant = leadingTeamId || "default";
  const evolutionAbilityText = t.evolutionAbility?.[evolutionStageIndex] ?? t.yourCloudGathering;
  const mascotPartColors = getMascotPartColors(cloud.id);

  return (
    <div
      className="min-h-[100dvh] md:min-h-[100svh] flex flex-col w-full relative countdown-page-root"
      data-sky-dominant={skyDominant}
      data-sky-unstable={skyUnstable ? "true" : "false"}
    >
      {debugPerf && (
        <div
          className="fixed top-2 left-2 z-[200] bg-black/80 text-green-400 text-xs font-mono p-2 rounded pointer-events-none"
          aria-live="polite"
        >
          <div>cloud: {cloud.id}</div>
          <div>frame Δ: {perfDelta.toFixed(1)}ms {perfDelta > 0 ? `(~${(1000 / perfDelta).toFixed(0)} fps)` : ""}</div>
        </div>
      )}
      <motion.div
        className="flex flex-col w-full flex-1 min-h-0 overflow-x-hidden"
        initial={{ opacity: fromMist ? 0 : 1 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: fromMist ? 0.8 : 0,
          delay: fromMist ? 0.1 : 0,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
      <main
        className="flex-1 flex flex-col items-center justify-center px-4 py-4 relative overflow-y-auto overflow-x-hidden min-h-0"
        style={{ zIndex: 10 }}
      >
      {/* VN/EN fixed bottom-left (mobile + desktop) */}
      <motion.div
        className="fixed bottom-6 left-6 z-[60] scale-90 opacity-80 md:scale-100 md:opacity-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "content" ? 1 : 0 }}
        transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[5] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        style={{ visibility: phase === "content" ? "visible" : "hidden", pointerEvents: phase === "content" ? "auto" : "none" }}
      >
        <SafeLanguageSwitch />

      </motion.div>
      {/* 1) Dark background — bottom layer */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: HERO_BG, zIndex: 1 }}
        aria-hidden
      />
      {/* 2) Starfield (twinkle, drift, shooting stars) — above dark, below all UI */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          width: "100%",
          height: "100%",
          minWidth: "100vw",
          minHeight: "100dvh",
        }}
        aria-hidden
      >
        <HeroStarfield heroTransitioning={false} />
      </div>

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

      {/* Desktop: About Us top-left, Log out top-right (fixed) */}
      <motion.button
        type="button"
        onClick={() => setAboutOpen(true)}
        className="about-btn-breathe hidden md:flex absolute top-8 left-10 z-10 py-2 px-4 rounded-full border border-white/60 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/80 hover:scale-[1.02] transition-all duration-300 items-center justify-center"
        aria-label={t.aboutUs}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "content" ? 1 : 0 }}
        transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[5] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        style={{ visibility: phase === "content" ? "visible" : "hidden", pointerEvents: phase === "content" ? "auto" : "none" }}
      >
        {t.aboutUs}
      </motion.button>
      <motion.button
        type="button"
        onClick={handleLogout}
        className="hidden md:flex absolute top-8 right-10 z-10 py-2 px-4 rounded-full border border-white/60 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/80 transition-colors items-center justify-center"
        aria-label={t.logOut}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "content" ? 1 : 0 }}
        transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[5] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        style={{ visibility: phase === "content" ? "visible" : "hidden", pointerEvents: phase === "content" ? "auto" : "none" }}
      >
        {t.logOut}
      </motion.button>

      <div
        className="flex flex-col items-center w-full max-w-lg mx-auto flex-1 pt-4 pb-14 md:pb-3"
        style={{ position: "relative", zIndex: 5 }}
      >
        <motion.div
          className="joined-card shrink-0 countdown-spacing-after-card"
          data-cloud-type={cloud.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[0] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          <p className="greeting flex items-center justify-center gap-2 flex-wrap">
            {t.hi} {firstName}
            {profile.isVerified && (
              <motion.span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: "#1DA1F2" }}
                initial={shouldAnimateVerifiedBadge ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                aria-label="Verified"
              >
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.span>
            )}
          </p>
          <p className="team-name">
            {t.youJoined} <span style={{ color: accent, textShadow: `0 0 12px ${accent}60` }}>Team {cloud.name}</span>
          </p>
        </motion.div>

        <motion.div
          className="shrink-0 relative z-10 w-[min(90vw,200px)] sm:w-[min(85vw,240px)] md:w-[min(80vw,280px)] countdown-spacing-after-logo"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[1] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          <Link href={`/${locale}`} className="block w-full h-auto" aria-label="Leo Mây — go to home">
            <img
              src="/logo-white.svg"
              alt="Leo Mây"
              className="w-full h-auto object-contain"
            />
          </Link>
        </motion.div>

        <motion.div
          className="shrink-0 countdown-mascot-wrapper countdown-spacing-after-ip flex flex-col items-center"
          data-cloud-type={cloud.id}
          style={getAscensionEnergyVars(cloud.id) as React.CSSProperties}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[2] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          <div className="mascot-ring" aria-hidden />
          <div className="evolution-mascot-inner">
            <motion.div
              className={`countdown-ip mascot-svg origin-center ${phase === "content" ? "countdown-ip-float" : ""}`}
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
              <div className="relative w-full">
                {/* Clouds behind mascot (evo 1–5 only); z-0 so IP always pops on top */}
                {evolutionStageIndex <= 4 && (
                  <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none" aria-hidden>
                    <CountdownCloudsLayer partColors={mascotPartColors} />
                  </div>
                )}
                {/* Mascot IP on top of clouds (like ip-count-down.svg). Colors applied in-place via MascotSvgObject (ribbon, scarf, etc. by ID), not a separate vector. Scale evos 1–5 so character size matches sleeping (evo 0). */}
                <div
                  className="relative z-10 flex items-center justify-center origin-center"
                  style={
                    evolutionStageIndex >= 1
                      ? {
                          transform: `scale(${MASCOT_SCALE_BY_STAGE[evolutionStageIndex]})`,
                          transformOrigin: "center center",
                        }
                      : undefined
                  }
                >
                  <MascotSvgObject
                    src={evolutionStageIndex === 5 ? getFinalMascotSrc(cloud.id) : COUNTDOWN_MASCOT_BY_STAGE[evolutionStageIndex]}
                    partColors={mascotPartColors}
                    cloudId={cloud.id}
                    evolutionStageIndex={evolutionStageIndex}
                  />
                </div>
              </div>
            </motion.div>
          </div>
          <motion.div
            className="evolution-title-capsule mt-1 countdown-spacing-after-identity"
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 999,
              padding: "10px 18px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.18), 0 0 18px rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{
              opacity: phase === "phase5-rest" || phase === "content" ? 1 : 0,
              y: phase === "phase5-rest" || phase === "content" ? 0 : 6,
            }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <p
              className="identity-rank font-caption text-center text-sm"
              style={{
                color: "rgba(0,0,0,0.9)",
                textShadow: "none",
                fontWeight: 600,
                opacity: 0.9,
              }}
            >
              <motion.span
                className={`inline-block px-3 py-1 rounded-full font-caption text-sm font-medium align-middle ${tierBadgeGlow ? "animate-tier-badge-glow" : ""}`}
                style={{
                  color: accent,
                  textShadow: `0 0 10px ${accent}50`,
                  background: `linear-gradient(135deg, ${accent}28 0%, ${accent}12 100%)`,
                  boxShadow: tierBadgeGlow ? `0 0 16px ${accent}60` : `0 0 12px ${accent}40`,
                }}
              >
                {t.youAreIdentity.replace("{identity}", tierNameFromConfig)}
              </motion.span>
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          className="cloud-progress countdown-progress-front shrink-0 w-[85%] sm:w-[70%] max-w-[380px] flex flex-col items-center gap-2 leading-tight rounded-2xl px-4 py-3 countdown-spacing-after-progress"
          style={{
            backgroundColor: "rgba(255,255,255,0.95)",
            boxShadow: levelUpFlash ? `0 0 24px ${accent}80` : "0 4px 20px rgba(0,0,0,0.08)",
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: phase === "content" ? 1 : 0,
            scale: levelUpFlash ? 1.03 : 1,
          }}
          transition={{
            opacity: { duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[2] / 1000 : 0, ease: EASE_APPLE_IN_OUT },
            scale: { duration: 0.25, ease: EASE_APPLE_IN_OUT },
          }}
        >
          <div className="progress-title font-caption text-center" style={{ color: traitUnlocked ? accent : "#1E2A38", opacity: traitUnlocked ? 1 : 0.7 }}>
            {t.auraProgressLabel}
          </div>
          {tierProgress.isMaxTier ? (
            <div className="mt-1 space-y-1">
              <p className="font-caption text-center text-sm" style={{ color: "#1E2A38", opacity: 0.9 }}>
                {progressLabelText}
              </p>
              <p className="font-caption text-center text-sm" style={{ color: "#1E2A38", opacity: 0.9 }}>
                {t.youHaveAwakened}{" "}
                <span style={{ color: accent, fontWeight: 600, textShadow: `0 0 10px ${accent}50` }}>{referralCount}</span>{" "}
                {referralCount === 1 ? t.climber : t.climbers}
              </p>
            </div>
          ) : (
            <>
              <div
                className="relative w-full h-9 min-h-[36px] rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: "rgba(0,0,0,0.1)",
                  boxShadow: `0 0 8px ${accent}50`,
                }}
                role="progressbar"
                aria-valuenow={tierProgress.progressToNext}
                aria-valuemin={0}
                aria-valuemax={tierProgress.nextTierDelta}
                aria-label={progressLabelText}
              >
                <motion.div
                  key={`tier-${displayTierForBadge}-${tierProgress.progressToNext}`}
                  className="absolute inset-y-0 left-0 min-w-0 rounded-full flex-shrink-0"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progressBarPct}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ backgroundColor: accent }}
                />
                <span
                  className="relative z-10 font-caption text-xs font-semibold text-center px-2 pointer-events-none"
                  style={{
                    color: progressBarPct > 50 ? "rgba(255,255,255,0.95)" : "#1E2A38",
                    textShadow: progressBarPct > 50 ? "0 0 8px rgba(0,0,0,0.3)" : "0 0 6px rgba(255,255,255,0.6)",
                  }}
                >
                  {progressLabelText}
                </span>
              </div>
              <p className="font-caption text-center text-sm mt-1.5" style={{ color: "#1E2A38", opacity: 0.9 }}>
                {t.youHaveAwakened}{" "}
                <span style={{ color: accent, fontWeight: 600, textShadow: `0 0 10px ${accent}50` }}>{referralCount}</span>{" "}
                {referralCount === 1 ? t.climber : t.climbers}
              </p>
            </>
          )}
        </motion.div>

        <motion.div
          className="shrink-0 flex flex-col items-center gap-2 w-full countdown-spacing-after-share"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[5] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          {profile.isVerified ? (
            <>
              <motion.button
                type="button"
                onClick={() => {
                  setPowerYourCloudModalOpen(true);
                }}
                className="shrink-0 px-5 py-2.5 rounded-full font-subheadline text-sm border-2 transition-colors hover:opacity-90"
                style={{ borderColor: accentContrast, color: accentContrast }}
              >
                {t.powerYourCloud}
              </motion.button>
              <p className="font-caption text-white/70 text-center text-xs">{t.youCanNowInvite}</p>
            </>
          ) : (
            <>
              <p className="font-caption text-white/90 text-center text-sm">⚡ {t.verifyToActivateReferrals}</p>
              <motion.button
                type="button"
                onClick={() => setVerificationOpen(true)}
                className="px-5 py-2.5 rounded-full font-subheadline text-sm border-2 transition-colors hover:opacity-95"
                style={{ borderColor: accentContrast, color: accentContrast, willChange: "transform" }}
                animate={{
                  scale: [1, 1.02, 1],
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {t.verifyAccount}
              </motion.button>
            </>
          )}
        </motion.div>

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
            {t.countdownWinnerText}
          </p>
        </motion.div>

        {shareToast && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="px-6 py-4 rounded-xl bg-white/95 shadow-lg text-storm font-medium animate-fade-out-2s">
              {t.linkCopied}
            </div>
          </div>
        )}

        {upgradeSuccessToast && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="px-6 py-4 rounded-xl bg-white/95 shadow-lg text-storm font-medium animate-fade-out-2s">
              {t.powerYourCloudModal.cloudEvolvedToIdentity.replace("{identity}", tierNameFromConfig)}
            </div>
          </div>
        )}

        {verificationSuccessOverlay && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="px-6 py-5 rounded-2xl bg-white/95 shadow-xl text-center max-w-[280px]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{ color: "#1E2A38" }}
            >
              <p className="font-subheadline text-lg font-semibold">{tVerification.successTitle}</p>
              <p className="font-caption text-sm mt-1 opacity-80">{tVerification.successSubtext}</p>
            </motion.div>
          </motion.div>
        )}

        <motion.div
          className="shrink-0 flex flex-col items-center w-full max-w-[320px] relative countdown-spacing-after-leaderboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[4] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
        >
          <div className="absolute inset-0 rounded-2xl leaderboard-shimmer pointer-events-none -z-10" aria-hidden />
          <div className="flex flex-col gap-2 w-full mt-1">
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
                        {entry.count} {entry.count !== 1 ? t.climbers : t.climber}
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
                  <p className="font-medium text-white/60 text-[0.7rem] uppercase tracking-wider mb-1">{t.yourTeamRank}</p>
                  <div className="flex flex-row items-center justify-between gap-3">
                    <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
                      <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: accentContrast, color: isGiong ? "#FF635C" : (cloud.joinTextHex ?? "#1E2A38") }}>
                        #{rank}
                      </div>
                      <div className="leaderboard-text flex flex-col min-w-0">
                        <p className="font-bold text-white text-[0.9rem] sm:text-[1rem]">Team {cloud.name}</p>
                        <p className="font-caption text-white/70 text-[0.75rem] mt-0.5">
                          {teamCount} {teamCount !== 1 ? t.climbers : t.climber}
                          {diff > 0 && (
                            <span className="block mt-0.5">
                              +{diff} {t.toReach3}
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

        <motion.div
          className="shrink-0 w-full max-w-[360px] mt-4 countdown-rewards-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 0.5, delay: phase === "content" ? CONTENT_STAGGER_MS[4] / 1000 + 0.3 : 0 }}
        >
          <p className="font-caption font-medium text-white/90 text-xs uppercase tracking-wider mb-3">
            {t.rewardsTitle}
          </p>
          <AscensionTimeline
            locale={locale}
            accentHex={accent}
            currentTier={backendTierToDisplay(profile.tierLevel)}
            variant="light"
          />
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-3 md:hidden mt-6 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 1.1, delay: phase === "content" ? CONTENT_STAGGER_MS[5] / 1000 : 0, ease: EASE_APPLE_IN_OUT }}
          style={{ visibility: phase === "content" ? "visible" : "hidden", pointerEvents: phase === "content" ? "auto" : "none" }}
        >
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="about-btn-breathe logout-mobile-btn w-full max-w-[200px]"
            aria-label={t.aboutUs}
          >
            {t.aboutUs}
          </button>
          {user && (user.email || user.phone) && (
            <div
              className="w-full max-w-[320px] text-center rounded-xl px-4 py-2.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 0 12px rgba(0,0,0,0.08)",
              }}
            >
              <p className="font-caption text-white/80 text-[10px] uppercase tracking-wider">
                {t.loggedInAs}
              </p>
              <p className="font-caption text-white font-medium text-sm mt-0.5 truncate max-w-[280px] mx-auto" title={user.email || user.phone || undefined}>
                {user.name?.trim() || "Member"}
                {user.email ? ` · ${user.email}` : user.phone ? ` · ${user.phone}` : ""}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="logout-mobile-btn"
            aria-label={t.logOut}
          >
            {t.logOut}
          </button>
        </motion.div>

        {user && (user.email || user.phone) && (
          <motion.div
            className="hidden md:block w-full max-w-[320px] mx-auto text-center py-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "content" ? 1 : 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="rounded-xl px-4 py-2.5 inline-block"
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 0 12px rgba(0,0,0,0.08)",
              }}
            >
              <p className="font-caption text-white/80 text-[10px] uppercase tracking-wider">
                {t.loggedInAs}
              </p>
              <p className="font-caption text-white font-medium text-sm mt-0.5 truncate max-w-[280px] mx-auto" title={user.email || user.phone || undefined}>
                {user.name?.trim() || "Member"}
                {user.email ? ` · ${user.email}` : user.phone ? ` · ${user.phone}` : ""}
              </p>
            </div>
          </motion.div>
        )}

        <style>{`.countdown-social-link:hover { border-color: ${accent}99 !important; box-shadow: 0 0 20px ${accent}40; }`}</style>
        <motion.div
          className="w-full flex justify-center items-center gap-4 py-6 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "content" ? 1 : 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <a
            href={SOCIAL_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="countdown-social-link flex items-center justify-center w-12 h-12 rounded-full border border-white/25 text-white/90 transition-colors hover:text-white hover:opacity-90"
            aria-label="Instagram"
          >
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </a>
          <a
            href={SOCIAL_LINKS.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="countdown-social-link flex items-center justify-center w-12 h-12 rounded-full border border-white/25 text-white/90 transition-colors hover:text-white hover:opacity-90"
            aria-label="Facebook"
          >
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          <a
            href={SOCIAL_LINKS.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            className="countdown-social-link flex items-center justify-center w-12 h-12 rounded-full border border-white/25 text-white/90 transition-colors hover:text-white hover:opacity-90"
            aria-label="TikTok"
          >
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
          </a>
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

      <AnimatePresence>
        {aboutOpen && <AboutUsModal onClose={() => setAboutOpen(false)} locale={locale} />}
      </AnimatePresence>

      <AnimatePresence>
        {powerYourCloudModalOpen && user && cloud && (
          <PowerYourCloudModal
            locale={locale}
            accentHex={cloud.accentHex}
            tierLevel={profile.tierLevel}
            totalContributionUsd={profile.totalContributionUsd}
            referralCount={profile.referralCount}
            referralUrl={referralUrl}
            shareMessage={shareMessage}
            userIdentifier={user.email ?? user.phone ?? ""}
            identifierType={user.email ? "email" : "phone"}
            onClose={() => setPowerYourCloudModalOpen(false)}
            onOpenShare={() => {
              setPowerYourCloudModalOpen(false);
              setShareModal({ referralUrl, shareMessage });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAnnouncement && (
          <AnnouncementModal
            locale={locale}
            accent={cloud?.accentHex}
            onClose={() => {
              try {
                if (typeof window !== "undefined") window.localStorage.setItem(LAST_SEEN_ANNOUNCEMENT_KEY, String(ANNOUNCEMENT_ID));
              } catch {
                // ignore
              }
              setShowAnnouncement(false);
              if (!profile.isVerified) setShowVerifyToEvolve(true);
              else if (ceremonyShownOrDismissedRef.current === false) {
                const currentTier = backendTierToDisplay(profile.tierLevel);
                setEvolutionCeremony({ displayTier: currentTier });
                ceremonyShownOrDismissedRef.current = true;
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareModal && cloud && (
          <PowerYourCloudShareModal
            locale={locale}
            cloud={cloud}
            referralUrl={shareModal.referralUrl}
            shareMessage={shareModal.shareMessage}
            referralCount={profile.referralCount}
            onClose={() => setShareModal(null)}
            onShareClick={() => setShareAuraPulseKey((k) => k + 1)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCountdownIntro && cloud && (
          <CountdownIntroModal
            locale={locale}
            accent={cloud.accentHex}
            onContinue={() => {
              try {
                if (typeof window !== "undefined") {
                  window.sessionStorage.setItem(COUNTDOWN_INTRO_SESSION_KEY, "1");
                  const raw = window.localStorage.getItem(COUNTDOWN_INTRO_VIEW_COUNT_KEY);
                  const n = raw != null ? parseInt(raw, 10) : 0;
                  const current = Number.isNaN(n) ? 0 : Math.max(0, n);
                  window.localStorage.setItem(
                    COUNTDOWN_INTRO_VIEW_COUNT_KEY,
                    String(Math.min(COUNTDOWN_INTRO_MAX_VIEWS, current + 1))
                  );
                }
              } catch {
                // ignore
              }
              setShowCountdownIntro(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVerifyToEvolve && cloud && (
          <VerifyToEvolveModal
            locale={locale}
            accent={cloud.accentHex}
            onClose={() => setShowVerifyToEvolve(false)}
            onVerify={() => {
              setShowVerifyToEvolve(false);
              setVerificationOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {evolutionCeremony && cloud && (
          <EvolutionCeremonyModal
            displayTier={evolutionCeremony.displayTier}
            referralCount={profile.referralCount}
            accent={cloud.accentHex}
            locale={locale}
            onClose={() => {
              try {
                if (typeof window !== "undefined") window.localStorage.setItem(LAST_SEEN_TIER_KEY, String(evolutionCeremony.displayTier));
              } catch {
                // ignore
              }
              setEvolutionCeremony(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {verificationOpen && user && cloud && (
          <VerificationModal
            locale={locale}
            name={user.name}
            cloud_type={user.team}
            email={user.email}
            phone={user.phone}
            identifier={user.identifier}
            identifier_type={user.identifier_type}
            onClose={() => setVerificationOpen(false)}
            onSuccess={async (payload) => {
              if (payload.mode === "countdown") {
                refreshWaitlist();
                setVerificationSuccessOverlay(true);
                setShouldAnimateVerifiedBadge(true);
                setTimeout(() => setVerificationSuccessOverlay(false), 1200);
                try {
                  const pendingRef = typeof window !== "undefined" ? localStorage.getItem(PENDING_REF_CODE_KEY) : null;
                  if (pendingRef?.trim()) {
                    const supabase = createBrowserClient();
                    await supabase.rpc("confirm_referral", { ref_code: pendingRef.trim() });
                  }
                } catch {
                  // ignore
                } finally {
                  try {
                    if (typeof window !== "undefined") localStorage.removeItem(PENDING_REF_CODE_KEY);
                  } catch {
                    // ignore
                  }
                }
              } else {
                setVerificationOpen(false);
              }
            }}
          />
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}

function CountdownPageFallback() {
  return (
    <div
      className="min-h-[100dvh] w-full flex items-center justify-center"
      style={{ background: HERO_BG }}
      aria-hidden
    />
  );
}

function CountdownPageErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center gap-4"
      style={{ background: HERO_BG }}
      role="alert"
    >
      <p className="text-white/70 text-sm">Something went wrong.</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-5 py-2.5 rounded-full border border-white/50 text-white/90 text-sm font-medium hover:bg-white/10 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

export default function CountdownPage() {
  return (
    <Suspense fallback={<CountdownPageFallback />}>
      <ClientErrorBoundary fallback={(retry) => <CountdownPageErrorFallback onRetry={retry} />}>
        <CountdownPageContent />
      </ClientErrorBoundary>
    </Suspense>
  );
}
