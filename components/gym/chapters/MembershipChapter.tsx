"use client";

import React from "react";
import Link from "next/link";
import { getMessages } from "@/lib/messages";
import { useLocale } from "@/components/LocaleProvider";
import { useGymNav } from "@/components/gym/context/GymNavContext";
import { HERO_BG } from "@/lib/heroConstants";

export default function MembershipChapter() {
  const locale = useLocale();
  const { goToChapter } = useGymNav();
  const m = getMessages(locale as "en" | "vi").gym.chapter4;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8">
      <h2
        className="text-3xl md:text-5xl font-headline font-bold text-white tracking-tight text-center"
        style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
      >
        {m.headline}
      </h2>
      <p
        className="mt-3 text-white/80 text-lg md:text-xl text-center font-body"
        style={{ fontFamily: "MiSans-Regular, sans-serif" }}
      >
        {m.subline}
      </p>
      <div id="gym-cta" className="mt-8 flex flex-wrap gap-4 justify-center pointer-events-auto">
        <Link
          href={`/${locale}/gym/membership`}
          className="px-6 py-3 rounded-full bg-white font-medium text-sm md:text-base transition-colors hover:bg-white/90"
          style={{ color: HERO_BG, fontFamily: "MiSans-Bold, sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
        >
          {m.becomeMember}
        </Link>
        <button
          type="button"
          onClick={() => goToChapter("intro")}
          className="px-6 py-3 rounded-full border border-white/70 text-white font-medium tracking-wider uppercase text-sm md:text-base bg-transparent hover:bg-white/10 transition-colors"
          style={{ letterSpacing: "0.08em", fontFamily: "MiSans-Regular, sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
        >
          {m.aboutLeoMay}
        </button>
      </div>
    </div>
  );
}
