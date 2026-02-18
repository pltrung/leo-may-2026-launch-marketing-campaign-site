"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";

/** Hero page scroll section 5: "Like clouds, no two FORMS are ever the same." / VI: emphasis below mascot */
export default function HeroScroll5() {
  const locale = useLocale();
  const { likeClouds, forms, areEverSame } = getMessages(locale).hero;
  const emphasisBelowMascot = !forms && areEverSame;
  return (
    <section className="hero-section hero-section-scroll hero-cloud-section relative overflow-hidden px-6">
      <div className="hero-text cloud-eyes-text">
        <div className="hero-line-primary text-white tracking-headline whitespace-pre-line">
          {forms ? (
            <>{likeClouds} <span className="neon-yellow">{forms}</span> {areEverSame}</>
          ) : (
            <>{likeClouds}</>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center w-[63%] max-w-[300px] sm:w-[55%] sm:max-w-[260px] md:w-[70%] md:max-w-[400px] aspect-square mx-auto pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/cloud-singing.svg"
          alt="Singing Cloud"
          className="hero-ip w-full h-full object-contain"
          loading="eager"
          fetchPriority="high"
        />
      </div>
      {emphasisBelowMascot && (
        <div className="hero-text philosophy-text hero-line-secondary-wrapper hero-experienced-line md:mt-20">
          <div className="hero-line-primary text-white tracking-headline">
            <span className="neon-green">{areEverSame}</span>.
          </div>
        </div>
      )}
    </section>
  );
}
