"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { getMessages } from "@/lib/messages";
import SafeImg, { isValidImgSrc } from "@/components/SafeImg";
import PortalTransition, { type PortalState } from "@/components/PortalTransition";
import type { ExploreOrigin } from "@/components/ExploreButton";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";
import { startHeroMusicFromUserGesture } from "@/components/HeroMusic";
import { HERO_BG } from "@/lib/heroConstants";
import { isLandingFlowPath } from "@/lib/landingPaths";

const HeroStarfield = dynamic(
  () => import("@/components/HeroStarfield").then((m) => m.default),
  { ssr: false }
);

const LOGO_SRC = "/logo-white.svg";
const CLOUD_SRC = "/brand/cloud-copyright.svg";
const LOADING_SKY_MS = 2000;

/**
 * State machine: loadingSky -> exploreIdle -> (click) transitioning -> hero.
 * Only active on prelaunch landing paths (see `isLandingFlowPath`).
 */
export default function LandingFlow({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<PortalState>("loadingSky");
  const [exploreOrigin, setExploreOrigin] = useState<ExploreOrigin | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const completedRef = useRef(false);

  const isHome = isLandingFlowPath(pathname);

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

  // As soon as Explore page is shown, preload climbing-hold GLB (chunk + drei cache) so it’s ready when user taps Explore — reduces perceived load on hero.
  useEffect(() => {
    if (!isHome || state !== "exploreIdle") return;
    import("@/components/HeroClimbingHoldCanvas").then((m) => {
      if (m.preloadHeroClimbingHoldGLB) m.preloadHeroClimbingHoldGLB();
    });
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
      {/* One continuous star world: fixed layer for entire flow so no second background mounts after Explore. */}
      {isHome && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            background: HERO_BG,
            pointerEvents: "none",
          }}
        >
          <HeroStarfield heroTransitioning={state === "transitioning"} />
        </div>
      )}
      {/* Portal overlay: mask + clouds + Explore pill. Sky area is transparent so we see the starfield above. */}
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
