"use client";

import { useState } from "react";
import { CloudPersonality } from "@/lib/cloudData";
import Intro from "@/components/Intro";
import CloudSelection from "@/components/CloudSelection";
import CloudDetails from "@/components/CloudDetails";
import Signup from "@/components/Signup";
import Success from "@/components/Success";

type Step = "intro" | "clouds" | "details" | "signup" | "success";

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [selectedCloud, setSelectedCloud] = useState<CloudPersonality | null>(null);
  const [position, setPosition] = useState(0);

  if (step === "intro") {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#0f172a] text-white">
        <Intro onEnter={() => setStep("clouds")} />
      </div>
    );
  }
  if (step === "clouds") {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#0f172a] text-white">
        <CloudSelection
          onSelect={(cloud) => {
            setSelectedCloud(cloud);
            setStep("details");
          }}
        />
      </div>
    );
  }
  if (step === "details" && selectedCloud) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#0f172a] text-white">
        <CloudDetails
          cloud={selectedCloud}
          onPick={() => setStep("signup")}
        />
      </div>
    );
  }
  if (step === "signup" && selectedCloud) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#0f172a] text-white">
        <Signup
          cloudType={selectedCloud.id}
          onSuccess={(pos) => {
            setPosition(pos);
            setStep("success");
          }}
        />
      </div>
    );
  }
  if (step === "success" && selectedCloud) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#0f172a] text-white">
        <Success position={position} cloudTint={selectedCloud.tint} />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#0f172a] text-white">
      <p>Loading...</p>
    </div>
  );
}
