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
import HeroScrollObserver from "@/components/HeroScrollObserver";
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
  const [heroOpacity, setHeroOpacity] = useState(1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleSuccess = () => setShowToast(true);

  const handleCloudTransitionComplete = useCallback(() => {
    setShowClouds(true);
    window.scrollTo({ top: 0, behavior: "auto" });
    setSkyVisible(false);
  }, []);

  const handleAscendClick = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setSkyVisible(true);
    setHeroOpacity(1);

    const add = (fn: () => void, ms: number) => {
      timersRef.current.push(setTimeout(fn, ms));
    };

    add(() => setHeroOpacity(0), 200);
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
    <div id="hero-page" className="page-container relative min-h-[100dvh] flex flex-col">
      <main className="relative flex-1 min-h-0 z-10">
      <BrandBackground />
      <HeroScrollObserver />
      <KnowYourTeamButton show />
      {skyVisible && <SkyTransition onComplete={handleCloudTransitionComplete} />}
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
