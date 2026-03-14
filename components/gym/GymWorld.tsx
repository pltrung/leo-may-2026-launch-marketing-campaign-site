"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import GymHeader from "@/components/gym/GymHeader";

const HeroStarfield = dynamic(
  () => import("@/components/HeroStarfield").catch(() => ({ default: () => null })),
  { ssr: false }
);
import GymScrollScene from "@/components/gym/GymScrollScene";
import GymFooter from "@/components/gym/GymFooter";
import GymTransitionOverlay from "@/components/gym/transitions/GymTransitionOverlay";
import type { GymTransitionOverlayRef } from "@/components/gym/transitions/GymTransitionOverlay";
import { GymNavProvider } from "@/components/gym/context/GymNavContext";
import { getSkyTheme, getLocalTimeHours } from "@/components/gym/theme/skyTheme";
import { preloadGymIslandGLB } from "@/components/gym/three/IslandScene";
import type { SkyTheme } from "@/components/gym/theme/skyTheme";
import type { GymChapter } from "@/components/gym/scroll/chapters";
import {
  CHAPTERS,
  GYM_STORY_VH,
  getChapterFromHash,
  getChapterHash,
  CHAPTER_PROGRESS,
} from "@/components/gym/scroll/chapters";
import { seekToProgress, useScrollProgress } from "@/components/gym/scroll/useScrollProgress";
import GymVisitModal from "@/components/gym/modals/GymVisitModal";
import MembershipEntrySheet from "@/components/gym/modals/MembershipEntrySheet";
import LocationSheet from "@/components/gym/modals/LocationSheet";
import PricingSheet from "@/components/gym/modals/PricingSheet";
import AboutUsModal from "@/components/AboutUsModal";
import { useLocale } from "@/components/LocaleProvider";

export default function GymWorld() {
  const locale = useLocale();
  const scroll = useScrollProgress(GYM_STORY_VH);
  const [theme, setTheme] = useState<SkyTheme>(() =>
    getSkyTheme(typeof window !== "undefined" ? getLocalTimeHours() : 12)
  );
  const [activeChapter, setActiveChapter] = useState<GymChapter>("intro");
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [membershipEntryOpen, setMembershipEntryOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const overlayRef = useRef<GymTransitionOverlayRef | null>(null);
  const initialHashHandled = useRef(false);

  useEffect(() => {
    preloadGymIslandGLB();
  }, []);

  useEffect(() => {
    const update = () => setTheme(getSkyTheme(getLocalTimeHours()));
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  const goToChapter = useCallback(
    async (chapter: GymChapter, opts?: { immediate?: boolean }) => {
      const def = CHAPTERS[chapter];
      const hash = getChapterHash(chapter);

      if (typeof window === "undefined") return;

      window.history.replaceState(null, "", window.location.pathname + window.location.search + hash);

      if (opts?.immediate) {
        setActiveChapter(chapter);
        seekToProgress(def.progress, GYM_STORY_VH);
        return;
      }

      const overlay = overlayRef.current;
      if (overlay?.startTransition) {
        await overlay.startTransition();
      }
      setActiveChapter(chapter);
      seekToProgress(def.progress, GYM_STORY_VH);
    },
    []
  );

  useEffect(() => {
    if (initialHashHandled.current || typeof window === "undefined") return;
    initialHashHandled.current = true;
    const hash = window.location.hash;
    const chapter = getChapterFromHash(hash);
    if (chapter) {
      goToChapter(chapter, { immediate: true });
    } else {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search + "#intro"
      );
      setActiveChapter("intro");
      seekToProgress(CHAPTERS.intro.progress, GYM_STORY_VH);
    }
  }, [goToChapter]);

  useEffect(() => {
    const onHashChange = () => {
      const chapter = getChapterFromHash(window.location.hash);
      if (chapter) goToChapter(chapter);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [goToChapter]);

  useEffect(() => {
    const syncChapterFromScroll = () => {
      const vh = window.innerHeight * (GYM_STORY_VH / 100);
      const maxScroll = Math.max(0, vh - window.innerHeight);
      const p = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      const chapterOrder: GymChapter[] = ["intro", "gym", "community", "membership"];
      let best: GymChapter = "intro";
      let bestDist = 1;
      for (const ch of chapterOrder) {
        const d = Math.abs(p - CHAPTER_PROGRESS[ch]);
        if (d < bestDist) {
          bestDist = d;
          best = ch;
        }
      }
      setActiveChapter((prev) => (bestDist < 0.2 ? best : prev));
    };
    window.addEventListener("scroll", syncChapterFromScroll, { passive: true });
    return () => window.removeEventListener("scroll", syncChapterFromScroll);
  }, []);

  const openVisitModal = useCallback(() => setVisitModalOpen(true), []);
  const openMembershipModal = useCallback(() => setMembershipEntryOpen(true), []);
  const openAboutModal = useCallback(() => setAboutModalOpen(true), []);
  const openLocationModal = useCallback(() => setLocationModalOpen(true), []);
  const openPricingModal = useCallback(() => setPricingModalOpen(true), []);

  const navValue = {
    activeChapter,
    goToChapter,
    openVisitModal,
    openMembershipModal,
    openAboutModal,
    openLocationModal,
    openPricingModal,
  };

  return (
    <GymNavProvider value={navValue}>
      <div className="min-h-screen relative">
        {/* 1) Sky gradient — bottom layer (time-of-day) */}
        <div className="fixed inset-0 pointer-events-none" style={{ background: theme.bgGradient, zIndex: 1 }} aria-hidden />
        {/* 2) Starfield (twinkle, drift, shooting stars) */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 2, width: "100%", height: "100%", minWidth: "100vw", minHeight: "100dvh" }}
          aria-hidden
        >
          <HeroStarfield heroTransitioning={false} />
        </div>
        <div className="relative" style={{ zIndex: 10 }}>
          <GymHeader scrollProgress={scroll.progress} />
        <main className="relative">
          <GymScrollScene theme={theme} activeChapter={activeChapter} storyVh={GYM_STORY_VH} scroll={scroll} />
          <GymFooter />
        </main>
        <GymTransitionOverlay overlayRef={overlayRef} />
        <GymVisitModal open={visitModalOpen} onClose={() => setVisitModalOpen(false)} />
        <MembershipEntrySheet open={membershipEntryOpen} onClose={() => setMembershipEntryOpen(false)} />
        <LocationSheet open={locationModalOpen} onClose={() => setLocationModalOpen(false)} />
        <PricingSheet open={pricingModalOpen} onClose={() => setPricingModalOpen(false)} />
        {aboutModalOpen && <AboutUsModal onClose={() => setAboutModalOpen(false)} locale={locale as "en" | "vi"} />}
        </div>
      </div>
    </GymNavProvider>
  );
}
