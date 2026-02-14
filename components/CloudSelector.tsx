"use client";

import { clouds, CloudPersonality } from "@/lib/cloudData";
import CloudCard from "./CloudCard";
import Logo from "./Logo";
import BrandAnimalWatermark from "./BrandAnimalWatermark";

interface CloudSelectorProps {
  onSelect: (cloud: CloudPersonality) => void;
}

function DecorativeHold({ x, y, delay, className }: { x: string; y: string; delay: number; className?: string }) {
  return (
    <div
      className={`absolute w-6 h-6 opacity-50 animate-hold-float pointer-events-none ${className ?? ""}`}
      style={{
        left: x,
        top: y,
        animationDelay: `-${delay}s`,
        animationDuration: `${6 + delay}s`,
      }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="text-storm/50">
        <ellipse cx="12" cy="12" rx="8" ry="6" />
      </svg>
    </div>
  );
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
        <DecorativeHold x="-12px" y="-8px" delay={0} />
        <DecorativeHold x="calc(100% + 8px)" y="-4px" delay={1} />
        <DecorativeHold x="-8px" y="calc(100% + 4px)" delay={2} />
        <DecorativeHold x="calc(100% + 12px)" y="calc(100% + 8px)" delay={0.5} />
        <DecorativeHold x="50%" y="-16px" delay={1.5} className="-translate-x-1/2" />
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-center mt-8 text-storm max-w-2xl px-4">
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
