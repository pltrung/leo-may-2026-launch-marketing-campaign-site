"use client";

import React, { useMemo } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useGymNav } from "@/components/gym/context/GymNavContext";
import { smoothstep } from "@/lib/easing";
import type { ScrollProgressState } from "@/components/gym/scroll/useScrollProgress";
import type { GymChapter } from "@/components/gym/scroll/chapters";
import { HERO_ACCENT_COLORS } from "@/lib/heroConstants";

interface GymChaptersOverlayProps {
  scroll: ScrollProgressState;
  reducedMotion: boolean;
}

/** Pre-launch style: sequential "fade out old → hold → fade in new" with smoothstep + translateY. */
const FADE_Y_PX = 20;
const INTRO_TEXT_REVEAL_PROGRESS = 0.14;

/** Per-chapter progress windows: [fadeInStart, fadeInEnd, holdEnd, fadeOutStart, fadeOutEnd]. Intro aligns with CTA fade-in. */
const CHAPTER_WINDOWS: Record<GymChapter, [number, number, number, number, number]> = {
  intro: [0.14, 0.22, 0.30, 0.30, 0.40],
  gym: [0.34, 0.42, 0.54, 0.54, 0.64],
  community: [0.58, 0.66, 0.78, 0.78, 0.86],
  membership: [0.82, 0.90, 1, 1, 1],
};

function chapterOpacityAndTranslateY(
  p: number,
  chapter: GymChapter
): { opacity: number; translateY: number } {
  const [fadeInStart, fadeInEnd, holdEnd, fadeOutStart, fadeOutEnd] = CHAPTER_WINDOWS[chapter];
  let opacity: number;
  let translateY: number;
  if (p <= fadeInStart) {
    opacity = 0;
    translateY = FADE_Y_PX;
  } else if (p < fadeInEnd) {
    const t = smoothstep(fadeInStart, fadeInEnd, p);
    opacity = t;
    translateY = FADE_Y_PX * (1 - t);
  } else if (p <= fadeOutStart) {
    opacity = 1;
    translateY = 0;
  } else if (p < fadeOutEnd) {
    const t = smoothstep(fadeOutStart, fadeOutEnd, p);
    opacity = 1 - t;
    translateY = -FADE_Y_PX * t;
  } else {
    opacity = 0;
    translateY = -FADE_Y_PX;
  }
  if (chapter === "intro" && p < INTRO_TEXT_REVEAL_PROGRESS) {
    opacity = 0;
    translateY = FADE_Y_PX;
  }
  return { opacity, translateY };
}

const CHAPTER_ORDER: GymChapter[] = ["intro", "gym", "community", "membership"];

export default function GymChaptersOverlay({ scroll, reducedMotion }: GymChaptersOverlayProps) {
  const { progress } = scroll;
  const locale = useLocale();
  const { openAboutModal, openLocationModal, openPricingModal, openMembershipModal } = useGymNav();
  const messages = getMessages(locale as "en" | "vi");

  const chapterStates = useMemo(() => {
    return CHAPTER_ORDER.map((id) => ({
      id,
      ...chapterOpacityAndTranslateY(progress, id),
    }));
  }, [progress]);

  const activeId = useMemo(() => {
    const best = chapterStates.reduce((a, b) => (a.opacity >= b.opacity ? a : b));
    return best.opacity > 0.01 ? best.id : "intro";
  }, [chapterStates]);

  const isIntroGlbOnly = activeId === "intro" && progress < INTRO_TEXT_REVEAL_PROGRESS;
  /** Hide overlay only at scroll max (1) so "Trở thành thành viên" stays visible until end of gym section. */
  const hideOverlayNearFooter = progress >= 1;
  /** CTA block fades in with smoothstep when leaving intro (pre-launch feel). */
  const ctaBlockOpacity = reducedMotion ? 1 : smoothstep(INTRO_TEXT_REVEAL_PROGRESS, 0.22, progress);

  const c1 = messages.gym.chapter1;
  const c2 = messages.gym.chapter2;
  const c3 = messages.gym.chapter3;
  const c4 = messages.gym.chapter4;
  const locationTitle = messages.gym.locationModal.title;
  const pricingTitle = messages.gym.pricingModal.title;

  if (hideOverlayNearFooter) return null;

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
            {chapterStates.map(({ id, opacity, translateY }) => {
              const style: React.CSSProperties = {
                opacity,
                transform: `translateY(${translateY}px)`,
                transition: reducedMotion ? "none" : undefined,
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
                  aria-hidden={opacity < 0.01}
                >
                  <h1
                    className="font-bold text-white tracking-tight leading-[1.2] max-w-2xl w-full"
                    style={{
                      fontFamily: "var(--font-bold), MiSans-Bold, sans-serif",
                      color: titleColor ?? undefined,
                      fontSize: "clamp(28px, 5vw, 48px)",
                    }}
                  >
                    <span className="block">{headline}</span>
                  </h1>
                  <p
                    className="mt-2 md:mt-3 text-white/85 max-w-xl w-full"
                    style={{
                      fontFamily: "MiSans-Regular, sans-serif",
                      fontSize: "clamp(14px, 2.5vw, 20px)",
                      lineHeight: 1.25,
                    }}
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

        {/* CTA: below GLB; fades in with smoothstep when intro text reveals (pre-launch feel) */}
        <div
          className="flex-shrink-0 pt-8 pb-2 md:pt-10 md:pb-2 flex flex-col items-center justify-end"
          style={{ opacity: ctaBlockOpacity }}
        >
          {!isIntroGlbOnly && (
            <div
              className={`pointer-events-auto flex flex-wrap items-center justify-center gap-3 mb-12 md:mb-0 ${activeId === "membership" ? "mt-8 md:mt-10" : "mt-6 md:mt-8"}`}
            >
              {activeId === "intro" && (
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
