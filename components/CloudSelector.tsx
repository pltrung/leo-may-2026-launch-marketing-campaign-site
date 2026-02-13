"use client";

import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudCard from "./CloudCard";
import Logo from "./Logo";

interface CloudSelectorProps {
  onSelect: (cloud: CloudPersonality) => void;
}

export default function CloudSelector({ onSelect }: CloudSelectorProps) {
  return (
    <section
      id="clouds"
      className="w-screen min-h-screen flex flex-col items-center justify-center px-6 py-16"
    >
      <div className="flex flex-col items-center mb-16">
        <Logo className="h-14 sm:h-16 w-auto object-contain max-w-full" />
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-center mt-8 text-storm max-w-2xl">
          What type of cloud are you?
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 max-w-4xl w-full mx-auto justify-items-center place-items-center">
        {clouds.map((cloud) => (
          <CloudCard key={cloud.id} cloud={cloud} onJoin={onSelect} />
        ))}
      </div>
    </section>
  );
}
