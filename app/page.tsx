"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import BrandBackground from "@/components/BrandBackground";
import HeroSection from "@/components/HeroSection";
import LocationSection from "@/components/LocationSection";
import IpShowcaseSection from "@/components/IpShowcaseSection";
import PhilosophySection from "@/components/PhilosophySection";
import CloudWithEyesSection from "@/components/CloudWithEyesSection";
import CtaSection from "@/components/CtaSection";
import CloudSelector from "@/components/CloudSelector";
import SignupModal from "@/components/SignupModal";
import Toast from "@/components/Toast";
import CloudFooter from "@/components/CloudFooter";
import KnowYourTeamButton from "@/components/KnowYourTeamButton";
import SkyTransition from "@/components/SkyTransition";
import { CloudPersonality } from "@/lib/cloudData";
import { getUser } from "@/lib/userStorage";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showClouds, setShowClouds] = useState(false);
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [skyVisible, setSkyVisible] = useState(false);
  const [skyMistActive, setSkyMistActive] = useState(false);
  const [skyCloudLeftEnter, setSkyCloudLeftEnter] = useState(false);
  const [skyCloudRightEnter, setSkyCloudRightEnter] = useState(false);
  const [skyTextEnter, setSkyTextEnter] = useState(false);
  const [skyCloudLeftExit, setSkyCloudLeftExit] = useState(false);
  const [skyCloudRightExit, setSkyCloudRightExit] = useState(false);
  const [skyMistExit, setSkyMistExit] = useState(false);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleSuccess = () => setShowToast(true);

  const handleAscendClick = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setSkyVisible(true);
    setSkyMistActive(false);
    setSkyCloudLeftEnter(false);
    setSkyCloudRightEnter(false);
    setSkyTextEnter(false);
    setSkyCloudLeftExit(false);
    setSkyCloudRightExit(false);
    setSkyMistExit(false);
    setHeroOpacity(1);

    const add = (fn: () => void, ms: number) => {
      timersRef.current.push(setTimeout(fn, ms));
    };

    add(() => setSkyMistActive(true), 0);
    add(() => setSkyCloudLeftEnter(true), 100);
    add(() => setSkyCloudRightEnter(true), 200);
    add(() => setSkyTextEnter(true), 400);
    add(() => setHeroOpacity(0), 700);
    add(() => {
      setShowClouds(true);
      window.scrollTo({ top: 0, behavior: "auto" });
      setSkyCloudLeftExit(true);
      setSkyCloudRightExit(true);
    }, 1400);
    add(() => setSkyMistExit(true), 1600);
    add(() => setSkyVisible(false), 1800);
  }, []);

  useEffect(() => {
    const teamParam = searchParams.get("team");
    const userParam = searchParams.get("user");
    if (!teamParam && !userParam) return;
    const user = getUser();
    if (!user) return;
    const teamMatch = !teamParam || user.team === teamParam;
    const userMatch = !userParam || user.name.trim().toLowerCase().includes((userParam || "").trim().toLowerCase());
    if (teamMatch && userMatch) router.replace("/countdown");
  }, [router, searchParams]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 5000);
    return () => clearTimeout(t);
  }, [showToast]);

  return (
    <div className="page-container relative min-h-[100dvh] flex flex-col">
      <main className="relative flex-1 min-h-0 z-10">
      <BrandBackground />
      <KnowYourTeamButton show />
      {skyVisible && (
        <SkyTransition
          mistActive={skyMistActive}
          cloudLeftEnter={skyCloudLeftEnter}
          cloudRightEnter={skyCloudRightEnter}
          skyTextEnter={skyTextEnter}
          cloudLeftExit={skyCloudLeftExit}
          cloudRightExit={skyCloudRightExit}
          mistExit={skyMistExit}
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={showClouds ? "clouds" : "hero"}
          initial={{ opacity: 0 }}
          animate={{ opacity: showClouds ? 1 : heroOpacity }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {!showClouds ? (
            <>
              <HeroSection />
              <LocationSection />
              <IpShowcaseSection pose="front" />
              <PhilosophySection />
              <CloudWithEyesSection />
              <CtaSection onJoin={handleAscendClick} />
            </>
          ) : (
            <CloudSelector onSelect={setSelectedCloud} />
          )}
        </motion.div>
      </AnimatePresence>
      </main>
      <div className="flex-shrink-0 relative z-10">
        <CloudFooter />
      </div>

      {selectedCloud && (
        <SignupModal
          cloud={selectedCloud}
          onClose={() => setSelectedCloud(null)}
          onSuccess={handleSuccess}
          referredBy={searchParams.get("ref") ?? undefined}
        />
      )}

      <Toast show={showToast} />
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
