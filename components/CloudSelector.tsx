"use client";

import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudCard from "./CloudCard";
import Logo from "./Logo";
import BrandAnimalWatermark from "./BrandAnimalWatermark";

interface CloudSelectorProps {
  onSelect: (cloud: CloudPersonality) => void;
}

export default function CloudSelector({ onSelect }: CloudSelectorProps) {
  return (
    <section
      id="clouds"
      className="relative w-full min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-16 overflow-x-hidden"
    >
      <div className="absolute top-0 left-0 pl-10 pt-8 z-20">
        <Logo className="w-[140px] md:w-[200px] h-auto object-contain object-left" />
      </div>

      <div className="relative flex flex-col items-center mb-16 mt-16 py-4 px-6 min-h-[140px] w-full">
        <BrandAnimalWatermark variant="cloud" />
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-center text-white max-w-2xl px-4 mt-4">
          What type of cloud are you?
        </h2>
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
