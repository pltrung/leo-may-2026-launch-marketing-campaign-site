"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CloudPersonality } from "@/lib/cloudData";
import Atmosphere from "@/components/leo/Atmosphere";
import IntroView from "@/components/leo/IntroView";
import CloudFieldView from "@/components/leo/CloudFieldView";
import PersonalityView from "@/components/leo/PersonalityView";
import SignupView from "@/components/leo/SignupView";
import SuccessView from "@/components/leo/SuccessView";

type Step = "intro" | "clouds" | "personality" | "signup" | "success";

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [position, setPosition] = useState(0);

  function renderView() {
    switch (step) {
      case "intro":
        return (
          <IntroView key="intro" onEnter={() => setStep("clouds")} />
        );
      case "clouds":
        return (
          <CloudFieldView
            key="clouds"
            onSelect={(p) => {
              setSelectedCloud(p);
              setStep("personality");
            }}
          />
        );
      case "personality":
        if (!selectedCloud) return null;
        return (
          <PersonalityView
            key="personality"
            personality={selectedCloud}
            onClose={() => {
              setSelectedCloud(null);
              setStep("clouds");
            }}
            onJoin={() => setStep("signup")}
          />
        );
      case "signup":
        if (!selectedCloud) return null;
        return (
          <SignupView
            key="signup"
            cloudType={selectedCloud.id}
            onClose={() => setStep("personality")}
            onSuccess={(pos) => {
              setPosition(pos);
              setStep("success");
            }}
          />
        );
      case "success":
        return <SuccessView key="success" position={position} />;
      default:
        return null;
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050810]">
      {/* Layer 1: Atmosphere — always present, non-interactive */}
      <Atmosphere />

      {/* Layer 2: Content — one view at a time */}
      <main className="relative z-10 flex items-center justify-center w-full h-full">
        <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
      </main>
    </div>
  );
}
