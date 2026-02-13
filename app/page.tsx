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

  // Step 0: intro (fog only 0-2s) → auto to reveal
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
      {/* Step 0: intro — fog only */}
      {step === "intro" && <StepIntro />}

      {/* Step 1: reveal — logo + tagline + Enter */}
      {step === "reveal" && <StepReveal onEnter={handleEnter} />}

      {/* Step 2: cloudField — 6 floating blobs, names hidden */}
      {step === "cloudField" && <StepCloudField onCloudClick={handleCloudClick} />}

      {/* Step 3: cloudDetail — expand cloud, reveal personality + CTA */}
      {step === "cloudDetail" && selectedCloud && (
        <StepCloudDetail
          personality={selectedCloud}
          onClose={handleCloudDetailClose}
          onCtaClick={handleCtaClick}
        />
      )}

      {/* Step 4: signupModal — name, email, phone (no dropdown) */}
      {step === "signupModal" && selectedCloud && (
        <StepSignupModal
          cloudType={selectedCloud.id}
          onClose={handleSignupClose}
          onSuccess={handleSignupSuccess}
        />
      )}

      {/* Step 5: success — confirmation + waitlist # */}
      {step === "success" && <StepSuccess position={position} />}
    </main>
  );
}
