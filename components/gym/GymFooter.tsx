"use client";

import React from "react";
import { getMessages } from "@/lib/messages";
import { useLocale } from "@/components/LocaleProvider";
import { HERO_BG } from "@/lib/heroConstants";

export default function GymFooter() {
  const locale = useLocale();
  const m = getMessages(locale).gym.footer;

  return (
    <footer
      className="relative pt-24 pb-12 md:pt-20 md:pb-12 px-4 md:px-8 text-center text-white/70"
      style={{
        background: HERO_BG,
        fontFamily: "MiSans-Regular, sans-serif",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
      }}
      role="contentinfo"
    >
      <p className="text-sm tracking-wide">{m.location}</p>
      <p className="mt-2 text-xs text-white/50 tracking-wide">{m.copyright}</p>
    </footer>
  );
}
