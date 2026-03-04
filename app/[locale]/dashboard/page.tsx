"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useMemberAuth } from "@/lib/useMemberAuth";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { HERO_BG } from "@/lib/heroConstants";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  { ssr: false }
);

export default function DashboardPage() {
  const locale = useLocale();
  const router = useRouter();
  const m = getMessages(locale as "en" | "vi").dashboard;
  const { user, member, loading, signOut } = useMemberAuth();
  const [mounted, setMounted] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) {
      router.replace(`/${locale}/login`);
      return;
    }
    if (member && !member.waiver_signed) {
      router.replace(`/${locale}/waiver`);
    }
  }, [mounted, loading, user, member, locale, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: HERO_BG }}>
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: HERO_BG }}>
        <p className="text-white/80 text-center">Setting up your profile…</p>
      </div>
    );
  }

  const qrPayload = `leo-member:${member.id}`;
  const memberSince = member.created_at
    ? new Date(member.created_at).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";
  const lastCheckIn = member.last_check_in
    ? new Date(member.last_check_in).toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: m.passwordError });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: m.passwordError });
      return;
    }
    setPasswordLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMessage({ type: "error", text: error.message || m.passwordError });
      } else {
        setPasswordMessage({ type: "ok", text: m.passwordUpdated });
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordMessage({ type: "error", text: m.passwordError });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: "linear-gradient(180deg, #0B0B0F 0%, #12121a 40%, #1a1a2e 100%)",
      }}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-8 py-4 bg-black/20 backdrop-blur-md border-b border-white/10">
        <Link href={`/${locale}/gym`} className="flex items-center text-white/90 text-sm">
          ← Gym
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/dashboard`}
            className="text-white/90 text-sm font-medium"
          >
            {m.membershipStatus}
          </Link>
          <button
            type="button"
            onClick={() => signOut().then(() => router.replace(`/${locale}/login`))}
            className="text-white/70 text-sm hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="px-4 md:px-8 py-8 max-w-lg mx-auto">
        <h1
          className="text-2xl font-bold text-white mb-8"
          style={{ fontFamily: "MiSans-Bold, sans-serif" }}
        >
          {m.welcome.replace("{name}", member.full_name || "Member")}
        </h1>

        <section className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
          <p className="text-white/80 text-sm text-center mb-4">Show at check-in</p>
          <div className="flex justify-center">
            {mounted && (
              <QRCodeSVG
                value={qrPayload}
                size={220}
                level="M"
                bgColor="transparent"
                fgColor="#ffffff"
              />
            )}
          </div>
        </section>

        <section className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-4">{m.membershipStatus}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between text-white/80">
              <span>{m.tier}</span>
              <span className="text-white">{member.tier}</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>{m.memberSince}</span>
              <span className="text-white">{memberSince}</span>
            </div>
          </dl>
          <p className="text-white/60 text-xs mt-3">{m.benefits}</p>
        </section>

        <section className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-4">{m.gymStats}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between text-white/80">
              <span>{m.totalVisits}</span>
              <span className="text-white">{member.total_visits ?? 0}</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>{m.lastCheckIn}</span>
              <span className="text-white">{lastCheckIn}</span>
            </div>
          </dl>
        </section>

        <section className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-4">{m.community}</h2>
          <p className="text-white/60 text-sm">{m.upcomingEvents}</p>
          <p className="text-white/60 text-sm mt-2">{m.leaderboard}</p>
        </section>

        <section className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-2">{m.profileSection}</h2>
          {user?.email && (
            <p className="text-white/60 text-sm mb-4">{user.email}</p>
          )}
          <p className="text-white/70 text-sm mb-3">{m.setPassword}</p>
          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <input
              type="password"
              placeholder={m.newPassword}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder={m.confirmPassword}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
              autoComplete="new-password"
            />
            {passwordMessage && (
              <p className={passwordMessage.type === "ok" ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
                {passwordMessage.text}
              </p>
            )}
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 rounded-full bg-white/20 text-white font-medium disabled:opacity-60 hover:bg-white/30"
            >
              {passwordLoading ? "…" : m.updatePassword}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
