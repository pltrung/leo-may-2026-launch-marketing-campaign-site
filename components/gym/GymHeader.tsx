"use client";

import React from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import SafeLanguageSwitch from "@/components/SafeLanguageSwitch";
import { getMessages } from "@/lib/messages";
import { useLocale } from "@/components/LocaleProvider";

const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth" });
};

export default function GymHeader() {
  const locale = useLocale();
  const m = getMessages(locale).gym;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 bg-white/5 backdrop-blur-md border-b border-white/10"
      role="banner"
    >
      <Link href={`/${locale}`} className="flex items-center" aria-label="Leo Mây Home">
        <Logo className="h-8 w-auto object-contain brightness-0 invert" />
      </Link>
      <nav className="flex items-center gap-4 md:gap-6" aria-label="Main">
        <button
          type="button"
          onClick={() => scrollToId("gym-chapter-gym")}
          className="text-white/90 text-sm font-medium hover:text-white transition-colors"
        >
          {m.nav.gym}
        </button>
        <button
          type="button"
          onClick={() => scrollToId("gym-chapter-membership")}
          className="text-white/90 text-sm font-medium hover:text-white transition-colors"
        >
          {m.nav.membership}
        </button>
        <button
          type="button"
          onClick={() => scrollToId("gym-chapter-community")}
          className="text-white/90 text-sm font-medium hover:text-white transition-colors"
        >
          {m.nav.community}
        </button>
        <button
          type="button"
          onClick={() => scrollToId("gym-cta")}
          className="text-white/90 text-sm font-medium hover:text-white transition-colors"
        >
          {m.nav.visit}
        </button>
        <SafeLanguageSwitch />
      </nav>
    </header>
  );
}
