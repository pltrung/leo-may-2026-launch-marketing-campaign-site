"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import Footer from "@/components/Footer";
import KnowYourTeamButton from "@/components/KnowYourTeamButton";
import MistOverlay from "@/components/MistOverlay";
import { CloudPersonality } from "@/lib/cloudData";
import { getUser } from "@/lib/userStorage";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showClouds, setShowClouds] = useState(false);
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [mistVisible, setMistVisible] = useState(false);
  const [mistPhase, setMistPhase] = useState<"enter" | "exit">("enter");
  const [mistShowText, setMistShowText] = useState(false);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleSuccess = () => setShowToast(true);

  const handleAscendClick = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setMistVisible(true);
    setMistPhase("enter");
    setMistShowText(false);
    setHeroOpacity(1);

    const add = (fn: () => void, ms: number) => {
      timersRef.current.push(setTimeout(fn, ms));
    };

    add(() => setMistShowText(true), 600);
    add(() => setHeroOpacity(0), 700);
    add(() => {
      setShowClouds(true);
      window.scrollTo({ top: 0, behavior: "auto" });
      setMistPhase("exit");
      setMistShowText(false);
    }, 1000);
    add(() => setMistVisible(false), 1500);
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
    <main className="relative min-h-screen z-10">
      <BrandBackground />
      <KnowYourTeamButton show />
      {mistVisible && (
        <MistOverlay phase={mistPhase} showText={mistShowText} />
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
      <Footer />

      {selectedCloud && (
        <SignupModal
          cloud={selectedCloud}
          onClose={() => setSelectedCloud(null)}
          onSuccess={handleSuccess}
        />
      )}

      <Toast show={showToast} />
    </main>
  );
}
