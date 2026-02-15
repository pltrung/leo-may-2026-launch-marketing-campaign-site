"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";

/** Hero page scroll section 2: "Coming to Ho Chi Minh City" */
export default function HeroScroll2() {
  const locale = useLocale();
  const { comingTo, hoChiMinhCity, vietnam2026 } = getMessages(locale).hero;
  return (
    <section className="hero-section hero-section-scroll relative overflow-hidden px-6">
      <div className="hero-text text-center max-w-xl mx-auto">
        <p className="font-caption font-semibold text-base sm:text-lg tracking-wide mb-3 text-white/90">
          <span className="neon-green">{comingTo}</span>
        </p>
        <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-headline leading-tight font-semibold">
          {hoChiMinhCity}
        </h2>
        <p className="font-body mt-4 text-white/80 text-lg sm:text-xl">
          {vietnam2026}
        </p>
      </div>
    </section>
  );
}
