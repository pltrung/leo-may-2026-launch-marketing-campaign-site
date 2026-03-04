"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";

const RESEND_COOLDOWN_SEC = 60;

export default function SignupPage() {
  const locale = useLocale();
  const router = useRouter();
  const m = getMessages(locale as "en" | "vi").auth;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmailView, setCheckEmailView] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [rateLimitHit, setRateLimitHit] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAlreadyRegistered(false);
    setRateLimitHit(false);
    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email and password required");
      return;
    }
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const claimRes = await fetch("/api/auth/claim-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          locale,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        }),
      });
      const claimData = await claimRes.json();
      if (claimRes.ok && typeof (claimData as { url?: string }).url === "string") {
        window.location.href = (claimData as { url: string }).url;
        return;
      }
      if (claimRes.ok && (claimData as { hasAccount?: boolean }).hasAccount) {
        setError(m.claimAlreadyHaveAccount);
        setAlreadyRegistered(true);
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { full_name: name.trim(), phone: phone.trim() || undefined } },
      });
      if (signUpError) {
        const msg = signUpError.message ?? "";
        if (/already registered|user already exists/i.test(msg)) {
          setError(m.signupAlreadyRegistered);
          setAlreadyRegistered(true);
        } else if (/rate limit|too many requests/i.test(msg)) {
          setError(m.signupRateLimitMessage);
          setRateLimitHit(true);
        } else {
          setError(msg || m.error);
        }
        setLoading(false);
        return;
      }
      if (!data?.session?.access_token) {
        setCheckEmailView(true);
        setLoading(false);
        return;
      }
      const res = await fetch("/api/member/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          full_name: name.trim(),
          email: trimmedEmail,
          phone: phone.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err?.error || m.error);
        setLoading(false);
        return;
      }
      router.replace(`/${locale}/waiver`);
    } catch {
      setError(m.error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    const supabase = getSupabaseBrowserClient();
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setResendCooldown(RESEND_COOLDOWN_SEC);
    setError("");
  }, [email, resendCooldown]);

  if (checkEmailView) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 sky-auth-page">
        <div className="sky-glass-panel w-full max-w-sm rounded-2xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-[var(--sky-text-primary)]" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
            {m.signupCheckEmailTitle}
          </h1>
          <p className="text-[var(--sky-text-secondary)] text-sm">{m.signupConfirmEmail}</p>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="sky-cta-secondary w-full py-3 rounded-full font-medium disabled:opacity-50"
          >
            {resendCooldown > 0 ? m.signupResendCooldown.replace("{seconds}", String(resendCooldown)) : m.signupResendCode}
          </button>
          <Link href={`/${locale}/login`} className="sky-cta-primary block w-full py-3 rounded-full font-medium text-center">
            {m.login}
          </Link>
        </div>
        <Link href={`/${locale}/claim`} className="mt-6 text-[var(--sky-text-secondary)] text-sm hover:text-[var(--sky-text-primary)]">
          {m.signupPrelaunchHint}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 sky-auth-page">
      <div className="sky-glass-panel w-full max-w-sm rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-bold text-[var(--sky-text-primary)]" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
          {m.signupTitle}
        </h1>
        <p className="text-[var(--sky-text-secondary)] text-sm">{m.signupSubtitle}</p>
        <form onSubmit={handleSignup} className="space-y-3">
          <input
            type="text"
            placeholder={m.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
          />
          <input
            type="email"
            placeholder={m.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
          />
          <input
            type="tel"
            placeholder={m.phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
          />
          <input
            type="password"
            placeholder={m.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="sky-cta-primary w-full py-3 rounded-full font-medium disabled:opacity-60">
            {loading ? "…" : m.signup}
          </button>
        </form>
        <div className="flex flex-col items-center gap-2 pt-2">
          {(alreadyRegistered || rateLimitHit) && (
            <Link href={`/${locale}/login`} className="sky-cta-primary inline-block w-full py-3 rounded-full font-medium text-center text-sm">
              {m.signupGoToLogin}
            </Link>
          )}
          <Link href={`/${locale}/login`} className="text-[var(--sky-text-secondary)] text-sm hover:text-[var(--sky-text-primary)]">
            {m.login}
          </Link>
          <Link href={`/${locale}/gym/membership`} className="text-[var(--sky-text-secondary)] text-xs hover:text-[var(--sky-text-primary)]">
            ← {m.membership}
          </Link>
        </div>
      </div>
    </div>
  );
}
