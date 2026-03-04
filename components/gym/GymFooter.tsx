"use client";

import React from "react";
import { getMessages } from "@/lib/messages";
import { useLocale } from "@/components/LocaleProvider";

export default function GymFooter() {
  const locale = useLocale();
  const m = getMessages(locale).gym.footer;

  return (
    <footer
      className="bg-[#0B0B0F] text-white/70 py-12 px-4 md:px-8 text-center"
      role="contentinfo"
    >
      <p className="text-sm font-normal">{m.location}</p>
      <p className="mt-2 text-xs text-white/50">{m.copyright}</p>
    </footer>
  );
}
