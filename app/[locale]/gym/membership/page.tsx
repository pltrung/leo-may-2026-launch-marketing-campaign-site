"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useMemberAuth } from "@/lib/useMemberAuth";

export default function GymMembershipPage() {
  const locale = useLocale();
  const router = useRouter();
  const m = getMessages(locale as "en" | "vi").gym.membershipEntry;
  const { user, member, loading, signOut } = useMemberAuth();

  useEffect(() => {
    if (loading) return;
    if (user && member) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [loading, user, member, locale, router]);

  const handleLogout = async () => {
    await signOut();
    router.replace(`/${locale}/gym`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center sky-auth-page">
        <p className="text-[var(--sky-text-secondary)] text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 sky-auth-page">
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <Link
          href={`/${locale}/gym`}
          className="text-[var(--sky-text-secondary)] text-sm hover:text-[var(--sky-text-primary)]"
        >
          ← Gym
        </Link>
        {user && (
          <button
            type="button"
            onClick={handleLogout}
            className="text-[var(--sky-text-secondary)] text-sm hover:text-[var(--sky-text-primary)]"
          >
            Logout
          </button>
        )}
      </div>

      <div className="w-full max-w-md flex flex-col items-center mb-6">
        <div className="w-[min(90vw,200px)] sm:w-[min(85vw,240px)] md:w-[min(80vw,280px)]">
          <Logo className="w-full h-auto object-contain" />
        </div>
      </div>

      <div className="sky-glass-panel w-full max-w-md rounded-2xl p-8 space-y-6">
        <h1
          className="text-2xl md:text-3xl font-bold text-[var(--sky-text-primary)] text-center tracking-tight"
          style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
        >
          {m.headline}
        </h1>
        <p className="text-[var(--sky-text-secondary)] text-center text-sm">{m.prelaunch}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/${locale}/claim`} className="sky-cta-primary flex-1 py-3 rounded-full font-medium text-center">
            {m.claimAccount}
          </Link>
          <Link href={`/${locale}/login`} className="sky-cta-secondary flex-1 py-3 rounded-full font-medium text-center">
            {m.login}
          </Link>
        </div>
        <p className="text-[var(--sky-text-secondary)] text-center text-sm pt-2">{m.newHere}</p>
        <Link href={`/${locale}/signup`} className="sky-cta-secondary block w-full py-3 rounded-full font-medium text-center">
          {m.createAccount}
        </Link>
      </div>
    </div>
  );
}
