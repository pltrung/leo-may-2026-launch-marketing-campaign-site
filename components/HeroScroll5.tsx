"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { withHighlights } from "@/lib/heroHighlights";

/** Hero page scroll section 5: Created alongside the designers behind Asia's largest climbing gyms */
export default function HeroScroll5() {
  const locale = useLocale();
  const { hero5Above, hero5AboveHighlights, hero5BelowLine1, hero5BelowLine2, hero5BelowLine1Highlights, hero5BelowLine2Highlights } = getMessages(locale).hero;
  return (
    <section className="hero-section hero-section-scroll hero-cloud-section relative overflow-hidden px-6">
      <div className="hero-text cloud-eyes-text">
        <div className="hero-line-primary text-white tracking-headline whitespace-pre-line">
          {hero5AboveHighlights?.length ? withHighlights(hero5Above, hero5AboveHighlights, "neon-yellow") : hero5Above}
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
      <div className="hero-text philosophy-text hero-line-secondary-wrapper hero-below-image-text cloud-eyes-text">
        <div className="hero-line-primary text-white tracking-headline">
          {hero5BelowLine1 != null && (
            <span className="block">
              {hero5BelowLine1Highlights?.length ? withHighlights(hero5BelowLine1, hero5BelowLine1Highlights, "neon-green") : hero5BelowLine1}
            </span>
          )}
          {hero5BelowLine2 != null && (
            <span className="block mt-1">
              {hero5BelowLine2Highlights?.length ? withHighlights(hero5BelowLine2, hero5BelowLine2Highlights, "neon-cyan") : hero5BelowLine2}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
