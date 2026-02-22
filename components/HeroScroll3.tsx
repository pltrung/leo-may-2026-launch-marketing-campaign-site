"use client";

import { useState } from "react";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { withHighlights } from "@/lib/heroHighlights";

interface HeroScroll3Props {
  pose: "front" | "back";
}

const IMAGE_MAP: Record<string, string> = {
  front: "/brand/ip-climbing-on-hold.svg",
  back: "/brand/ip-on-cloud.svg",
};

/** Hero page scroll section 3: Imagine a climbing space designed with intention */
export default function HeroScroll3({ pose }: HeroScroll3Props) {
  const [imgErrored, setImgErrored] = useState(false);
  const imgSrc = IMAGE_MAP[pose];
  const locale = useLocale();
  const { hero3Above, hero3BelowLine1, hero3BelowLine2, hero3BelowHighlights } = getMessages(locale).hero;

  return (
    <section className="hero-section hero-section-scroll relative overflow-hidden px-6">
      {pose === "front" && (
        <div className="hero-text philosophy-text max-w-2xl mx-auto text-center">
          <div className="hero-line-primary text-white/90 whitespace-pre-line">
            {hero3Above}
          </div>
        </div>
      )}
      <div className="flex items-center justify-center w-[70%] max-w-[400px] aspect-square mx-auto pointer-events-none">
        {!imgErrored && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt=""
              className="hero-ip w-full h-full object-contain animate-ip-bounce"
              loading="eager"
              fetchPriority="high"
              onError={() => setImgErrored(true)}
            />
          </>
        )}
      </div>
      {pose === "front" && hero3BelowLine1 != null && hero3BelowLine2 != null && (
        <div className="hero-text philosophy-text hero-line-secondary-wrapper hero-below-image-text max-w-2xl mx-auto text-center">
          <div className="hero-line-primary text-white/90 whitespace-pre-line">
            <span className="block">{withHighlights(hero3BelowLine1, hero3BelowHighlights ?? [], "neon-green")}</span>
            <span className="block mt-1">{hero3BelowLine2}</span>
          </div>
        </div>
      )}
    </section>
  );
}
