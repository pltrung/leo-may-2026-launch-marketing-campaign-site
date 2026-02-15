"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import BrandBackground from "@/components/BrandBackground";
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
import AscentBar from "@/components/AscentBar";
import MistAscent from "@/components/MistAscent";
import { CloudPersonality } from "@/lib/cloudData";
import { getUser } from "@/lib/userStorage";
import type { Locale } from "@/lib/i18n";

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
  }, []);

  const handleCountdownTransitionComplete = useCallback(() => {
    setSkyTransitionForCountdown(false);
    setSelectedCloud(null);
    router.push(`/${locale}/countdown`);
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
    if (teamMatch && userMatch) router.replace(`/${locale}/countdown`);
  }, [router, searchParams, locale]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (showClouds) document.documentElement.classList.add("cloud-selection-view");
    return () => document.documentElement.classList.remove("cloud-selection-view");
  }, [showClouds]);

  const transitionActive = skyVisible || isCountdownTransition;
  const heroContentOpacity = showClouds ? 1 : (transitionActive ? 0 : heroOpacity);

  return (
    <div id="hero-page" className="page-container relative min-h-[100dvh] flex flex-col">
      <main className="relative flex-1 min-h-0 z-10">
      <BrandBackground />
      {!showClouds && <MistAscent />}
      <HeroScrollObserver />
      <motion.div
        className="fixed bottom-6 left-6 md:top-8 md:bottom-auto md:left-auto md:right-6 z-[60]"
        initial={false}
        animate={{ opacity: transitionActive ? 0 : 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: transitionActive ? "none" : "auto" }}
      >
        <LanguageSwitch />
      </motion.div>
      <motion.div
        className="fixed top-6 right-24 md:top-8 md:right-28 z-[60]"
        initial={false}
        animate={{ opacity: transitionActive ? 0 : 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: transitionActive ? "none" : "auto" }}
      >
        <KnowYourTeamButton
          show
          onFoundTeam={() => {
            setSkyTransitionForCountdown("return");
          }}
        />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.div
          key={showClouds ? "clouds" : "hero"}
          initial={{ opacity: 0 }}
          animate={{ opacity: heroContentOpacity }}
          exit={{ opacity: 0 }}
          transition={{ duration: showClouds ? 0.4 : transitionActive ? 0.8 : 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {!showClouds ? (
            <>
              <AscentBar />
              <HeroScroll1 />
              <HeroScroll2 />
              <HeroScroll3 pose="front" />
              <HeroScroll4 />
              <HeroScroll5 />
              <HeroScroll6 />
              <HeroScroll7 onJoin={handleAscendClick} />
            </>
          ) : (
            <CloudSelector onSelect={setSelectedCloud} />
          )}
        </motion.div>
      </AnimatePresence>
      </main>
      <motion.div
        className="flex-shrink-0 relative z-10"
        initial={false}
        animate={{ opacity: transitionActive ? 0 : 1 }}
        transition={{
          duration: 0.7,
          delay: transitionActive ? 0 : 0.4,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <CloudFooter />
      </motion.div>

      {selectedCloud && (
        <SignupModal
          cloud={selectedCloud}
          locale={locale}
          onClose={() => setSelectedCloud(null)}
          onSuccess={() => {}}
          onRedirectToCountdown={() => setSkyTransitionForCountdown("forms")}
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
