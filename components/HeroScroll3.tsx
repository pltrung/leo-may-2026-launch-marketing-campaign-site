"use client";

import { useState } from "react";

interface HeroScroll3Props {
  pose: "front" | "back";
}

const IMAGE_MAP: Record<string, string> = {
  front: "/brand/ip-climbing-on-hold.svg",
  back: "/brand/ip-on-cloud.svg",
};

/** Hero page scroll section 3: "Imagine a place where movement feels like breath" */
export default function HeroScroll3({ pose }: HeroScroll3Props) {
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  const imgSrc = IMAGE_MAP[pose];

  return (
    <section className="hero-section hero-section-scroll relative overflow-hidden px-6">
      {pose === "front" && (
        <div className="hero-text font-medium text-white/90 text-3xl sm:text-4xl md:text-5xl lg:text-6xl max-w-2xl leading-relaxed">
          Imagine a place where <span style={{ color: "#00CB4D" }}>movement</span> feels like breath
        </div>
      )}
      <div className="flex items-center justify-center w-[70%] max-w-[400px] aspect-square pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="hero-ip w-full h-full object-contain animate-ip-bounce"
          loading="eager"
          fetchPriority="high"
          onError={() => setErrored(true)}
        />
      </div>
    </section>
  );
}
