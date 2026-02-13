"use client";

import { useEffect, useState } from "react";
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
    <main className="leo-main min-h-screen w-full relative">
      {/* Full-screen steps (entrance → reveal → cloud field → success) */}
      {step === "intro" && <StepIntro />}
      {step === "reveal" && <StepReveal onEnter={handleEnter} />}
      {step === "cloudField" && <StepCloudField onCloudClick={handleCloudClick} />}
      {step === "success" && <StepSuccess position={position} />}
      {/* Overlay steps (modal-style, In-Dinner z-[60] pattern) */}
      {step === "cloudDetail" && selectedCloud && (
        <StepCloudDetail
          personality={selectedCloud}
          onClose={handleCloudDetailClose}
          onCtaClick={handleCtaClick}
        />
      )}
      {step === "signupModal" && selectedCloud && (
        <StepSignupModal
          cloudType={selectedCloud.id}
          onClose={handleSignupClose}
          onSuccess={handleSignupSuccess}
        />
      )}
    </main>
  );
}
