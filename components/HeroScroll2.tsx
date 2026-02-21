"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";

/** Renders a line with optional phrases wrapped in neon-yellow (sparing highlight). */
function lineWithHighlights(
  line: string,
  highlights: string[] | undefined
): React.ReactNode {
  if (!highlights?.length) return line;
  const parts: React.ReactNode[] = [];
  let remaining = line;
  while (remaining.length > 0) {
    let earliest = -1;
    let phrase = "";
    for (const p of highlights) {
      const idx = remaining.indexOf(p);
      if (idx !== -1 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
        phrase = p;
      }
    }
    if (earliest === -1) {
      parts.push(remaining);
      break;
    }
    parts.push(remaining.slice(0, earliest));
    parts.push(<span key={remaining + phrase} className="neon-yellow">{phrase}</span>);
    remaining = remaining.slice(earliest + phrase.length);
  }
  return parts.length > 0 ? parts : line;
}

/** Hero page scroll section 2: tiered — small / 2-line main / small (LEO MÂY · institutional headline · city — year) */
export default function HeroScroll2() {
  const locale = useLocale();
  const {
    hero2Row1,
    hero2Row2Line1,
    hero2Row2Line2,
    hero2Row3,
    hero2Highlights,
  } = getMessages(locale).hero;
  return (
    <section className="hero-section hero-section-scroll relative overflow-hidden px-6">
      <div className="hero-text text-center max-w-xl mx-auto">
        <p className="font-caption font-semibold text-base sm:text-lg tracking-wide mb-3 text-white/90">
          {hero2Row1}
        </p>
        <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-headline leading-tight font-semibold">
          <span className="block">{lineWithHighlights(hero2Row2Line1, hero2Highlights)}</span>
          <span className="block mt-1">{lineWithHighlights(hero2Row2Line2, hero2Highlights)}</span>
        </h2>
        <p className="font-body mt-4 text-white/80 text-lg sm:text-xl">
          {hero2Row3}
        </p>
      </div>
    </section>
  );
}
