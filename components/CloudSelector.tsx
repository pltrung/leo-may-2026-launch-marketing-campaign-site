"use client";

import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudCard from "./CloudCard";

interface CloudSelectorProps {
  onSelect: (cloud: CloudPersonality) => void;
}

export default function CloudSelector({ onSelect }: CloudSelectorProps) {
  return (
    <section
      id="clouds"
      className="w-screen min-h-screen flex flex-col items-center justify-center px-6 py-12"
    >
      <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-center px-6 py-6">
        <div className="w-32 h-12 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Leo Mây"
            className="h-10 w-auto object-contain max-w-full"
          />
        </div>
      </nav>
      <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-center mb-12 md:mb-16 mt-4 text-storm">
        What type of cloud are you?
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-4xl w-full justify-items-center place-items-center">
        {clouds.map((cloud) => (
          <CloudCard key={cloud.id} cloud={cloud} onJoin={onSelect} />
        ))}
      </div>
    </section>
  );
}
