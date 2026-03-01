"use client";

import { useEffect, useState } from "react";

const TRANSITION_MS = 450;

/**
 * Layer 1: Time-based sky background. Fixed, full viewport, behind all content.
 * Night = dark (current default). Morning = blue + clouds + particles + sun glow. Sunset = warm gradient + haze.
 */
export default function GlobalSkyLayer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="global-sky-layer"
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        transition: `opacity ${TRANSITION_MS}ms ease-out`,
      }}
    >
      {/* Night: dark sky (stars rendered by HeroStarfield in hero/countdown when time-night) */}
      <div className="global-sky-night" />
      {/* Morning: mid-tone blue + cloud drift + particles + sun glow */}
      <div className="global-sky-morning">
        <div className="sky-morning-clouds" aria-hidden />
        <div className="sky-morning-particles" aria-hidden />
      </div>
      {/* Sunset: warm gradient + subtle haze */}
      <div className="global-sky-sunset" />
    </div>
  );
}
