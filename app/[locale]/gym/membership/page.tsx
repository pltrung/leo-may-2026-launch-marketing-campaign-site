"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useMemberAuth } from "@/lib/useMemberAuth";
import { HERO_BG } from "@/lib/heroConstants";

export default function GymMembershipPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: HERO_BG }}>
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20"
      style={{ background: HERO_BG }}
    >
      <h1
        className="text-3xl md:text-4xl font-bold text-white text-center tracking-tight mb-4"
        style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
      >
        {m.headline}
      </h1>
      <p className="text-white/80 text-center max-w-md mb-4" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
        {m.prelaunch}
      </p>
      <p className="text-white/70 text-center max-w-md mb-10" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
        {m.newHere}
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href={`/${locale}/login`}
          className="px-8 py-3 rounded-full border border-white/70 text-white font-medium hover:bg-white/10 transition-colors text-center"
        >
          {m.login}
        </Link>
        <Link
          href={`/${locale}/signup`}
          className="px-8 py-3 rounded-full bg-white text-[#0B0B0F] font-medium hover:bg-white/90 transition-colors text-center"
        >
          {m.createAccount}
        </Link>
      </div>
    </div>
  );
}
