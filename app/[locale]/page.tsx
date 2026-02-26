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
import CloudFooter from "@/components/CloudFooter";
import KnowYourTeamButton from "@/components/KnowYourTeamButton";
import LanguageSwitch from "@/components/LanguageSwitch";
import HeroScrollObserver from "@/components/HeroScrollObserver";
import SkyTransition from "@/components/SkyTransition";
import MistAscent from "@/components/MistAscent";
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
  const [skyVisible, setSkyVisible] = useState(false);
  const [skyTransitionForCountdown, setSkyTransitionForCountdown] = useState<false | "return" | "forms">(false);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleCloudTransitionComplete = useCallback(() => {
    setShowClouds(true);
    window.scrollTo({ top: 0, behavior: "auto" });
    setSkyVisible(false);
    router.replace(`/${locale}?clouds=1`, { scroll: false });
  }, [router, locale]);

  /** Single entry point for all navigation to countdown. Mist transition controls timing; navigation happens only after mist covers viewport. */
  const transitionToCountdown = useCallback(
    (variant: "return" | "forms") => {
      setSkyTransitionForCountdown(variant);
    },
    []
  );

  const handleCountdownTransitionComplete = useCallback(() => {
    setSkyTransitionForCountdown(false);
    setSelectedCloud(null);
    router.push(`/${locale}/countdown?fromMist=1`);
  }, [router, locale]);

  const isCountdownTransition = skyTransitionForCountdown !== false;

  const handleAscendClick = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setSkyVisible(true);
    setHeroOpacity(1);
    const t = setTimeout(() => setHeroOpacity(0), 0);
    timersRef.current.push(t);
  }, []);

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
    if (searchParams.get("clouds") === "1") setShowClouds(true);
  }, [searchParams]);

  useEffect(() => {
    if (showClouds) document.documentElement.classList.add("cloud-selection-view");
    return () => document.documentElement.classList.remove("cloud-selection-view");
  }, [showClouds]);

  const userForMascot = getUser();
  const cloudForMascot = userForMascot?.team ? getCloudById(userForMascot.team) : null;
  const heroMascotPartColors: MascotPartColors | null = cloudForMascot ? getMascotPartColors(cloudForMascot.id) : null;

  const [heroReady, setHeroReady] = useState(false);
  const [heroScrollComplete, setHeroScrollComplete] = useState(false);
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

  const transitionActive = skyVisible || isCountdownTransition;
  const heroContentOpacity = showClouds ? 1 : (transitionActive ? 0 : heroOpacity);
  const heroEase = [0.22, 1, 0.36, 1] as const;
  const showCinematicLayers = USE_CINEMATIC_HERO && !showClouds;
  const footerMessages = getMessages(locale).footer;

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

      {showCinematicLayers && (
        <header
          className="fixed left-0 right-0 top-0 z-[50] flex items-center justify-between px-4 sm:px-6 md:px-8"
          style={{ height: HERO_HEADER_PX, minHeight: HERO_HEADER_PX }}
          aria-label="Site header"
        >
          <Image
            src="/logo-white.svg"
            alt="Leo Mây"
            width={120}
            height={48}
            className="h-8 w-auto object-contain md:h-9"
            priority
          />
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            <KnowYourTeamButton show onFoundTeam={() => transitionToCountdown("return")} />
          </div>
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
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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

      {(skyVisible || isCountdownTransition) && (
        <SkyTransition
          variant={isCountdownTransition ? skyTransitionForCountdown : "discovery"}
          onComplete={isCountdownTransition ? handleCountdownTransitionComplete : handleCloudTransitionComplete}
        />
      )}
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
