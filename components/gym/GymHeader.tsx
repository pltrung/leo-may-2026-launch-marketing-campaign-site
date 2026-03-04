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

export default function GymHeader() {
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
    await signOut();
    router.push(`/${locale}/gym`);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[50] flex items-center justify-between px-4 md:px-8 py-4 bg-white/5 backdrop-blur-md border-b border-white/10 pointer-events-auto"
      role="banner"
    >
      <Link href={`/${locale}`} className="flex items-center" aria-label="Leo Mây Home">
        <Logo className="h-8 w-auto object-contain brightness-0 invert" />
      </Link>
      <nav className="flex items-center gap-4 md:gap-6" aria-label="Main">
        <button
          type="button"
          onClick={openAboutModal}
          className="text-sm font-medium text-white/90 hover:text-white transition-colors"
        >
          {aboutTitle}
        </button>
        <button
          type="button"
          onClick={openLocationModal}
          className="text-sm font-medium text-white/90 hover:text-white transition-colors"
        >
          {gymNav.gym}
        </button>
        <button
          type="button"
          onClick={openPricingModal}
          className="text-sm font-medium text-white/90 hover:text-white transition-colors"
        >
          {pricingTitle}
        </button>
        <button
          type="button"
          onClick={openMembershipModal}
          className="text-sm font-medium text-white/90 hover:text-white transition-colors"
        >
          {auth.membership}
        </button>
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
