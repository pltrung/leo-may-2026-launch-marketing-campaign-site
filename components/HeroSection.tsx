"use client";

import Image from "next/image";
import Logo from "./Logo";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen h-screen flex flex-col items-center justify-center px-6 overflow-hidden pt-[120px] md:pt-24">
      <div className="absolute inset-0 -z-[1] opacity-[0.04] blur-3xl pointer-events-none" aria-hidden>
        <Image src="/logo-white.svg" alt="" fill className="object-contain scale-150" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between pl-10 pt-8 pb-6 pr-6">
        <div className="flex items-center">
          <Logo className="hero-logo w-[110px] md:w-[200px] max-w-[110px] md:max-w-none h-auto object-contain object-left" />
        </div>
        <div className="w-28" aria-hidden />
      </nav>

      {/* Center headline in viewport (ignore top padding so it sits at true 50%) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 max-w-2xl mx-auto">
        <h1 className="hero-climb font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-headline leading-tight">
          Climb the Clouds.
        </h1>
        <span
          className="hero-build block font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-headline mt-3 sm:mt-4"
          style={{ color: "#00CB4D" }}
        >
          Build a Culture.
        </span>
      </div>

      <div className="hero-scroll absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2">
          <span className="font-caption text-white/70 text-xs tracking-widest uppercase">Scroll</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/arrow-up.svg"
            alt=""
            className="w-8 h-auto animate-bounce object-contain"
          />
        </div>
      </div>
    </section>
  );
}
