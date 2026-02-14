"use client";

import { useState, useEffect } from "react";

interface WalkingIpWithPuffProps {
  puffKey: number;
}

export default function WalkingIpWithPuff({ puffKey }: WalkingIpWithPuffProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [showPuff, setShowPuff] = useState(false);

  const imgSrc = "/leo-may-ip.png";

  useEffect(() => {
    if (puffKey > 0) {
      setShowPuff(true);
      const t = setTimeout(() => setShowPuff(false), 2500);
      return () => clearTimeout(t);
    }
  }, [puffKey]);

  if (errored) return null;

  return (
    <div className="relative w-full h-[100px] overflow-hidden">
      {/* Fart puff - behind IP, subtle scale + fade */}
      {showPuff && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-10 pointer-events-none animate-fart-puff"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/cloud.svg"
            alt=""
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Walking IP - bounded to text container width */}
      <div className="absolute inset-0 w-full animate-ip-walk flex justify-end items-center">
        <div
          className="w-[90px] h-[90px] flex-shrink-0"
          style={{
            backgroundImage: `url(${imgSrc})`,
            backgroundSize: "300% 100%",
            backgroundPosition: "50% 0%",
            backgroundRepeat: "no-repeat",
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
    </div>
  );
}
