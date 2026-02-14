"use client";

import { useState, useEffect } from "react";
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
import { CloudPersonality } from "@/lib/cloudData";

export default function Home() {
  const [showClouds, setShowClouds] = useState(false);
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleSuccess = () => setShowToast(true);

  useEffect(() => {
    if (showClouds) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [showClouds]);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 5000);
    return () => clearTimeout(t);
  }, [showToast]);

  return (
    <main className="relative min-h-screen z-10">
      <BrandBackground />
      <AnimatePresence mode="wait">
        <motion.div
          key={showClouds ? "clouds" : "hero"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
              <CtaSection onJoin={() => setShowClouds(true)} />
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
