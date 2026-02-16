"use client";

import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";

/** Hero page scroll section 4: "Where your SHAPE is never QUESTIONED. Only EXPERIENCED." */
export default function HeroScroll4() {
  const locale = useLocale();
  const { whereShape, shape, isNever, questioned, only, experienced } = getMessages(locale).hero;
  return (
    <section className="hero-section hero-section-scroll hero-mist-section relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-[50%] max-w-[280px] h-[50%] max-h-[280px] rounded-full bg-white/12 animate-mist-drift" style={{ filter: "blur(35px)" }} />
        <div className="absolute top-1/2 right-1/4 w-[45%] max-w-[220px] h-[45%] max-h-[220px] rounded-full bg-white/10 animate-mist-drift" style={{ filter: "blur(40px)", animationDelay: "-6s" }} />
        <div className="absolute bottom-1/3 left-1/2 w-[48%] max-w-[260px] h-[48%] max-h-[260px] rounded-full bg-white/11 animate-mist-drift" style={{ filter: "blur(38px)", animationDelay: "-12s" }} />
      </div>
      <div className="hero-text philosophy-text">
        <div className="hero-line-primary">
          {isNever ? (
            <>
              {whereShape} <span className="neon-green">{shape}</span> {isNever} <span className="neon-yellow">{questioned}</span>.
            </>
          ) : (
            <>
              {whereShape} <span className="neon-green">{shape}</span>.
            </>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center w-[63%] max-w-[300px] sm:w-[55%] sm:max-w-[260px] aspect-square mx-auto pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/ip-flying.svg"
          alt="Leo Mây Flying"
          className="hero-ip w-full h-full object-contain animate-ip-bounce"
          loading="eager"
          fetchPriority="high"
        />
      </div>
      <div className="hero-text philosophy-text hero-line-secondary-wrapper hero-experienced-line md:mt-20">
        <div className="hero-line-primary text-white/90">
          {only} <span className="neon-cyan">{experienced}</span>.
        </div>
      </div>
    </section>
  );
}
