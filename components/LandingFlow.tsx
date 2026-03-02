"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { getMessages } from "@/lib/messages";
import SafeImg, { isValidImgSrc } from "@/components/SafeImg";
import PortalTransition, { type PortalState } from "@/components/PortalTransition";
import type { ExploreOrigin } from "@/components/ExploreButton";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";
import { startHeroMusicFromUserGesture } from "@/components/HeroMusic";

const LOGO_SRC = "/logo-white.svg";
const CLOUD_SRC = "/brand/cloud-copyright.svg";
const LOADING_SKY_MS = 2000;

/**
 * State machine: loadingSky -> exploreIdle -> (click) transitioning -> hero.
 * Only active on home path (/, /en, /vi).
 */
export default function LandingFlow({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<PortalState>("loadingSky");
  const [exploreOrigin, setExploreOrigin] = useState<ExploreOrigin | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const completedRef = useRef(false);

  const isHome = Boolean(
    pathname && (pathname === "/" || pathname === "/en" || pathname === "/vi")
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const on = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // loadingSky: run 2s then go to exploreIdle
  useEffect(() => {
    if (!isHome || state !== "loadingSky") return;
    const t = setTimeout(() => setState("exploreIdle"), LOADING_SKY_MS);
    return () => clearTimeout(t);
  }, [isHome, state]);

  const handleExplore = useCallback((origin?: ExploreOrigin) => {
    if (state !== "exploreIdle") return;
    startHeroMusicFromUserGesture();
    document.body.classList.add("loaded");
    setExploreOrigin(origin ?? null);
    setState("transitioning");
  }, [state]);

  const handleTransitionComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (typeof document !== "undefined") {
      document.body.classList.add("hero-ready");
      document.body.classList.add("hero-page-visible");
    }
    setState("hero");
  }, []);

  if (!isHome) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Portal overlay: Sky + mask + Explore pill. Hidden when state === "hero". */}
      <ClientErrorBoundary
        fallback={() => {
          if (typeof document !== "undefined") {
            document.body.classList.add("loaded", "hero-ready");
          }
          return null;
        }}
      >
      <PortalTransition
        state={state}
        onExplore={handleExplore}
        onTransitionComplete={handleTransitionComplete}
        reduceMotion={reduceMotion}
        exploreLabel={getMessages((pathname?.startsWith("/vi") ? "vi" : "en") as "en" | "vi").explore}
        exploreOrigin={exploreOrigin}
      />
      </ClientErrorBoundary>

      {/* Loading sky content (logo, cloud, text) — only during loadingSky */}
      {state === "loadingSky" && (
        <div
          id="loading-screen"
          className="loading-screen loading-screen-portal"
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="loading-inner">
            {isValidImgSrc(LOGO_SRC) ? (
              <SafeImg src={LOGO_SRC} className="loading-logo" alt="" />
            ) : null}
            <div className="loading-cloud">
              {isValidImgSrc(CLOUD_SRC) ? (
                <SafeImg src={CLOUD_SRC} alt="" />
              ) : null}
            </div>
            <div className="loading-text">
              {getMessages((pathname?.startsWith("/vi") ? "vi" : "en") as "en" | "vi")?.loading?.preparingTheSky ?? "Preparing the sky"}
            </div>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
