"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { withHighlights } from "@/lib/heroHighlights";

/** Hero page scroll section 6: A space crafted for movement, emotion, and community */
export default function HeroScroll6() {
  const locale = useLocale();
  const { hero6, hero6Highlights } = getMessages(locale).hero;
  return (
    <section className="hero-section hero-section-scroll relative overflow-hidden px-6 flex items-center justify-center min-h-[50vh]">
      <div className="hero-text text-center">
        <div className="hero-line-primary text-white tracking-headline">
          {withHighlights(hero6, hero6Highlights ?? [], "neon-green")}
        </div>
      </div>
    </section>
  );
}
