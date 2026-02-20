"use client";

import { useEffect, useRef, useCallback } from "react";
import { useLocale } from "./LocaleProvider";
import { getMessages } from "@/lib/messages";
import { withHighlights } from "@/lib/heroHighlights";
import type { MascotPartColors } from "@/lib/mascotSpeciesColors";

/** Applies cloud part colors to ip-flying.svg loaded via object. SVG uses .cls-9 (eyes), .cls-10 (scarf/cloud), .cls-6 (nose). */
function applyFlyingColors(doc: Document | null, partColors: MascotPartColors) {
  if (!doc) return;
  const setFill = (el: SVGElement, value: string) => el.style.setProperty("fill", value, "important");
  const setStroke = (el: SVGElement, value: string) => el.style.setProperty("stroke", value, "important");
  const root = doc.documentElement;
  if (root && root instanceof SVGElement) {
    root.style.setProperty("color", "#fffef8", "important");
  }
  doc.querySelectorAll(".cls-9").forEach((el) => setFill(el as SVGElement, partColors.eyeLeft));
  doc.querySelectorAll(".cls-10").forEach((el) => setFill(el as SVGElement, partColors.scarf));
  doc.querySelectorAll(".cls-6").forEach((el) => setFill(el as SVGElement, partColors.nose));
  doc.querySelectorAll(".cls-2").forEach((el) => setStroke(el as SVGElement, partColors.cloudOutline));
}

/** Hero page scroll section 4: World-class routes. International interior design. Curated atmosphere. */
export default function HeroScroll4({ partColors }: { partColors?: MascotPartColors | null }) {
  const locale = useLocale();
  const { hero4, hero4Highlights } = getMessages(locale).hero;
  const objectRef = useRef<HTMLObjectElement>(null);

  const applyColors = useCallback(
    (doc: Document | null) => {
      if (partColors) applyFlyingColors(doc, partColors);
    },
    [partColors]
  );

  useEffect(() => {
    const el = objectRef.current;
    if (!el || !partColors) return;
    const tryApply = () => applyColors(el.contentDocument);
    const onLoad = () => tryApply();
    if (el.contentDocument?.readyState === "complete") tryApply();
    else el.addEventListener("load", onLoad);
    const t = setTimeout(tryApply, 100);
    const t2 = setTimeout(tryApply, 400);
    return () => {
      el.removeEventListener("load", onLoad);
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [applyColors, partColors]);

  return (
    <section className="hero-section hero-section-scroll hero-mist-section relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-[50%] max-w-[280px] h-[50%] max-h-[280px] rounded-full bg-white/12 animate-mist-drift" style={{ filter: "blur(35px)" }} />
        <div className="absolute top-1/2 right-1/4 w-[45%] max-w-[220px] h-[45%] max-h-[220px] rounded-full bg-white/10 animate-mist-drift" style={{ filter: "blur(40px)", animationDelay: "-6s" }} />
        <div className="absolute bottom-1/3 left-1/2 w-[48%] max-w-[260px] h-[48%] max-h-[260px] rounded-full bg-white/11 animate-mist-drift" style={{ filter: "blur(38px)", animationDelay: "-12s" }} />
      </div>
      <div className="hero-text philosophy-text">
        <div className="hero-line-primary whitespace-pre-line text-white/90">
          {withHighlights(hero4, hero4Highlights ?? [], ["neon-green", "neon-yellow", "neon-cyan"])}
        </div>
      </div>
      <div className="hero-ip-wrap flex items-center justify-center w-[63%] max-w-[300px] sm:w-[55%] sm:max-w-[260px] aspect-square mx-auto pointer-events-none">
        {partColors ? (
          <object
            ref={objectRef}
            data="/brand/ip-flying.svg"
            type="image/svg+xml"
            aria-hidden
            className="hero-ip w-full h-full object-contain animate-ip-bounce"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/brand/ip-flying.svg"
            alt="Leo Mây Flying"
            className="hero-ip w-full h-full object-contain animate-ip-bounce"
            loading="eager"
            fetchPriority="high"
          />
        )}
      </div>
    </section>
  );
}
