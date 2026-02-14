"use client";

import { useState, useEffect } from "react";
import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudCard from "./CloudCard";
import Logo from "./Logo";
import WalkingIpWithPuff from "./WalkingIpWithPuff";

interface CloudSelectorProps {
  onSelect: (cloud: CloudPersonality) => void;
}

export default function CloudSelector({ onSelect }: CloudSelectorProps) {
  const [puffKey, setPuffKey] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPuffKey((k) => k + 1), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      id="clouds"
      className="relative w-full min-h-screen flex flex-col items-center overflow-x-hidden overflow-y-auto px-4 pb-16 pt-[140px] sm:px-6 md:pt-24"
    >
      {/* Logo: fixed, smaller on mobile */}
      <div className="fixed top-0 left-0 p-4 z-30 md:pl-10 md:pt-8">
        <Logo className="w-[120px] md:w-[220px] h-auto object-contain object-left" />
      </div>

      {/* Heading: 32px mobile, 40px from logo, center */}
      <div className="relative flex flex-col items-center w-full max-w-2xl mx-auto mt-10 md:mt-0 md:mb-12">
        <h2 className="font-display text-[32px] leading-[1.2] sm:text-4xl md:text-5xl font-light text-center text-white px-4">
          What type of cloud are you?
        </h2>
        {/* IP: below heading, 32px gap, center, max 140px mobile, bounce */}
        <div className="relative w-full overflow-hidden mt-8 min-h-[100px] flex items-center justify-center">
          <div className="w-full max-w-[140px] md:max-w-none mx-auto flex justify-center animate-ip-bounce">
            <WalkingIpWithPuff puffKey={puffKey} />
          </div>
        </div>
      </div>

      {/* Mobile: single column, no horizontal scroll, 24px between cards, full width minus padding */}
      <div className="md:hidden w-full flex flex-col items-center gap-6 mt-10">
        {clouds.map((cloud) => (
          <div key={cloud.id} className="w-full flex justify-center px-0">
            <CloudCard cloud={cloud} onJoin={onSelect} />
          </div>
        ))}
      </div>

      {/* Desktop: grid - equal height, aligned */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 lg:gap-x-10 lg:gap-y-12 max-w-4xl w-full mx-auto justify-items-center items-stretch overflow-visible">
        {clouds.map((cloud) => (
          <div key={cloud.id} className="flex justify-center items-center w-full max-w-[200px]">
            <CloudCard cloud={cloud} onJoin={onSelect} />
          </div>
        ))}
      </div>
    </section>
  );
}
