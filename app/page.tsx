"use client";

import { useEffect, useState, useCallback } from "react";
import { CloudPersonality } from "@/lib/cloudData";
import StepIntro from "@/components/steps/StepIntro";
import StepReveal from "@/components/steps/StepReveal";
import StepCloudField from "@/components/steps/StepCloudField";
import StepCloudDetail from "@/components/steps/StepCloudDetail";
import StepSignupModal from "@/components/steps/StepSignupModal";
import StepSuccess from "@/components/steps/StepSuccess";
import FogBackground from "@/components/FogBackground";

export type Step =
  | "intro"
  | "reveal"
  | "cloudField"
  | "cloudDetail"
  | "signupModal"
  | "success";

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [guestName, setGuestName] = useState("");
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [position, setPosition] = useState<number>(0);

  useEffect(() => {
    if (step !== "intro") return;
    const t = setTimeout(() => setStep("reveal"), 2000);
    return () => clearTimeout(t);
  }, [step]);

  const handleEnter = useCallback(() => {
    console.log("[Leo] Enter clicked, transitioning to cloudField");
    setStep("cloudField");
  }, []);
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
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Background — deep navy base + subtle fog. pointer-events: none so clicks pass through. */}
      <div
        className="absolute inset-0 -z-10"
        style={{ backgroundColor: "#0f172a", pointerEvents: "none" }}
        aria-hidden
      />
      {(step === "intro" || step === "reveal") && (
        <div
          className="absolute inset-0 -z-[5]"
          style={{ pointerEvents: "none" }}
          aria-hidden
        >
          <FogBackground variant="reveal" />
        </div>
      )}

      {/* Foreground content — flex-centered, receives clicks */}
      <div className="relative flex flex-col items-center justify-center w-full h-full z-10" style={{ pointerEvents: "auto" }}>
        {step === "intro" && <StepIntro />}
        {step === "reveal" && (
          <StepReveal
            guestName={guestName}
            setGuestName={setGuestName}
            onEnter={handleEnter}
          />
        )}
        {step === "cloudField" && (
          <StepCloudField onCloudClick={handleCloudClick} />
        )}
        {step === "success" && <StepSuccess position={position} />}
      </div>

      {/* Overlays — modals on top */}
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
          initialName={guestName}
          onClose={handleSignupClose}
          onSuccess={handleSignupSuccess}
        />
      )}
    </div>
  );
}
