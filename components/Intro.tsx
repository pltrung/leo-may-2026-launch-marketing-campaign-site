"use client";

import Image from "next/image";

export default function Intro({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-16 fade-in">
      <Image
        src="/logo.svg"
        alt="Leo May"
        width={280}
        height={124}
        className="w-[min(80vw,300px)] h-auto"
        style={{ filter: "brightness(0) invert(1)" }}
        priority
      />
      <button
        type="button"
        onClick={onEnter}
        className="text-white/80 hover:text-white text-sm tracking-[0.3em] uppercase transition-colors duration-300"
      >
        Enter
      </button>
    </div>
  );
}
