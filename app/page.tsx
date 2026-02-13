"use client";

import { useState } from "react";
import { CloudPersonality } from "@/lib/cloudData";
import StepReveal from "@/components/steps/StepReveal";
import StepCloudField from "@/components/steps/StepCloudField";
import StepCloudDetail from "@/components/steps/StepCloudDetail";
import StepSignupModal from "@/components/steps/StepSignupModal";
import StepSuccess from "@/components/steps/StepSuccess";

type Step = "intro" | "cloudField" | "cloudDetail" | "signup" | "success";

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [guestName, setGuestName] = useState("");
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [position, setPosition] = useState<number>(0);

  function renderStep() {
    switch (step) {
      case "intro":
        return (
          <StepReveal
            guestName={guestName}
            setGuestName={setGuestName}
            onEnter={() => {
              console.log("ENTER CLICKED");
              setStep("cloudField");
            }}
          />
        );
      case "cloudField":
        return (
          <StepCloudField
            onCloudClick={(p) => {
              setSelectedCloud(p);
              setStep("cloudDetail");
            }}
          />
        );
      case "cloudDetail":
        if (!selectedCloud) return null;
        return (
          <StepCloudDetail
            personality={selectedCloud}
            onClose={() => {
              setSelectedCloud(null);
              setStep("cloudField");
            }}
            onCtaClick={() => setStep("signup")}
          />
        );
      case "signup":
        if (!selectedCloud) return null;
        return (
          <StepSignupModal
            cloudType={selectedCloud.id}
            initialName={guestName}
            onClose={() => setStep("cloudDetail")}
            onSuccess={(pos) => {
              setPosition(pos);
              setStep("success");
            }}
          />
        );
      case "success":
        return <StepSuccess position={position} />;
      default:
        return null;
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0f172a]">
      {/* Layer 1: Background — fog disabled for now; plain color */}
      <div className="absolute inset-0 pointer-events-none -z-10" aria-hidden />

      {/* Layer 2: Foreground interaction — ONE step at a time */}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        {renderStep()}
      </div>
    </div>
  );
}
