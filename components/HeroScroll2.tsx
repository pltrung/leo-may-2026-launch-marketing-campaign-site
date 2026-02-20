"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { withHighlights } from "@/lib/heroHighlights";

/** Hero page scroll section 2: Vietnam's First Premium Climbing Gym — HCMC 2026 */
export default function HeroScroll2() {
  const locale = useLocale();
  const { hero2, hero2Highlights } = getMessages(locale).hero;
  return (
    <section className="hero-section hero-section-scroll relative overflow-hidden px-6">
      <div className="hero-text text-center max-w-xl mx-auto">
        <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-headline leading-tight font-semibold">
          {withHighlights(hero2, hero2Highlights ?? [], "neon-yellow")}
        </h2>
      </div>
    </section>
  );
}
