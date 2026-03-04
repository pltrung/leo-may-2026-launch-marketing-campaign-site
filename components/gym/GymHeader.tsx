"use client";

import React from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import SafeLanguageSwitch from "@/components/SafeLanguageSwitch";
import { useGymNav } from "@/components/gym/context/GymNavContext";
import { useLocale } from "@/components/LocaleProvider";
import type { GymChapter } from "@/components/gym/scroll/chapters";
import { CHAPTERS } from "@/components/gym/scroll/chapters";

const CHAPTER_ORDER: GymChapter[] = ["gym", "member", "community", "visit"];

export default function GymHeader() {
  const locale = useLocale();
  const { activeChapter, goToChapter } = useGymNav();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[50] flex items-center justify-between px-4 md:px-8 py-4 bg-white/5 backdrop-blur-md border-b border-white/10"
      role="banner"
    >
      <Link href={`/${locale}`} className="flex items-center" aria-label="Leo Mây Home">
        <Logo className="h-8 w-auto object-contain brightness-0 invert" />
      </Link>
      <nav className="flex items-center gap-4 md:gap-6" aria-label="Main">
        {CHAPTER_ORDER.map((chapter) => {
          const def = CHAPTERS[chapter];
          const label = locale === "vi" ? def.labelVi : def.labelEn;
          const isActive = activeChapter === chapter;
          return (
            <button
              key={chapter}
              type="button"
              onClick={() => goToChapter(chapter)}
              className={`text-sm font-medium transition-colors ${
                isActive ? "text-white" : "text-white/90 hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
        <SafeLanguageSwitch />
      </nav>
    </header>
  );
}
