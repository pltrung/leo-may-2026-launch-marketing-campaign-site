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
      className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 py-16 overflow-x-hidden"
    >
      <BrandAnimalWatermark variant="cloud" />
      <div className="absolute top-0 left-0 pl-10 pt-8 z-20">
        <Logo className="w-[140px] md:w-[200px] h-auto object-contain object-left" />
      </div>

      <div className="relative flex flex-col items-center mb-16 mt-16 py-4 px-6">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-center text-storm max-w-2xl px-4">
          What type of cloud are you?
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 max-w-4xl w-full mx-auto justify-items-center place-items-center overflow-visible">
        {clouds.map((cloud) => (
          <CloudCard key={cloud.id} cloud={cloud} onJoin={onSelect} />
        ))}
      </div>
    </section>
  );
}
