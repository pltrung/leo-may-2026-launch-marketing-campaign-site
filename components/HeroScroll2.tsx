"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";

/** Hero page scroll section 2: tiered — small / big / small (Vietnam's First · Premium Climbing Gym · HCMC 2026) */
export default function HeroScroll2() {
  const locale = useLocale();
  const { hero2Row1, hero2Row2, hero2Row3 } = getMessages(locale).hero;
  return (
    <section className="hero-section hero-section-scroll relative overflow-hidden px-6">
      <div className="hero-text text-center max-w-xl mx-auto">
        <p className="font-caption font-semibold text-base sm:text-lg tracking-wide mb-3 text-white/90">
          {hero2Row1}
        </p>
        <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-headline leading-tight font-semibold">
          <span className="neon-yellow">{hero2Row2}</span>
        </h2>
        <p className="font-body mt-4 text-white/80 text-lg sm:text-xl">
          {hero2Row3}
        </p>
      </div>
    </section>
  );
}
