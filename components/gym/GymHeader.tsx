"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { smoothstep } from "@/lib/easing";
import Logo from "@/components/Logo";
import SafeLanguageSwitch from "@/components/SafeLanguageSwitch";
import { useGymNav } from "@/components/gym/context/GymNavContext";
import { useLocale } from "@/components/LocaleProvider";
import { useMemberAuth } from "@/lib/useMemberAuth";
import { getMessages } from "@/lib/messages";

/** Header logo fades in after intro crossfade (logo→Welcome) completes at progress 0.18. */
const HEADER_LOGO_FADE_START = 0.18;
const HEADER_LOGO_FADE_END = 0.24;

interface GymHeaderProps {
  /** Scroll progress 0..1; when provided, header logo fades in after intro crossfade. */
  scrollProgress?: number;
}

export default function GymHeader({ scrollProgress }: GymHeaderProps) {
  const locale = useLocale();
  const router = useRouter();
  const { openAboutModal, openLocationModal, openPricingModal, openMembershipModal } = useGymNav();
  const { user, member, signOut } = useMemberAuth();
  const messages = getMessages(locale as "en" | "vi");
  const auth = messages.auth;
  const aboutTitle = messages.about.title;
  const gymNav = messages.gym.nav;
  const pricingTitle = messages.gym.pricingModal.title;
  const loggedIn = Boolean(user && member);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      window.location.href = `/${locale}/gym`;
    } else {
      router.push(`/${locale}/gym`);
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[50] flex items-center justify-between px-4 md:px-8 py-4 bg-white/5 backdrop-blur-md border-b border-white/10 pointer-events-auto"
      role="banner"
    >
      <Link
        href={`/${locale}`}
        className="flex items-center"
        aria-label="Leo Mây Home"
        style={{
          opacity:
            scrollProgress !== undefined
              ? smoothstep(HEADER_LOGO_FADE_START, HEADER_LOGO_FADE_END, scrollProgress)
              : 1,
        }}
      >
        <Logo className="h-10 md:h-8 w-auto object-contain brightness-0 invert" />
      </Link>
      <nav className="flex items-center gap-4 md:gap-6" aria-label="Main">
        <button
          type="button"
          onClick={openAboutModal}
          className="text-xs md:text-sm font-medium text-white/90 hover:text-white transition-colors"
        >
          {aboutTitle}
        </button>
        <button
          type="button"
          onClick={openLocationModal}
          className="text-xs md:text-sm font-medium text-white/90 hover:text-white transition-colors"
        >
          {gymNav.gym}
        </button>
        <button
          type="button"
          onClick={openPricingModal}
          className="text-xs md:text-sm font-medium text-white/90 hover:text-white transition-colors"
        >
          {pricingTitle}
        </button>
        {!loggedIn && (
          <button
            type="button"
            onClick={openMembershipModal}
            className="text-xs md:text-sm font-medium text-white/90 hover:text-white transition-colors"
          >
            {auth.membership}
          </button>
        )}
        {loggedIn ? (
          <>
            <Link
              href={`/${locale}/dashboard`}
              className="text-xs md:text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              {auth.dashboard}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs md:text-sm font-medium text-white/90 hover:text-white transition-colors"
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
