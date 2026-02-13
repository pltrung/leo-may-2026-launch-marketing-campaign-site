"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CloudPersonality } from "@/lib/cloudData";
import StepIntro from "@/components/steps/StepIntro";
import StepReveal from "@/components/steps/StepReveal";
import StepCloudField from "@/components/steps/StepCloudField";
import StepCloudDetail from "@/components/steps/StepCloudDetail";
import StepSignupModal from "@/components/steps/StepSignupModal";
import StepSuccess from "@/components/steps/StepSuccess";

export type Step =
  | "intro"
  | "reveal"
  | "cloudField"
  | "cloudDetail"
  | "signupModal"
  | "success";

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [position, setPosition] = useState<number>(0);

  useEffect(() => {
    if (step !== "intro") return;
    const t = setTimeout(() => setStep("reveal"), 2000);
    return () => clearTimeout(t);
  }, [step]);

  const handleEnter = () => setStep("cloudField");
  const handleCloudClick = (p: CloudPersonality) => {
    setSelectedCloud(p);
    setStep("cloudDetail");
  };
  const handleCloudDetailClose = () => {
    setSelectedCloud(null);
    setStep("cloudField");
  };
  const handleCtaClick = () => setStep("signupModal");
  const handleSignupClose = () => setStep("cloudDetail");
  const handleSignupSuccess = (pos: number) => {
    setPosition(pos);
    setStep("success");
  };

  return (
    <main className="min-h-screen">
      <AnimatePresence mode="wait">
        {step === "intro" && <StepIntro key="intro" />}
        {step === "reveal" && <StepReveal key="reveal" onEnter={handleEnter} />}
        {step === "cloudField" && (
          <StepCloudField key="cloudField" onCloudClick={handleCloudClick} />
        )}
        {step === "cloudDetail" && selectedCloud && (
          <StepCloudDetail
            key="cloudDetail"
            personality={selectedCloud}
            onClose={handleCloudDetailClose}
            onCtaClick={handleCtaClick}
          />
        )}
        {step === "signupModal" && selectedCloud && (
          <StepSignupModal
            key="signupModal"
            cloudType={selectedCloud.id}
            onClose={handleSignupClose}
            onSuccess={handleSignupSuccess}
          />
        )}
        {step === "success" && <StepSuccess key="success" position={position} />}
      </AnimatePresence>
    </main>
  );
}
