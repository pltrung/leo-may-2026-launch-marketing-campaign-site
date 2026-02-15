"use client";

import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudCard from "./CloudCard";
import CloudStackMobile from "./CloudStackMobile";
import Logo from "./Logo";

interface CloudSelectorProps {
  onSelect: (cloud: CloudPersonality) => void;
}

export default function CloudSelector({ onSelect }: CloudSelectorProps) {
  return (
    <section
      id="clouds"
      className="relative w-full h-screen md:min-h-screen md:h-auto flex flex-col items-center overflow-x-hidden overflow-y-hidden md:overflow-y-auto px-4 pb-4 pt-[88px] md:pb-16 md:pt-24 sm:px-6"
    >
      {/* Logo: fixed, smaller on mobile */}
      <div className="fixed top-0 left-0 p-4 z-30 md:pl-10 md:pt-8">
        <Logo className="w-[110px] md:w-[220px] max-w-[110px] md:max-w-none h-auto object-contain object-left" />
      </div>

      {/* Heading — no IP, recenter layout */}
      <div className="relative flex flex-col items-center w-full max-w-2xl mx-auto mt-4 md:mt-0 md:mb-8">
        <h2 className="font-headline text-[28px] md:text-[32px] leading-[1.2] sm:text-4xl md:text-5xl text-center text-white tracking-headline px-4">
          What type of cloud are you?
        </h2>
      </div>

      {/* Mobile: cinematic vertical cloud stack — fits one screen, no scroll */}
      <div className="md:hidden w-full flex-1 flex flex-col items-center justify-center min-h-0 mt-4">
        <CloudStackMobile onSelect={onSelect} />
      </div>

      {/* Desktop: grid with scroll hint */}
      <div className="hidden md:block w-full mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-4xl w-full mx-auto justify-items-center items-stretch overflow-visible">
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
