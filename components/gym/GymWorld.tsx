"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import GymHeader from "@/components/gym/GymHeader";
import GymScrollScene from "@/components/gym/GymScrollScene";
import GymFooter from "@/components/gym/GymFooter";
import GymTransitionOverlay from "@/components/gym/transitions/GymTransitionOverlay";
import type { GymTransitionOverlayRef } from "@/components/gym/transitions/GymTransitionOverlay";
import { GymNavProvider } from "@/components/gym/context/GymNavContext";
import { getSkyTheme, getLocalTimeHours } from "@/components/gym/theme/skyTheme";
import { preloadGymIslandGLB } from "@/components/gym/three/IslandScene";
import { HERO_BG } from "@/lib/heroConstants";
import type { SkyTheme } from "@/components/gym/theme/skyTheme";
import type { GymChapter } from "@/components/gym/scroll/chapters";
import {
  CHAPTERS,
  GYM_STORY_VH,
  getChapterFromHash,
  getChapterHash,
  CHAPTER_PROGRESS,
} from "@/components/gym/scroll/chapters";
import { seekToProgress } from "@/components/gym/scroll/useScrollProgress";
import GymVisitModal from "@/components/gym/modals/GymVisitModal";
import GymMembershipModal from "@/components/gym/modals/GymMembershipModal";
import AboutUsModal from "@/components/AboutUsModal";
import { useLocale } from "@/components/LocaleProvider";

export default function GymWorld() {
  const locale = useLocale();
  const [theme, setTheme] = useState<SkyTheme>(() =>
    getSkyTheme(typeof window !== "undefined" ? getLocalTimeHours() : 12)
  );
  const [activeChapter, setActiveChapter] = useState<GymChapter>("intro");
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
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
  const openMembershipModal = useCallback(() => setMembershipModalOpen(true), []);
  const openAboutModal = useCallback(() => setAboutModalOpen(true), []);

  const navValue = {
    activeChapter,
    goToChapter,
    openVisitModal,
    openMembershipModal,
    openAboutModal,
  };

  return (
    <GymNavProvider value={navValue}>
      <div className="min-h-screen" style={{ background: HERO_BG }}>
        <GymHeader />
        <main className="relative">
          <GymScrollScene theme={theme} activeChapter={activeChapter} />
          <GymFooter />
        </main>
        <GymTransitionOverlay overlayRef={overlayRef} />
        <GymVisitModal open={visitModalOpen} onClose={() => setVisitModalOpen(false)} />
        <GymMembershipModal open={membershipModalOpen} onClose={() => setMembershipModalOpen(false)} />
        {aboutModalOpen && <AboutUsModal onClose={() => setAboutModalOpen(false)} locale={locale as "en" | "vi"} />}
      </div>
    </GymNavProvider>
  );
}
