"use client";

import React from "react";
import { easeOutCubic, easeInOutQuint } from "@/lib/easing";
import type { ScrollProgressState } from "@/components/gym/scroll/useScrollProgress";
import { CHAPTER_PROGRESS } from "@/components/gym/scroll/chapters";
import type { GymChapter } from "@/components/gym/scroll/chapters";
import AboutChapter from "@/components/gym/chapters/AboutChapter";
import GymChapterContent from "@/components/gym/chapters/GymChapter";
import CommunityChapter from "@/components/gym/chapters/CommunityChapter";
import MembershipChapter from "@/components/gym/chapters/MembershipChapter";

interface GymChaptersOverlayProps {
  scroll: ScrollProgressState;
  reducedMotion: boolean;
}

const CHAPTER_RADIUS = 0.22;
/** Below this progress, intro shows no overlay so the first view is just the GLB; scroll down to reveal "WELCOME TO LEO MÂY". */
const INTRO_TEXT_REVEAL_PROGRESS = 0.14;

function opacityForChapterCenter(progress: number, center: number): number {
  const dist = Math.abs(progress - center);
  const t = Math.min(1, dist / CHAPTER_RADIUS);
  return 1 - easeOutCubic(t);
}

export default function GymChaptersOverlay({ scroll, reducedMotion }: GymChaptersOverlayProps) {
  const { progress } = scroll;
  const blur = reducedMotion ? 0 : 6;
  const translateY = reducedMotion ? 0 : 12;

  const chapters: { id: GymChapter; opacity: number }[] = [
    { id: "intro", opacity: opacityForChapterCenter(progress, CHAPTER_PROGRESS.intro) },
    { id: "gym", opacity: opacityForChapterCenter(progress, CHAPTER_PROGRESS.gym) },
    { id: "community", opacity: opacityForChapterCenter(progress, CHAPTER_PROGRESS.community) },
    { id: "membership", opacity: opacityForChapterCenter(progress, CHAPTER_PROGRESS.membership) },
  ];

  const eased = chapters.map((ch) => ({ id: ch.id, o: easeOutCubic(ch.opacity) }));
  const maxOpacity = Math.max(...eased.map((x) => x.o));
  const activeId = eased.find((x) => x.o === maxOpacity)?.id ?? "intro";

  const chapterOrder: GymChapter[] = ["intro", "gym", "community", "membership"];
  const sortedChapters = [...chapterOrder].sort((a, b) => (a === activeId ? 1 : b === activeId ? -1 : 0));

  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center px-4 md:px-8 z-10"
      aria-hidden
    >
      <div className="relative w-full max-w-2xl mx-auto text-center h-full min-h-0">
        {sortedChapters.map((id) => {
          const ch = chapters.find((c) => c.id === id);
          if (!ch) return null;
          const { id: chapterId, opacity } = ch;
          const o = easeOutCubic(opacity);
          const style: React.CSSProperties = {
            opacity: o,
            transform: `translateY(${(1 - easeInOutQuint(o)) * translateY}px)`,
            filter: blur ? `blur(${(1 - easeInOutQuint(o)) * blur}px)` : "none",
            pointerEvents: chapterId === activeId ? "auto" : "none",
          };
          return (
            <div
              key={chapterId}
              id={chapterId === "intro" ? "gym-chapter-intro" : `gym-chapter-${chapterId}`}
              className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
              style={style}
            >
              {chapterId === "intro" && progress >= INTRO_TEXT_REVEAL_PROGRESS && <AboutChapter />}
              {chapterId === "gym" && <GymChapterContent />}
              {chapterId === "community" && <CommunityChapter />}
              {chapterId === "membership" && <MembershipChapter />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
