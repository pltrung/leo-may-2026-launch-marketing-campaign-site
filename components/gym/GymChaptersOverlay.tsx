"use client";

import React from "react";
import { easeOutCubic, easeInOutQuint } from "@/lib/easing";
import type { ScrollProgressState } from "@/components/gym/scroll/useScrollProgress";
import { CHAPTER_PROGRESS } from "@/components/gym/scroll/chapters";
import type { GymChapter } from "@/components/gym/scroll/chapters";
import AboutChapter from "@/components/gym/chapters/AboutChapter";
import GymChapter from "@/components/gym/chapters/GymChapter";
import CommunityChapter from "@/components/gym/chapters/CommunityChapter";
import MembershipChapter from "@/components/gym/chapters/MembershipChapter";

interface GymChaptersOverlayProps {
  scroll: ScrollProgressState;
  reducedMotion: boolean;
}

const CHAPTER_RADIUS = 0.22;

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

  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center px-4 md:px-8 z-10"
      aria-hidden
    >
      <div className="relative w-full max-w-2xl mx-auto text-center h-full min-h-0">
        {chapters.map(({ id, opacity }) => {
          const o = easeOutCubic(opacity);
          const style = {
            opacity: o,
            transform: `translateY(${(1 - easeInOutQuint(o)) * translateY}px)`,
            filter: blur ? `blur(${(1 - easeInOutQuint(o)) * blur}px)` : "none",
            pointerEvents: o > 0.5 ? "auto" : ("none" as const),
          };
          return (
            <div
              key={id}
              id={id === "intro" ? "gym-chapter-intro" : `gym-chapter-${id}`}
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={style}
            >
              {id === "intro" && <AboutChapter />}
              {id === "gym" && <GymChapter />}
              {id === "community" && <CommunityChapter />}
              {id === "membership" && <MembershipChapter />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
