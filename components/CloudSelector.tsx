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
      className="relative w-full min-h-screen flex flex-col items-start justify-start px-4 sm:px-6 pt-24 pb-16 overflow-x-hidden overflow-y-auto"
    >
      <div className="fixed top-0 left-0 pl-10 pt-8 z-30">
        <Logo className="w-[160px] md:w-[220px] h-auto object-contain object-left" />
      </div>

      <div className="relative flex flex-col items-center w-full max-w-2xl mx-auto mb-12">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-center text-white px-4">
          What type of cloud are you?
        </h2>
        <div className="relative w-full overflow-hidden mt-8 min-h-[100px] flex items-center justify-center">
          <WalkingIpWithPuff puffKey={puffKey} />
        </div>
      </div>

      {/* Mobile: horizontal scroll with bounce hint */}
      <div className="md:hidden w-full px-2 pb-4">
        <div className="flex gap-6 overflow-x-auto overflow-y-visible pb-4 snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-2 px-2">
          {clouds.map((cloud) => (
            <div key={cloud.id} className="flex-shrink-0 w-[200px] snap-center flex justify-center">
              <CloudCard cloud={cloud} onJoin={onSelect} />
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-2" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/arrow-right.svg"
            alt=""
            className="w-8 h-auto animate-bounce object-contain"
          />
        </div>
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 max-w-4xl w-full mx-auto justify-items-center place-items-center overflow-visible">
        {clouds.map((cloud) => (
          <CloudCard key={cloud.id} cloud={cloud} onJoin={onSelect} />
        ))}
      </div>
    </section>
  );
}
