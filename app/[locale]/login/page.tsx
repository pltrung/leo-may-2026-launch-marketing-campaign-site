"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
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
          body: JSON.stringify({
            email: input.toLowerCase(),
            locale,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
          }),
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
        const magicUrl = (claimData?.url ?? claimData?.magicLinkUrl) as string | undefined;
        if (claimRes.ok && typeof magicUrl === "string") {
          window.location.href = magicUrl;
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

      const magicUrl2 = (claimData?.url ?? claimData?.magicLinkUrl) as string | undefined;
      if (claimRes.ok && typeof magicUrl2 === "string") {
        window.location.href = magicUrl2;
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 sky-auth-page">
      <div className="sky-glass-panel w-full max-w-sm rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-bold text-[var(--sky-text-primary)]" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
          {m.loginTitle}
        </h1>
        <p className="text-[var(--sky-text-secondary)] text-sm">{m.loginSubtitle}</p>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder={m.emailOrPhone}
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder={m.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="sky-cta-primary w-full py-3 rounded-full font-medium disabled:opacity-60">
            {loading ? "…" : m.login}
          </button>
        </form>
        <div className="flex flex-col items-center gap-2 pt-2">
          <Link href={`/${locale}/signup`} className="text-[var(--sky-text-secondary)] text-sm hover:text-[var(--sky-text-primary)]">
            {m.createAccount}
          </Link>
          <Link href={`/${locale}/gym/membership`} className="text-[var(--sky-text-secondary)] text-xs hover:text-[var(--sky-text-primary)]">
            ← {m.membership}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center sky-auth-page">
          <p className="text-[var(--sky-text-secondary)] text-sm">Loading…</p>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
