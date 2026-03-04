"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { HERO_BG } from "@/lib/heroConstants";

function LoginPageInner() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const m = getMessages(locale as "en" | "vi").auth;
  const otpSent = searchParams?.get("otp_sent") === "1";
  const emailParam = searchParams?.get("email") ?? "";
  const isTestEmail = (e: string) => /^ev\d+-.+@l$/.test(e.trim().toLowerCase()) || /^dummy2\d+@test\.local$/.test(e.trim().toLowerCase());
  const devBypassOtp = typeof process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "string" && process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (otpSent && emailParam) setEmail(decodeURIComponent(emailParam));
  }, [otpSent, emailParam]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !code.trim()) {
      setError("Email and code required");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: "email",
      });
      if (verifyError || !data?.session) {
        setError("Invalid or expired code");
        setLoading(false);
        return;
      }
      router.replace(`/${locale}/dashboard`);
    } catch {
      setError(m.error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError(m.invalidCredentials);
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        setError(m.invalidCredentials);
        setLoading(false);
        return;
      }
      router.replace(`/${locale}/dashboard`);
    } catch {
      setError(m.error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrelaunchOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Email required");
      return;
    }
    const emailTrim = email.trim().toLowerCase();
    setLoading(true);
    try {
      if (devBypassOtp && isTestEmail(emailTrim)) {
        const res = await fetch("/api/auth/dev-bypass-gym", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailTrim, locale }),
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
      const supabase = getSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: emailTrim,
      });
      if (otpError) {
        setError(otpError.message || m.error);
        setLoading(false);
        return;
      }
      router.replace(`/${locale}/login?otp_sent=1&email=${encodeURIComponent(emailTrim)}`);
    } catch {
      setError(m.error);
    } finally {
      setLoading(false);
    }
  };

  if (otpSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20" style={{ background: HERO_BG }}>
        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
          {m.otpTitle}
        </h1>
        <p className="text-white/70 text-sm mb-6">
          {m.otpSubtitle.replace("{email}", email || "your email")}
        </p>
        <form onSubmit={handleVerifyOtp} className="w-full max-w-sm space-y-3">
          <input
            type="text"
            placeholder={m.codePlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-white text-[#0B0B0F] font-medium disabled:opacity-60"
          >
            {loading ? "…" : m.otpVerify}
          </button>
        </form>
        <Link href={`/${locale}/login`} className="mt-6 text-white/70 text-sm">
          {m.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20" style={{ background: HERO_BG }}>
      <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
        {m.loginTitle}
      </h1>
      <p className="text-white/70 text-sm mb-6">{m.loginSubtitle}</p>
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
        <input
          type="email"
          placeholder={m.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
        />
        <input
          type="password"
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
      <p className="mt-6 text-white/60 text-sm">{m.prelaunchPrompt}</p>
      <button
        type="button"
        onClick={handlePrelaunchOtp}
        disabled={loading}
        className="mt-2 text-white/90 underline text-sm disabled:opacity-60"
      >
        {m.prelaunchVerify}
      </button>
      <Link href={`/${locale}/signup`} className="mt-6 text-white/70 text-sm">
        {m.signup}
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: HERO_BG }}>
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
