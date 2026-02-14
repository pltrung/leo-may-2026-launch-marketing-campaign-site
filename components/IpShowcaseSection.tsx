"use client";

import { useState } from "react";

interface IpShowcaseSectionProps {
  pose: "front" | "back";
}

export default function IpShowcaseSection({ pose }: IpShowcaseSectionProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  const imgSrc = "/leo-may-ip.png";
  const bgPos = pose === "front" ? "0% 0%" : "100% 0%";

  return (
    <section className="relative min-h-screen h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden
      >
        <div
          className="w-[70%] max-w-[400px] aspect-square bg-no-repeat bg-contain bg-center"
          style={{
            backgroundImage: `url(${imgSrc})`,
            backgroundSize: "300% 100%",
            backgroundPosition: bgPos,
            opacity: loaded ? 1 : 0,
          }}
        />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt=""
        className="hidden"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </section>
  );
}
