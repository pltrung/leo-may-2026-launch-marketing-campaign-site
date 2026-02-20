"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { withHighlights } from "@/lib/heroHighlights";

/** Hero page scroll section 5: Created alongside the designers behind Asia's largest climbing gyms */
export default function HeroScroll5() {
  const locale = useLocale();
  const { hero5, hero5Highlights } = getMessages(locale).hero;
  return (
    <section className="hero-section hero-section-scroll hero-cloud-section relative overflow-hidden px-6">
      <div className="hero-text cloud-eyes-text">
        <div className="hero-line-primary text-white tracking-headline whitespace-pre-line">
          {withHighlights(hero5, hero5Highlights ?? [], "neon-yellow")}
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
    </section>
  );
}
