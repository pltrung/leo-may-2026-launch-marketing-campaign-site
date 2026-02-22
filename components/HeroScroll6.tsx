"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { withHighlights } from "@/lib/heroHighlights";

/** Hero page scroll section 6: A space crafted for movement, emotion, and community */
export default function HeroScroll6() {
  const locale = useLocale();
  const { hero6Line1, hero6Line2, hero6Line3, hero6Line2Highlight, hero6Line3Highlight } = getMessages(locale).hero;
  return (
    <section className="hero-section hero-section-scroll relative overflow-hidden px-6 flex items-center justify-center min-h-[50vh]">
      <div className="hero-text text-center">
        <div className="hero-line-primary text-white tracking-headline">
          {hero6Line1 != null && <span className="block">{hero6Line1}</span>}
          {hero6Line2 != null && (
            <span className="block mt-1">
              {hero6Line2Highlight ? withHighlights(hero6Line2, [hero6Line2Highlight], "neon-green") : hero6Line2}
            </span>
          )}
          {hero6Line3 != null && (
            <span className="block mt-1">
              {hero6Line3Highlight ? withHighlights(hero6Line3, [hero6Line3Highlight], "neon-cyan") : hero6Line3}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
