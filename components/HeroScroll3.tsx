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
  const [imgErrored, setImgErrored] = useState(false);
  const imgSrc = IMAGE_MAP[pose];

  return (
    <section className="hero-section hero-section-scroll relative overflow-hidden px-6">
      {pose === "front" && (
        <div className="hero-text philosophy-text max-w-2xl mx-auto text-center">
          <div className="hero-line-primary text-white/90">
            Imagine a place where <span className="neon-green">MOVEMENT</span> feels like breath
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
    </section>
  );
}
