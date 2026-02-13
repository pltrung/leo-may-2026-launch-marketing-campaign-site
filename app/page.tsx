"use client";

import { useState, useEffect } from "react";
import FogBackground from "@/components/FogBackground";
import Hero from "@/components/Hero";
import StorySection from "@/components/StorySection";
import CloudSelector from "@/components/CloudSelector";
import SignupModal from "@/components/SignupModal";
import Toast from "@/components/Toast";
import Footer from "@/components/Footer";
import { CloudPersonality } from "@/lib/cloudData";

export default function Home() {
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleSuccess = () => setShowToast(true);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 5000);
    return () => clearTimeout(t);
  }, [showToast]);

  return (
    <main className="relative min-h-screen">
      <FogBackground />
      <Hero />
      <StorySection />
      <CloudSelector onSelect={setSelectedCloud} />
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
