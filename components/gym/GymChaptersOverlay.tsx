"use client";

import React from "react";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useGymNav } from "@/components/gym/context/GymNavContext";
import { easeOutCubic, easeInOutQuint } from "@/lib/easing";
import type { ScrollProgressState } from "@/components/gym/scroll/useScrollProgress";
import { CHAPTER_PROGRESS } from "@/components/gym/scroll/chapters";
import type { GymChapter } from "@/components/gym/scroll/chapters";
import { HERO_ACCENT_COLORS } from "@/lib/heroConstants";

interface GymChaptersOverlayProps {
  scroll: ScrollProgressState;
  reducedMotion: boolean;
}

/** Tighter radius so one chapter is dominant; less blended text. */
const CHAPTER_RADIUS = 0.14;
const INTRO_TEXT_REVEAL_PROGRESS = 0.14;
const TRANSITION_MS = 400;

function opacityForChapterCenter(progress: number, center: number): number {
  const dist = Math.abs(progress - center);
  const t = Math.min(1, dist / CHAPTER_RADIUS);
  return 1 - easeOutCubic(t);
}

export default function GymChaptersOverlay({ scroll, reducedMotion }: GymChaptersOverlayProps) {
  const { progress } = scroll;
  const locale = useLocale();
  const { openAboutModal, openLocationModal, openPricingModal, openMembershipModal } = useGymNav();
  const messages = getMessages(locale as "en" | "vi");
  const blur = 0;
  const translateY = reducedMotion ? 0 : 4;

  const chapters: { id: GymChapter; opacity: number }[] = [
    { id: "intro", opacity: opacityForChapterCenter(progress, CHAPTER_PROGRESS.intro) },
    { id: "gym", opacity: opacityForChapterCenter(progress, CHAPTER_PROGRESS.gym) },
    { id: "community", opacity: opacityForChapterCenter(progress, CHAPTER_PROGRESS.community) },
    { id: "membership", opacity: opacityForChapterCenter(progress, CHAPTER_PROGRESS.membership) },
  ];

  const eased = chapters.map((ch) => ({ id: ch.id, o: easeOutCubic(ch.opacity) }));
  const maxOpacity = Math.max(...eased.map((x) => x.o));
  const activeId = eased.find((x) => x.o === maxOpacity)?.id ?? "intro";
  const isIntroGlbOnly = activeId === "intro" && progress < INTRO_TEXT_REVEAL_PROGRESS;

  const c1 = messages.gym.chapter1;
  const c2 = messages.gym.chapter2;
  const c3 = messages.gym.chapter3;
  const c4 = messages.gym.chapter4;
  const locationTitle = messages.gym.locationModal.title;
  const pricingTitle = messages.gym.pricingModal.title;

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none flex flex-col"
      style={{
        paddingTop: "calc(max(env(safe-area-inset-top), 72px) + 1rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        paddingLeft: "max(env(safe-area-inset-left), 1rem)",
        paddingRight: "max(env(safe-area-inset-right), 1rem)",
      }}
      aria-hidden
    >
      {/* On mobile: match pre-launch hero — 42vh top padding so GLB is above, then title + CTA below */}
      <div className="flex-1 flex flex-col min-h-0 w-full max-w-2xl mx-auto px-4 md:px-8 pt-[42vh] md:pt-0">
        {/* Title: on desktop above island; on mobile below GLB zone (due to pt-[42vh]) */}
        <div className="flex-shrink-0 pt-2 pb-4 md:pb-6 md:pb-8 flex flex-col items-center text-center">
          <div className="relative w-full min-h-[4.5rem] md:min-h-[5rem]">
            {chapters.map(({ id, opacity }) => {
              const o = easeOutCubic(opacity);
              const isActive = id === activeId;
              const hide = id === "intro" && progress < INTRO_TEXT_REVEAL_PROGRESS;
              const style: React.CSSProperties = {
                opacity: hide ? 0 : o,
                transform: `translateY(${(1 - easeInOutQuint(o)) * translateY}px)`,
                filter: blur && !isActive ? `blur(${(1 - easeInOutQuint(o)) * blur}px)` : "none",
                transition: reducedMotion ? "none" : `opacity ${TRANSITION_MS}ms ease-in-out, transform ${TRANSITION_MS}ms ease-in-out`,
              };
              const headline =
                id === "intro" ? c1.headline : id === "gym" ? c2.headline : id === "community" ? c3.headline : c4.headline;
              const subline =
                id === "intro" ? c1.subline : id === "gym" ? c2.subline : id === "community" ? c3.subline : c4.subline;
              const titleColor =
                id === "gym" ? HERO_ACCENT_COLORS[1] : id === "community" ? HERO_ACCENT_COLORS[2] : undefined;
              return (
                <div
                  key={id}
                  id={id === "intro" ? "gym-chapter-intro" : `gym-chapter-${id}`}
                  className="absolute inset-x-0 top-0 flex flex-col items-center justify-start text-center"
                  style={style}
                >
                  <h1
                    className="text-3xl md:text-5xl font-bold text-white tracking-tight max-w-2xl"
                    style={{
                      fontFamily: "var(--font-bold), MiSans-Bold, sans-serif",
                      color: titleColor ?? undefined,
                    }}
                  >
                    {headline}
                  </h1>
                  <p
                    className="mt-4 text-white/85 text-lg md:text-xl max-w-xl"
                    style={{ fontFamily: "MiSans-Regular, sans-serif" }}
                  >
                    {subline}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle: on desktop reserved for GLB; on mobile collapsed (title/CTA already below 42vh) */}
        <div className="flex-1 min-h-0 hidden md:block" />

        {/* CTA: below GLB; on mobile matches pre-launch (marginTop 24px, marginBottom 48px) */}
        <div className="flex-shrink-0 pt-6 pb-2 md:pb-2 flex flex-col items-center justify-end">
          {!isIntroGlbOnly && (
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 mt-6 mb-12 md:mt-8 md:mb-0">
              {activeId === "intro" && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMembershipModal();
                    }}
                    className="px-6 py-3 rounded-full bg-white font-medium text-sm md:text-base transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{ color: "#0B0B0F", fontFamily: "MiSans-Bold, sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                  >
                    {c4.becomeMember}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAboutModal();
                    }}
                    className="px-6 py-3 rounded-full border border-white/70 text-white font-medium tracking-wider uppercase text-sm md:text-base bg-transparent hover:bg-white/10 transition-colors"
                    style={{ letterSpacing: "0.08em", fontFamily: "MiSans-Regular, sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                    aria-label={messages.about.title}
                  >
                    {c4.aboutLeoMay}
                  </button>
                </>
              )}
              {activeId === "gym" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLocationModal();
                  }}
                  className="px-6 py-3 rounded-full border border-white/70 text-white font-medium tracking-wider uppercase text-sm md:text-base bg-transparent hover:bg-white/10 transition-colors"
                  style={{ letterSpacing: "0.08em", fontFamily: "MiSans-Regular, sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                >
                  {locationTitle}
                </button>
              )}
              {activeId === "community" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPricingModal();
                  }}
                  className="px-6 py-3 rounded-full border border-white/70 text-white font-medium tracking-wider uppercase text-sm md:text-base bg-transparent hover:bg-white/10 transition-colors"
                  style={{ letterSpacing: "0.08em", fontFamily: "MiSans-Regular, sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                >
                  {pricingTitle}
                </button>
              )}
              {activeId === "membership" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openMembershipModal();
                  }}
                  className="px-6 py-3 rounded-full bg-white font-medium text-sm md:text-base transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{ color: "#0B0B0F", fontFamily: "MiSans-Bold, sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
                >
                  {c4.becomeMember}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
