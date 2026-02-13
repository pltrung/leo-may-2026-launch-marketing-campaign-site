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

      <div className="w-full max-w-4xl mx-auto">
        <div className="flex md:hidden overflow-x-auto overflow-y-visible gap-6 px-4 pb-4 -mx-4 snap-x snap-mandatory scroll-smooth">
          {clouds.map((cloud) => (
            <div key={cloud.id} className="flex-shrink-0 w-[180px] snap-center">
              <CloudCard cloud={cloud} onJoin={onSelect} />
            </div>
          ))}
        </div>
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 w-full justify-items-center place-items-center">
          {clouds.map((cloud) => (
            <CloudCard key={cloud.id} cloud={cloud} onJoin={onSelect} />
          ))}
        </div>
      </div>
    </section>
  );
}
