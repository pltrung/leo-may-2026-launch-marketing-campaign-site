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

const CHAPTER_RADIUS = 0.22;
const INTRO_TEXT_REVEAL_PROGRESS = 0.14;
const TRANSITION_MS = 550;

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
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 88px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
      aria-hidden
    >
      <div className="h-[100svh] w-full grid grid-rows-[auto,1fr,auto] px-6 md:px-10 min-h-0">
        {/* Row 1: TopZone — title + subtitle (always above the model) */}
        <div className="pointer-events-none flex flex-col items-center md:items-start justify-end min-h-[140px] md:min-h-[180px] shrink-0">
          <div className="relative w-full max-w-2xl mx-auto md:mx-0 h-full min-h-[120px] text-center md:text-left">
            {chapters.map(({ id, opacity }) => {
              const o = easeOutCubic(opacity);
              const isActive = id === activeId;
              const hide = id === "intro" && progress < INTRO_TEXT_REVEAL_PROGRESS;
              const style: React.CSSProperties = {
                opacity: hide ? 0 : o,
                transform: `translateY(${(1 - easeInOutQuint(o)) * translateY}px)`,
                filter: blur && !isActive ? `blur(${(1 - easeInOutQuint(o)) * blur}px)` : "none",
                transition: reducedMotion ? "none" : `opacity ${TRANSITION_MS}ms ease-in-out, transform ${TRANSITION_MS}ms ease-in-out, filter ${TRANSITION_MS}ms ease-in-out`,
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
                  className="absolute inset-0 flex flex-col items-center md:items-start justify-end text-center md:text-left"
                  style={style}
                >
                  <h1
                    className="text-[32px] leading-tight md:text-[56px] lg:text-[64px] xl:text-[72px] font-bold tracking-tight max-w-xl md:max-w-2xl"
                    style={{
                      fontFamily: "var(--font-bold), MiSans-Bold, sans-serif",
                      lineHeight: 1.15,
                      color: titleColor ?? "white",
                    }}
                  >
                    {headline}
                  </h1>
                  <p
                    className="mt-3 md:mt-4 text-white/85 text-base md:text-lg lg:text-xl max-w-lg md:max-w-xl"
                    style={{ fontFamily: "MiSans-Regular, sans-serif", lineHeight: 1.5 }}
                  >
                    {subline}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 2: MiddleZone — reserved for GLB only (optional halo) */}
        <div className="relative min-h-0 flex items-center justify-center pointer-events-none">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)",
            }}
            aria-hidden
          />
        </div>

        {/* Row 3: BottomZone — CTA dock (pointer-events only on buttons) */}
        <div className="pointer-events-none flex flex-col items-center justify-end pt-4 shrink-0">
          {!isIntroGlbOnly && (
            <div
              className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 py-3 px-4 rounded-2xl min-w-0"
              style={{
                background: "rgba(0,0,0,0.25)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
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
