"use client";

import { useState } from "react";
import { CloudPersonality } from "@/lib/cloudData";
import Intro from "@/components/Intro";
import CloudSelection from "@/components/CloudSelection";
import CloudDetails from "@/components/CloudDetails";
import Signup from "@/components/Signup";
import Success from "@/components/Success";

type Step = "intro" | "clouds" | "detail" | "signup" | "success";

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [position, setPosition] = useState(0);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#0f172a] text-white overflow-hidden">
      {step === "intro" && <Intro onEnter={() => setStep("clouds")} />}
      {step === "clouds" && (
        <CloudSelection
          onSelect={(cloud) => {
            setSelectedCloud(cloud);
            setStep("detail");
          }}
        />
      )}
      {step === "detail" && selectedCloud && (
        <CloudDetails
          cloud={selectedCloud}
          onPick={() => setStep("signup")}
        />
      )}
      {step === "signup" && selectedCloud && (
        <Signup
          cloudType={selectedCloud.id}
          onSuccess={(pos) => {
            setPosition(pos);
            setStep("success");
          }}
        />
      )}
      {step === "success" && selectedCloud && (
        <Success position={position} cloudTint={selectedCloud.tint} />
      )}
    </div>
  );
}
