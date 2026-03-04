"use client";

import React from "react";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { HERO_ACCENT_COLORS } from "@/lib/heroConstants";

export default function GymChapter() {
  const locale = useLocale();
  const m = getMessages(locale as "en" | "vi").gym.chapter2;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8">
      <h2
        className="text-3xl md:text-5xl font-headline font-bold tracking-tight text-center"
        style={{ color: HERO_ACCENT_COLORS[1], fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
      >
        {m.headline}
      </h2>
      <p
        className="mt-4 text-white/80 text-lg md:text-xl text-center max-w-xl"
        style={{ fontFamily: "MiSans-Regular, sans-serif" }}
      >
        {m.subline}
      </p>
    </div>
  );
}
