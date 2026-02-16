"use client";

import Image from "next/image";
import Logo from "./Logo";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";

/** Hero page scroll section 1: "Climb the Clouds. Build a Culture." / "Bao hành trình. Bao hình dạng. CÙNG MỘT NHỊP TIM" */
export default function HeroScroll1() {
  const locale = useLocale();
  const { climbTheClouds, buildACulture, hero1Line1, hero1Line2, hero1Emphasis, scroll } = getMessages(locale).hero;
  const useCinematic = hero1Line1 && hero1Line2 && hero1Emphasis;
  return (
    <section className="relative min-h-[100dvh] h-[100dvh] flex flex-col items-center justify-center px-6 overflow-hidden pt-[120px] md:pt-24">
      <div className="absolute inset-0 -z-[1] opacity-[0.04] blur-3xl pointer-events-none" aria-hidden>
        <Image src="/logo-white.svg" alt="" fill className="object-contain scale-150" />
      </div>

      <nav className="fixed z-20 flex items-center top-6 left-6 right-0 pr-6">
        <div className="flex items-center">
          <Logo className="hero-logo w-[110px] md:w-[200px] max-w-[110px] md:max-w-none h-auto object-contain object-left" />
        </div>
        <div className="w-28" aria-hidden />
      </nav>

      {/* Center headline in viewport (ignore top padding so it sits at true 50%) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto">
        {useCinematic ? (
          <>
            <h1 className="hero-climb font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-headline leading-tight">
              {hero1Line1}
            </h1>
            <h1 className="hero-climb font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-headline leading-tight mt-3 sm:mt-4">
              {hero1Line2}
            </h1>
            <span className="hero-build block font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-headline mt-3 sm:mt-4">
              <span className="neon-green">{hero1Emphasis}</span>.
            </span>
          </>
        ) : (
          <>
            <h1 className="hero-climb font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-headline leading-tight whitespace-nowrap">
              {climbTheClouds}
            </h1>
            <span
              className="hero-build block font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-headline mt-3 sm:mt-4"
              style={{ color: "#00CB4D" }}
            >
              {buildACulture}
            </span>
          </>
        )}
      </div>

      <div className="hero-scroll absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2">
          <span className="font-caption text-white/70 text-xs tracking-widest uppercase">{scroll}</span>
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
