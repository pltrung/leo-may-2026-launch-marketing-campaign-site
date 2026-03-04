"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useMemberAuth } from "@/lib/useMemberAuth";

export default function GymMembershipPage() {
  const locale = useLocale();
  const router = useRouter();
  const m = getMessages(locale as "en" | "vi").gym.membershipEntry;
  const { user, member, loading } = useMemberAuth();

  useEffect(() => {
    if (loading) return;
    if (user && member) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [loading, user, member, locale, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center sky-auth-page">
        <p className="text-[var(--sky-text-secondary)] text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 sky-auth-page">
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
