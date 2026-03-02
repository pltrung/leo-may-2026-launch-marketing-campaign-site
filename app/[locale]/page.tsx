"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import BrandBackground from "@/components/BrandBackground";
import { getMessages } from "@/lib/messages";
import LegacyHeroScroll from "@/components/LegacyHeroScroll";
import CinematicHeroScroll from "@/components/CinematicHeroScroll";
import HeroScroll1 from "@/components/HeroScroll1";
import HeroScroll2 from "@/components/HeroScroll2";
import HeroScroll3 from "@/components/HeroScroll3";
import HeroScroll4 from "@/components/HeroScroll4";
import HeroScroll5 from "@/components/HeroScroll5";
import HeroScroll6 from "@/components/HeroScroll6";
import HeroScroll7 from "@/components/HeroScroll7";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";
import CloudSelector from "@/components/CloudSelector";
import HeroFallback from "@/components/HeroFallback";
import Logo from "@/components/Logo";
import SignupModal from "@/components/SignupModal";
import AboutUsModal from "@/components/AboutUsModal";
import CloudFooter from "@/components/CloudFooter";
import KnowYourTeamButton from "@/components/KnowYourTeamButton";
import SafeLanguageSwitch from "@/components/SafeLanguageSwitch";
import HeroScrollObserver from "@/components/HeroScrollObserver";
import HeroMusic from "@/components/HeroMusic";
import MistAscent from "@/components/MistAscent";
import HeroStarfield from "@/components/HeroStarfield";
import { useTransitionOverlay } from "@/context/TransitionOverlayContext";
import { HERO_BG } from "@/lib/heroConstants";
import { CloudPersonality, getCloudById } from "@/lib/cloudData";
import { getUser } from "@/lib/userStorage";
import type { Locale } from "@/lib/i18n";
import { getMascotPartColors, type MascotPartColors } from "@/lib/mascotSpeciesColors";

const USE_CINEMATIC_HERO = true;
const HERO_WRAPPER_VH = 430;
const HERO_HEADER_PX = 64;
const HERO_FOOTER_PX = 56;
const DESKTOP_BREAKPOINT_PX = 768;

function HomeContent() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as Locale) ?? "en";
  const searchParams = useSearchParams();
  const [showClouds, setShowClouds] = useState(false);
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [aboutOpen, setAboutOpen] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { phase: overlayPhase, startTransition } = useTransitionOverlay();
  const transitionActive = overlayPhase !== "idle";

  /** Clouds view entrance after TV turn-on: 1) dark, 2) holds, 3) content. Only when landing from transition. */
  type CloudsEntranceStep = "background" | "holds" | "content";
  const [cloudsEntranceStep, setCloudsEntranceStep] = useState<CloudsEntranceStep>("background");
  const prevOverlayPhaseRef = useRef<typeof overlayPhase>("idle");
  const cloudsEntranceTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** On desktop we keep hero mounted when on clouds (hidden) so GLB is instant on return; on mobile we remount (fixes GLB not showing after Return). */
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(typeof window !== "undefined" && window.innerWidth > DESKTOP_BREAKPOINT_PX);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /** Increment when returning from clouds so hero gets a fresh mount and GLB re-inits (mobile only; desktop keeps hero mounted). */
  const [heroMountKey, setHeroMountKey] = useState(0);
  const prevShowCloudsRef = useRef(showClouds);
  useEffect(() => {
    if (isDesktop) return;
    if (prevShowCloudsRef.current === true && showClouds === false) {
      setHeroMountKey((k) => k + 1);
    }
    prevShowCloudsRef.current = showClouds;
  }, [showClouds, isDesktop]);

  /** Hero → Pick Your Cloud: global overlay collapses, then replace URL; overlay expands after new view is ready. */
  const handleAscendClick = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setHeroOpacity(0);
    startTransition(`/${locale}?clouds=1`, "replace");
  }, [locale, startTransition]);

  /** Clouds → Hero: same TV off/on transition, then replace URL to initial. */
  const handleReturnToHero = useCallback(() => {
    setHeroOpacity(1);
    startTransition(`/${locale}`, "replace");
  }, [locale, startTransition]);

  /** Login/team found or Confirm & ascend → Countdown: close modal (if any), then global overlay transition. */
  const transitionToCountdown = useCallback(
    (_variant: "return" | "forms") => {
      setSelectedCloud(null);
      startTransition(`/${locale}/countdown?fromMist=1`, "push");
    },
    [locale, startTransition]
  );

  useEffect(() => {
    const teamParam = searchParams.get("team");
    const userParam = searchParams.get("user");
    if (!teamParam && !userParam) return;
    const user = getUser();
    if (!user) return;
    const teamMatch = !teamParam || user.team === teamParam;
    const userMatch = !userParam || user.name.trim().toLowerCase().includes((userParam || "").trim().toLowerCase());
    if (teamMatch && userMatch) transitionToCountdown("return");
  }, [searchParams, locale, transitionToCountdown]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const clouds = searchParams.get("clouds") === "1";
    setShowClouds(clouds);
    if (clouds) {
      window.scrollTo({ top: 0, behavior: "auto" });
    } else {
      setHeroOpacity(1); // when returning from clouds, hero was faded to 0 — restore so hero is visible
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (showClouds) document.documentElement.classList.add("cloud-selection-view");
    return () => document.documentElement.classList.remove("cloud-selection-view");
  }, [showClouds]);

  /** Clouds entrance: match VN/EN feel when coming from hero (short delay → content). Direct load / locale switch stays on content. */
  useEffect(() => {
    if (!showClouds) {
      setCloudsEntranceStep("background");
      cloudsEntranceTimersRef.current.forEach(clearTimeout);
      cloudsEntranceTimersRef.current = [];
      prevOverlayPhaseRef.current = "idle";
      return;
    }
    if (overlayPhase !== "idle") {
      setCloudsEntranceStep("background");
      prevOverlayPhaseRef.current = overlayPhase;
      return;
    }
    const prev = prevOverlayPhaseRef.current;
    prevOverlayPhaseRef.current = "idle";
    if (prev === "expanding") {
      setCloudsEntranceStep("background");
      cloudsEntranceTimersRef.current.forEach(clearTimeout);
      const contentDelay = 380;
      const t = setTimeout(() => setCloudsEntranceStep("content"), contentDelay);
      cloudsEntranceTimersRef.current = [t];
      return () => cloudsEntranceTimersRef.current.forEach(clearTimeout);
    }
    setCloudsEntranceStep("content");
  }, [showClouds, overlayPhase]);

  const userForMascot = getUser();
  const cloudForMascot = userForMascot?.team ? getCloudById(userForMascot.team) : null;
  const heroMascotPartColors: MascotPartColors | null = cloudForMascot ? getMascotPartColors(cloudForMascot.id) : null;

  const [heroReady, setHeroReady] = useState(false);
  const [centerLogoGone, setCenterLogoGone] = useState(false);
  const [heroScrollComplete, setHeroScrollComplete] = useState(false);
  const showHeaderLogo = heroReady && centerLogoGone;
  const handleCenterLogoGone = useCallback(() => setCenterLogoGone(true), []);
  useEffect(() => {
    const check = () => document.body.classList.contains("hero-ready") && setHeroReady(true);
    if (document.body.classList.contains("hero-ready")) {
      setHeroReady(true);
      return;
    }
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!USE_CINEMATIC_HERO || showClouds) return;
    if (typeof window === "undefined") return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const vh = window.visualViewport?.height ?? window.innerHeight;
        const wrapperHeight = (vh * HERO_WRAPPER_VH) / 100;
        const heroEnd = Math.max(1, wrapperHeight - vh);
        const scrollBufferPx = Math.max(100, vh * 0.12);
        setHeroScrollComplete(window.scrollY > heroEnd + scrollBufferPx);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.visualViewport?.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [showClouds]);

  const heroContentOpacity = showClouds ? 1 : (transitionActive ? 0 : heroOpacity);
  const heroEase = [0.22, 1, 0.36, 1] as const;
  const showCinematicLayers = USE_CINEMATIC_HERO && !showClouds;
  const footerMessages = getMessages(locale).footer;
  const aboutUsLabel = getMessages(locale).countdown.aboutUs;

  return (
    <div
      id="hero-page"
      className="page-container relative flex flex-col"
      style={{ minHeight: "100dvh" }}
    >
      <main className="relative z-10 flex-1 min-h-0">
      <BrandBackground
        cloudsView={showClouds}
        cloudsEntranceStep={showClouds ? cloudsEntranceStep : undefined}
      />
      {showClouds && (
        <div
          className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
          aria-hidden
          style={{ background: HERO_BG }}
        >
          <ClientErrorBoundary fallback={null}>
            <HeroStarfield heroTransitioning={false} />
          </ClientErrorBoundary>
        </div>
      )}
      {!showClouds && <MistAscent />}
      <HeroScrollObserver />
      {!showClouds && <HeroMusic heroReady={heroReady} />}

      {showCinematicLayers && (
        <header
          className="fixed left-0 right-0 top-0 z-[50] flex items-center justify-between px-4 sm:px-6 md:px-8"
          style={{
            height: HERO_HEADER_PX,
            minHeight: HERO_HEADER_PX,
            opacity: showHeaderLogo ? 1 : 0,
            transition: "opacity 0.4s ease-out",
          }}
          aria-label="Site header"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showHeaderLogo ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center"
          >
            <Logo className="w-[110px] md:w-[140px] max-w-[110px] md:max-w-none h-auto object-contain object-left" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showHeaderLogo ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3"
          >
            <SafeLanguageSwitch />
            <KnowYourTeamButton show onFoundTeam={() => transitionToCountdown("return")} />
          </motion.div>
        </header>
      )}

      {!showCinematicLayers && (
        <motion.div
          className="fixed top-8 right-6 z-[100] flex items-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: transitionActive ? 0 : heroReady ? 1 : 0,
            y: transitionActive ? 12 : heroReady ? 0 : 12,
          }}
          transition={{ duration: 0.8, delay: transitionActive ? 0 : heroReady ? 0.5 : 0, ease: heroEase }}
          style={{ pointerEvents: transitionActive ? "none" : "auto", willChange: "transform, opacity" }}
        >
          <SafeLanguageSwitch />
          <KnowYourTeamButton show onFoundTeam={() => transitionToCountdown("return")} />
        </motion.div>
      )}

      {/* Desktop + cinematic: keep hero mounted when on clouds (hidden) so GLB stays in GPU — return from Pick my clouds is instant. Mobile: unmount/remount so GLB shows correctly after return. */}
      {USE_CINEMATIC_HERO && isDesktop ? (
        <>
          <div
            className="relative z-0"
            style={{
              opacity: heroContentOpacity,
              visibility: showClouds ? "hidden" : "visible",
              position: showClouds ? "absolute" : "relative",
              inset: showClouds ? 0 : undefined,
              pointerEvents: showClouds ? "none" : "auto",
              zIndex: showClouds ? -1 : 0,
            }}
            aria-hidden={showClouds}
          >
            <ClientErrorBoundary fallback={(retry) => <HeroFallback onRetry={retry} />}>
              <CinematicHeroScroll
                partColors={heroMascotPartColors}
                onJoin={handleAscendClick}
                locale={locale}
                headerHeight={HERO_HEADER_PX}
                footerHeight={HERO_FOOTER_PX}
                wrapperVh={HERO_WRAPPER_VH}
                footerMessages={footerMessages}
                heroReady={heroReady}
                onCenterLogoGone={handleCenterLogoGone}
                aboutUsLabel={aboutUsLabel}
                onAboutUsClick={() => setAboutOpen(true)}
              />
            </ClientErrorBoundary>
          </div>
          <AnimatePresence mode="wait">
            {showClouds && (
              <motion.div
                key="clouds"
                className="relative z-0"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{
                  opacity: cloudsEntranceStep === "content" ? 1 : 0,
                  scale: cloudsEntranceStep === "content" ? 1 : 0.98,
                }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{
                  duration: cloudsEntranceStep === "content" ? 1 : 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <CloudSelector onSelect={setSelectedCloud} onReturnToHero={handleReturnToHero} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <AnimatePresence mode="wait">
          {!showClouds ? (
            USE_CINEMATIC_HERO ? (
              <div key={`cinematic-hero-${heroMountKey}`} className="relative z-0" style={{ opacity: heroContentOpacity }}>
                <ClientErrorBoundary fallback={(retry) => <HeroFallback onRetry={retry} />}>
                  <CinematicHeroScroll
                    partColors={heroMascotPartColors}
                    onJoin={handleAscendClick}
                    locale={locale}
                    headerHeight={HERO_HEADER_PX}
                    footerHeight={HERO_FOOTER_PX}
                    wrapperVh={HERO_WRAPPER_VH}
                    footerMessages={footerMessages}
                    heroReady={heroReady}
                    onCenterLogoGone={handleCenterLogoGone}
                    aboutUsLabel={aboutUsLabel}
                    onAboutUsClick={() => setAboutOpen(true)}
                  />
                </ClientErrorBoundary>
              </div>
            ) : (
              <motion.div
                key="legacy-hero"
                className="relative z-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: heroContentOpacity }}
                exit={{ opacity: 0 }}
                transition={{ duration: transitionActive ? 0.5 : 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <LegacyHeroScroll partColors={heroMascotPartColors} onJoin={handleAscendClick} />
              </motion.div>
            )
          ) : (
            <motion.div
              key="clouds"
              className="relative z-0"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{
                opacity: cloudsEntranceStep === "content" ? 1 : 0,
                scale: cloudsEntranceStep === "content" ? 1 : 0.98,
              }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{
                duration: cloudsEntranceStep === "content" ? 1 : 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <CloudSelector onSelect={setSelectedCloud} onReturnToHero={handleReturnToHero} />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      </main>

      {!showCinematicLayers && (
        <motion.div
          id="know-your-cloud"
          className="flex-shrink-0 relative z-10 pt-1"
          style={{
            pointerEvents: transitionActive ? "none" : "auto",
          }}
          data-hero-next
          initial={false}
          animate={{
            opacity: transitionActive ? 0 : 1,
          }}
          transition={{ duration: 0.7, delay: transitionActive ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <CloudFooter />
        </motion.div>
      )}

      {selectedCloud && (
        <SignupModal
          cloud={selectedCloud}
          locale={locale}
          onClose={() => setSelectedCloud(null)}
          onSuccess={() => {}}
          onRedirectToCountdown={() => transitionToCountdown("forms")}
          referredBy={searchParams.get("ref") ?? undefined}
        />
      )}

      {aboutOpen && <AboutUsModal onClose={() => setAboutOpen(false)} locale={locale} />}

    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
