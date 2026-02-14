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
      className="relative w-full min-h-screen flex flex-col items-center overflow-x-hidden overflow-y-auto px-4 pb-16 pt-[120px] sm:px-6 md:pt-24"
    >
      {/* Logo: fixed, smaller on mobile */}
      <div className="fixed top-0 left-0 p-4 z-30 md:pl-10 md:pt-8">
        <Logo className="w-[110px] md:w-[220px] max-w-[110px] md:max-w-none h-auto object-contain object-left" />
      </div>

      {/* Heading: 32px mobile, 40px from logo, center */}
      <div className="relative flex flex-col items-center w-full max-w-2xl mx-auto mt-10 md:mt-0 md:mb-12">
        <h2 className="font-headline text-[32px] leading-[1.2] sm:text-4xl md:text-5xl text-center text-white tracking-headline px-4">
          What type of cloud are you?
        </h2>
        {/* IP: below heading, 32px gap, center, max 140px mobile, bounce */}
        <div className="relative w-full overflow-hidden mt-8 min-h-[100px] flex items-center justify-center">
          <div className="w-full max-w-[140px] md:max-w-none mx-auto flex justify-center animate-ip-bounce">
            <WalkingIpWithPuff puffKey={puffKey} />
          </div>
        </div>
      </div>

      {/* Mobile: horizontal scroll with bounce hint */}
      <div className="md:hidden w-full px-2 pb-4 mt-10">
        <div className="flex gap-6 overflow-x-auto overflow-y-visible pb-4 snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-2 px-2">
          {clouds.map((cloud) => (
            <div
              key={cloud.id}
              className="flex-shrink-0 w-[200px] snap-center flex justify-center"
            >
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

      {/* Desktop: grid with scroll hint */}
      <div className="hidden md:block w-full mt-10">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-12 max-w-4xl w-full mx-auto justify-items-center items-stretch overflow-visible">
          {clouds.map((cloud) => (
            <div
              key={cloud.id}
              className="flex justify-center items-stretch w-full max-w-[200px] lg:max-w-[240px]"
            >
              <CloudCard cloud={cloud} onJoin={onSelect} />
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-6" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/arrow-right.svg"
            alt=""
            className="w-8 h-auto animate-bounce object-contain"
          />
        </div>
      </div>
    </section>
  );
}
