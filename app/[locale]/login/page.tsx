"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { HERO_BG } from "@/lib/heroConstants";
import { toE164 } from "@/lib/phoneE164";

function LoginPageInner() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const m = getMessages(locale as "en" | "vi").auth;
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmail = (v: string) => /@/.test(v.trim());
  const isTestEmail = (e: string) =>
    /^ev\d+-.+@l$/.test(e.trim().toLowerCase()) || /^dummy2\d+@test\.local$/.test(e.trim().toLowerCase());
  const devBypassOtp =
    typeof process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "string" && process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "true";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const input = emailOrPhone.trim();
    const isBypassAttempt = devBypassOtp && isEmail(input) && isTestEmail(input);
    if (!input) {
      setError(m.invalidCredentials);
      return;
    }
    if (!isBypassAttempt && !password) {
      setError(m.invalidCredentials);
      return;
    }

    setLoading(true);
    try {
      if (isBypassAttempt) {
        const res = await fetch("/api/auth/dev-bypass-gym", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: input.toLowerCase(), locale }),
        });
        const data = await res.json();
        if (res.ok && typeof data?.url === "string") {
          window.location.href = data.url;
          return;
        }
        setError(data?.error || m.error);
        setLoading(false);
        return;
      }

      if (isEmail(input)) {
        const email = input.toLowerCase();
        const supabase = getSupabaseBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInError) {
          router.replace(`/${locale}/dashboard`);
          return;
        }
        const claimRes = await fetch("/api/auth/claim-waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, locale }),
        });
        const claimData = await claimRes.json();
        if (claimRes.ok && typeof claimData?.url === "string") {
          window.location.href = claimData.url;
          return;
        }
        if (claimRes.ok && claimData?.hasAccount) {
          setError(m.invalidCredentials);
          setLoading(false);
          return;
        }
        if (claimRes.status === 404) {
          setError(m.notInWaitlist);
          setLoading(false);
          return;
        }
        setError(claimData?.error || m.error);
        setLoading(false);
        return;
      }

      const phone = toE164(input);
      const claimRes = await fetch("/api/auth/claim-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, locale }),
      });
      const claimData = await claimRes.json();

      if (claimRes.ok && typeof claimData?.url === "string") {
        window.location.href = claimData.url;
        return;
      }
      if (claimRes.ok && claimData?.hasAccount && claimData?.email) {
        const supabase = getSupabaseBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: claimData.email,
          password,
        });
        if (!signInError) {
          router.replace(`/${locale}/dashboard`);
          return;
        }
        setError(m.invalidCredentials);
        setLoading(false);
        return;
      }
      if (claimRes.status === 404) {
        setError(m.notInWaitlist);
        setLoading(false);
        return;
      }
      setError(claimData?.error || m.error);
    } catch {
      setError(m.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20" style={{ background: HERO_BG }}>
      <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
        {m.loginTitle}
      </h1>
      <p className="text-white/70 text-sm mb-6">{m.loginSubtitle}</p>
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
        <input
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder={m.emailOrPhone}
          value={emailOrPhone}
          onChange={(e) => setEmailOrPhone(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder={m.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-white text-[#0B0B0F] font-medium disabled:opacity-60"
        >
          {loading ? "…" : m.login}
        </button>
      </form>
      <div className="mt-6 flex flex-col items-center gap-2">
        <Link href={`/${locale}/signup`} className="text-white/80 text-sm hover:text-white">
          {m.createAccount}
        </Link>
        <Link href={`/${locale}/gym/membership`} className="text-white/60 text-xs hover:text-white/80">
          ← {m.membership}
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: HERO_BG }}>
          <p className="text-white/60 text-sm">Loading…</p>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
