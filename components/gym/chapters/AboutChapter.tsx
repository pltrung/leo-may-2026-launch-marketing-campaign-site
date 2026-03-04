"use client";

import React from "react";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useGymNav } from "@/components/gym/context/GymNavContext";
/**
 * Intro chapter: short headline + "About Us" CTA that opens the philosophy modal.
 * Full philosophy text lives in AboutUsModal so it doesn't bleed across the page.
 */
export default function AboutChapter() {
  const locale = useLocale();
  const { openAboutModal } = useGymNav();
  const m = getMessages(locale as "en" | "vi").gym.chapter1;
  const aboutTitle = getMessages(locale as "en" | "vi").about.title;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8 overflow-hidden">
      <div className="max-w-2xl mx-auto text-center">
        <h1
          className="text-3xl md:text-5xl font-bold text-white tracking-tight"
          style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
        >
          {m.headline}
        </h1>
        <p
          className="mt-4 text-white/85 text-lg md:text-xl"
          style={{ fontFamily: "MiSans-Regular, sans-serif" }}
        >
          {m.subline}
        </p>
        <button
          type="button"
          onClick={openAboutModal}
          className="mt-8 px-6 py-3 rounded-full border border-white/70 text-white font-medium tracking-wider uppercase text-sm md:text-base bg-transparent hover:bg-white/10 transition-colors pointer-events-auto"
          style={{ letterSpacing: "0.08em", fontFamily: "MiSans-Regular, sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
        >
          {aboutTitle}
        </button>
      </div>
    </div>
  );
}
