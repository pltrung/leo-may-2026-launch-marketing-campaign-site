"use client";

import React from "react";
import { motion } from "framer-motion";
import { getMessages } from "@/lib/messages";
import { useLocale } from "@/components/LocaleProvider";
import { easeOutCubic, easeInOutQuint } from "@/lib/easing";
import type { ScrollProgressState } from "@/components/gym/scroll/useScrollProgress";

interface GymChaptersOverlayProps {
  scroll: ScrollProgressState;
  reducedMotion: boolean;
}

function opacityForChapter(p: number, inStart: number, inEnd: number, outStart: number, outEnd: number): number {
  const inVal = p <= inEnd ? (p - inStart) / (inEnd - inStart) : 1;
  const outVal = p >= outStart ? 1 - (p - outStart) / (outEnd - outStart) : 1;
  return Math.max(0, Math.min(1, inVal * outVal));
}

export default function GymChaptersOverlay({ scroll, reducedMotion }: GymChaptersOverlayProps) {
  const locale = useLocale();
  const m = getMessages(locale).gym;
  const { progress, p1, p2, p3, p4 } = scroll;

  const blur = reducedMotion ? 0 : 6;
  const translateY = reducedMotion ? 0 : 12;

  const o1 = opacityForChapter(progress, 0, 0.18, 0.22, 0.28);
  const o2 = opacityForChapter(progress, 0.22, 0.32, 0.48, 0.55);
  const o3 = opacityForChapter(progress, 0.48, 0.58, 0.78, 0.85);
  const o4 = opacityForChapter(progress, 0.78, 0.88, 1, 1);

  const style1 = {
    opacity: easeOutCubic(o1),
    transform: `translateY(${(1 - easeInOutQuint(o1)) * translateY}px)`,
    filter: blur ? `blur(${(1 - easeInOutQuint(o1)) * blur}px)` : "none",
  };
  const style2 = {
    opacity: easeOutCubic(o2),
    transform: `translateY(${(1 - easeInOutQuint(o2)) * translateY}px)`,
    filter: blur ? `blur(${(1 - easeInOutQuint(o2)) * blur}px)` : "none",
  };
  const style3 = {
    opacity: easeOutCubic(o3),
    transform: `translateY(${(1 - easeInOutQuint(o3)) * translateY}px)`,
    filter: blur ? `blur(${(1 - easeInOutQuint(o3)) * blur}px)` : "none",
  };
  const style4 = {
    opacity: easeOutCubic(o4),
    transform: `translateY(${(1 - easeInOutQuint(o4)) * translateY}px)`,
    filter: blur ? `blur(${(1 - easeInOutQuint(o4)) * blur}px)` : "none",
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center px-4 md:px-8 z-10"
      aria-hidden
    >
      <div className="max-w-2xl mx-auto text-center w-full">
        {/* Chapter 1 */}
        <div
          id="gym-chapter-gym"
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={style1}
        >
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            {m.chapter1.headline}
          </h1>
          <p className="mt-3 text-white/80 text-lg md:text-xl font-normal">
            {m.chapter1.subline}
          </p>
        </div>

        {/* Chapter 2 */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={style2}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            {m.chapter2.headline}
          </h2>
          <p className="mt-3 text-white/80 text-lg md:text-xl font-normal">
            {m.chapter2.subline}
          </p>
        </div>

        {/* Chapter 3 */}
        <div
          id="gym-chapter-membership"
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={style3}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            {m.chapter3.headline}
          </h2>
          <p className="mt-3 text-white/80 text-lg md:text-xl font-normal">
            {m.chapter3.subline}
          </p>
        </div>

        {/* Chapter 4 */}
        <div
          id="gym-chapter-community"
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={style4}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            {m.chapter4.headline}
          </h2>
          <p className="mt-3 text-white/80 text-lg md:text-xl font-normal">
            {m.chapter4.subline}
          </p>
          <div id="gym-cta" className="mt-6 flex flex-wrap gap-4 justify-center pointer-events-auto">
            <a
              href="#visit"
              className="px-6 py-3 rounded-full bg-white/20 backdrop-blur border border-white/40 text-white font-medium hover:bg-white/30 transition-colors text-sm md:text-base"
            >
              {m.chapter4.bookVisit}
            </a>
            <a
              href="#member"
              className="px-6 py-3 rounded-full bg-white text-[#0B0B0F] font-medium hover:bg-white/90 transition-colors text-sm md:text-base"
            >
              {m.chapter4.becomeMember}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
