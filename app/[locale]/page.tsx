"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Image from "next/image";
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
import CloudSelector from "@/components/CloudSelector";
import SignupModal from "@/components/SignupModal";
import AboutUsModal from "@/components/AboutUsModal";
import CloudFooter from "@/components/CloudFooter";
import KnowYourTeamButton from "@/components/KnowYourTeamButton";
import LanguageSwitch from "@/components/LanguageSwitch";
import HeroScrollObserver from "@/components/HeroScrollObserver";
import MistAscent from "@/components/MistAscent";
import { useTransitionOverlay } from "@/context/TransitionOverlayContext";
import { CloudPersonality, getCloudById } from "@/lib/cloudData";
import { getUser } from "@/lib/userStorage";
import type { Locale } from "@/lib/i18n";
import { getMascotPartColors, type MascotPartColors } from "@/lib/mascotSpeciesColors";

const USE_CINEMATIC_HERO = true;
const HERO_WRAPPER_VH = 430;
const HERO_HEADER_PX = 64;
const HERO_FOOTER_PX = 56;

function HomeContent() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as Locale) ?? "en";
  const searchParams = useSearchParams();
  const [showClouds, setShowClouds] = useState(false);
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [showAboutUsCTA, setShowAboutUsCTA] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { phase: overlayPhase, startTransition } = useTransitionOverlay();
  const transitionActive = overlayPhase !== "idle";

  /** Hero → Pick Your Cloud: global overlay collapses, then replace URL; overlay expands after new view is ready. */
  const handleAscendClick = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setHeroOpacity(0);
    startTransition(`/${locale}?clouds=1`, "replace");
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
    if (searchParams.get("clouds") === "1") {
      setShowClouds(true);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (showClouds) document.documentElement.classList.add("cloud-selection-view");
    return () => document.documentElement.classList.remove("cloud-selection-view");
  }, [showClouds]);

  /** Hero initial scroll: when user scrolls up at top, show About Us CTA (mobile); hide when they scroll down again */
  useEffect(() => {
    if (showClouds) return;
    const atTop = () => typeof window !== "undefined" && window.scrollY <= 15;
    const onWheel = (e: WheelEvent) => {
      if (atTop() && e.deltaY < 0) setShowAboutUsCTA(true);
    };
    const onScroll = () => {
      if (typeof window !== "undefined" && window.scrollY > 60) setShowAboutUsCTA(false);
    };
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (atTop() && e.touches[0].clientY - touchStartY > 30) setShowAboutUsCTA(true);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [showClouds]);

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
    const vh = typeof window !== "undefined" ? window.innerHeight : 700;
    const wrapperHeight = (vh * HERO_WRAPPER_VH) / 100;
    const heroEnd = Math.max(1, wrapperHeight - vh);
    const scrollBufferPx = Math.max(100, vh * 0.12);
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setHeroScrollComplete(window.scrollY > heroEnd + scrollBufferPx);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
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
      <BrandBackground />
      {!showClouds && <MistAscent />}
      <HeroScrollObserver />

      {/* About Us CTA: appears when user scrolls up at top (hero); just above logo on mobile and desktop */}
      {showCinematicLayers && showAboutUsCTA && (
        <motion.div
          className="fixed left-1/2 z-[45] -translate-x-1/2 top-[calc(50%-100px)]"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="about-btn-breathe logout-mobile-btn w-full max-w-[200px]"
            aria-label={aboutUsLabel}
          >
            {aboutUsLabel}
          </button>
        </motion.div>
      )}

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
            <Image
              src="/logo-white.svg"
              alt="Leo Mây"
              width={180}
              height={72}
              className="h-8 w-auto object-contain md:h-[3.25rem]"
              priority
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showHeaderLogo ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3"
          >
            <LanguageSwitch />
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
          <LanguageSwitch />
          <KnowYourTeamButton show onFoundTeam={() => transitionToCountdown("return")} />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {!showClouds ? (
          USE_CINEMATIC_HERO ? (
            <div key="cinematic-hero" className="relative z-0" style={{ opacity: heroContentOpacity }}>
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
              />
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <CloudSelector onSelect={setSelectedCloud} />
          </motion.div>
        )}
      </AnimatePresence>

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
