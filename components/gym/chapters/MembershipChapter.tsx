"use client";

import React from "react";
import { getMessages } from "@/lib/messages";
import { useLocale } from "@/components/LocaleProvider";
import { useGymNav } from "@/components/gym/context/GymNavContext";

export default function MembershipChapter() {
  const locale = useLocale();
  const { openMembershipModal } = useGymNav();
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
      <div id="gym-cta" className="mt-8 flex justify-center pointer-events-auto">
        <button
          type="button"
          onClick={openMembershipModal}
          className="px-6 py-3 rounded-full bg-white font-medium text-sm md:text-base transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ color: "#0B0B0F", fontFamily: "MiSans-Bold, sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
        >
          {m.becomeMember}
        </button>
      </div>
    </div>
  );
}
