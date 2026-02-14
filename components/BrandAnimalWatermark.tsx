"use client";

import { useState } from "react";

interface BrandAnimalWatermarkProps {
  variant: "hero" | "location";
}

export default function BrandAnimalWatermark({ variant }: BrandAnimalWatermarkProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  if (variant === "hero") {
    return (
      <div
        className="absolute pointer-events-none overflow-hidden"
        style={{
          right: "-15%",
          bottom: "-20%",
          width: "60%",
          height: "70%",
          opacity: loaded ? 0.06 : 0,
          zIndex: 0,
        }}
        aria-hidden
      >
        {/* Add brand-animal.png to public/ for the Leo Mây brand animal */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand-animal.png"
          alt=""
          className="w-full h-full object-contain object-bottom-right"
          style={{ objectPosition: "right bottom" }}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  if (variant === "location") {
    return (
      <div
        className="absolute pointer-events-none animate-breathe"
        style={{
          right: "8%",
          top: "35%",
          width: 120,
          height: 120,
          opacity: loaded ? 0.4 : 0,
          zIndex: 0,
        }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand-animal.png"
          alt=""
          className="w-full h-full object-contain"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  return null;
}
