"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";

/** Hero page scroll section 6: "You were never meant to move like ANYONE ELSE." */
export default function HeroScroll6() {
  const locale = useLocale();
  const { neverMeantToMove, anyoneElse } = getMessages(locale).hero;
  return (
    <section className="hero-section hero-section-scroll relative overflow-hidden px-6 flex items-center justify-center min-h-[50vh]">
      <div className="hero-text text-center">
        <div className="hero-line-primary text-white tracking-headline">
          {neverMeantToMove}
        </div>
        <div className="hero-line-anyone-else text-white tracking-headline whitespace-nowrap">
          <span className="neon-emphasis">{anyoneElse}</span>
        </div>
      </div>
    </section>
  );
}
