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
      className="w-screen min-h-screen flex flex-col items-center justify-center text-white px-6 py-12"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.92)" }}
    >
      <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-light text-center mb-12 md:mb-16">
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
