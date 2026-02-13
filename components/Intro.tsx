"use client";

import Image from "next/image";

interface IntroProps {
  onEnter: () => void;
}

export default function Intro({ onEnter }: IntroProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 animate-fade-in">
      <Image
        src="/logo.svg"
        alt="Leo Mây"
        width={280}
        height={124}
        className="h-auto w-[min(85vw,280px)]"
        style={{ filter: "brightness(0) invert(1)" }}
      />
      <button
        type="button"
        onClick={onEnter}
        className="px-8 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
        style={{ fontFamily: "var(--font-leo)" }}
      >
        Enter
      </button>
    </div>
  );
}
