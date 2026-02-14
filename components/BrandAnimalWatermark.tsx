"use client";

import { useState } from "react";

interface BrandAnimalWatermarkProps {
  variant: "hero" | "location" | "cloud";
}

export default function BrandAnimalWatermark({ variant }: BrandAnimalWatermarkProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  const imgSrc = "/leo-may-ip.png";
  const bgSize = "300% 100%";
  const bgPositions: Record<string, string> = {
    hero: "0% 0%",
    location: "50% 0%",
    cloud: "100% 0%",
  };
  const bgPos = bgPositions[variant];

  if (variant === "hero") {
    return (
      <div
        className="absolute pointer-events-none overflow-hidden"
        style={{
          right: "-15%",
          bottom: "-20%",
          width: "55%",
          height: "65%",
          opacity: loaded ? 0.5 : 0,
          zIndex: 0,
        }}
        aria-hidden
      >
        <div
          className="w-full h-full bg-no-repeat bg-contain"
          style={{
            backgroundImage: `url(${imgSrc})`,
            backgroundSize: bgSize,
            backgroundPosition: bgPos,
            objectPosition: "right bottom",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="hidden"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  if (variant === "location") {
    return (
      <div
        className="absolute pointer-events-none overflow-hidden animate-breathe"
        style={{
          right: "6%",
          top: "32%",
          width: 140,
          height: 140,
          opacity: loaded ? 0.45 : 0,
          zIndex: 0,
        }}
        aria-hidden
      >
        <div
          className="w-full h-full bg-no-repeat bg-contain"
          style={{
            backgroundImage: `url(${imgSrc})`,
            backgroundSize: bgSize,
            backgroundPosition: bgPos,
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="hidden"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  if (variant === "cloud") {
    return (
      <div
        className="absolute pointer-events-none overflow-hidden"
        style={{
          left: "50%",
          bottom: "8%",
          transform: "translateX(-50%)",
          width: 140,
          height: 140,
          opacity: loaded ? 1 : 0,
          zIndex: 0,
        }}
        aria-hidden
      >
        <div
          className="w-full h-full bg-no-repeat bg-contain"
          style={{
            backgroundImage: `url(${imgSrc})`,
            backgroundSize: bgSize,
            backgroundPosition: bgPos,
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="hidden"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  return null;
}
