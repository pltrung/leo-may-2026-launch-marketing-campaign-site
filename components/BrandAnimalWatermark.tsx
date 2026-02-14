"use client";

import { useState } from "react";

interface BrandAnimalWatermarkProps {
  variant: "hero" | "location" | "philosophy" | "cloud";
}

export default function BrandAnimalWatermark({ variant }: BrandAnimalWatermarkProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  const imgSrc = "/leo-may-ip.png";
  const bgSize = "300% 100%";
  const bgPositions: Record<string, string> = {
    hero: "0% 0%",
    location: "0% 0%",
    philosophy: "100% 0%",
    cloud: "50% 0%",
  };
  const bgPos = bgPositions[variant];

  if (variant === "hero") {
    return (
      <div
        className="absolute pointer-events-none overflow-hidden right-0 bottom-0 w-[38%] h-[42%] md:-right-[15%] md:-bottom-[20%] md:w-[55%] md:h-[65%]"
        style={{
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

  if (variant === "philosophy") {
    return (
      <div
        className="absolute pointer-events-none overflow-hidden animate-breathe"
        style={{
          right: "8%",
          top: "28%",
          width: 160,
          height: 160,
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
        className="absolute pointer-events-none overflow-visible"
        style={{
          top: "-6%",
          left: 0,
          right: 0,
          width: "100%",
          height: 100,
          opacity: loaded ? 1 : 0,
          zIndex: 0,
        }}
        aria-hidden
      >
        <div
          className="absolute w-[100px] h-[100px] animate-ip-walk"
          style={{
            backgroundImage: `url(${imgSrc})`,
            backgroundSize: "300% 100%",
            backgroundPosition: "50% 0%",
            backgroundRepeat: "no-repeat",
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
