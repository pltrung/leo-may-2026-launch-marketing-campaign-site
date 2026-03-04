"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import SafeLanguageSwitch from "@/components/SafeLanguageSwitch";
import { useGymNav } from "@/components/gym/context/GymNavContext";
import { useLocale } from "@/components/LocaleProvider";
import { useMemberAuth } from "@/lib/useMemberAuth";
import { getMessages } from "@/lib/messages";
import type { GymChapter } from "@/components/gym/scroll/chapters";
import { CHAPTERS } from "@/components/gym/scroll/chapters";

const HEADER_NAV: ({ type: "chapter"; chapter: GymChapter } | { type: "link"; href: string; labelKey: "membership" })[] = [
  { type: "chapter", chapter: "intro" },
  { type: "chapter", chapter: "community" },
  { type: "link", href: "/gym/membership", labelKey: "membership" },
];

export default function GymHeader() {
  const locale = useLocale();
  const router = useRouter();
  const { activeChapter, goToChapter } = useGymNav();
  const { user, member, signOut } = useMemberAuth();
  const auth = getMessages(locale as "en" | "vi").auth;
  const loggedIn = Boolean(user && member);

  const handleLogout = async () => {
    await signOut();
    router.push(`/${locale}/gym`);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[50] flex items-center justify-between px-4 md:px-8 py-4 bg-white/5 backdrop-blur-md border-b border-white/10"
      role="banner"
    >
      <Link href={`/${locale}`} className="flex items-center" aria-label="Leo Mây Home">
        <Logo className="h-8 w-auto object-contain brightness-0 invert" />
      </Link>
      <nav className="flex items-center gap-4 md:gap-6" aria-label="Main">
        {HEADER_NAV.map((item) => {
          if (item.type === "chapter") {
            const def = CHAPTERS[item.chapter];
            const label = item.chapter === "intro" ? (locale === "vi" ? "Phòng Leo" : "Gym") : (locale === "vi" ? def.labelVi : def.labelEn);
            const isActive = activeChapter === item.chapter;
            return (
              <button
                key={item.chapter}
                type="button"
                onClick={() => goToChapter(item.chapter)}
                className={`text-sm font-medium transition-colors ${
                  isActive ? "text-white" : "text-white/90 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          }
          return (
            <Link
              key={item.href}
              href={`/${locale}${item.href}`}
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              {auth.membership}
            </Link>
          );
        })}
        {loggedIn ? (
          <>
            <Link
              href={`/${locale}/dashboard`}
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              {auth.dashboard}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              {auth.logout}
            </button>
          </>
        ) : null}
        <SafeLanguageSwitch />
      </nav>
    </header>
  );
}
