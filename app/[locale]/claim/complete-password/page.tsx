"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { PRELAUNCH_CLAIM_PASSWORD_PENDING_KEY, isPrelaunchClaimPasswordPending } from "@/lib/prelaunchClaimAuth";

const RETRY_INTERVALS_MS = [0, 100, 300, 600, 1000];

/**
 * After pre-launch claim magic link: user lands here with hash (type=magiclink),
 * sets their own password, then continues to the dashboard.
 */
export default function ClaimCompletePasswordPage() {
  const locale = useLocale();
  const router = useRouter();
  const m = getMessages(locale as "en" | "vi").auth;
  const claimM = getMessages(locale as "en" | "vi").claimCompletePassword;
  const d = getMessages(locale as "en" | "vi").dashboard;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [noSession, setNoSession] = useState(false);
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current || typeof window === "undefined") return;

    const hash = window.location.hash || "";
    const expectAuthInHash =
      /type=magiclink/.test(hash) || /type=recovery/.test(hash) || /access_token=/.test(hash);

    const finishWithSession = () => {
      tried.current = true;
      setSessionReady(true);
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };

    const trySession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return false;

        const pending = isPrelaunchClaimPasswordPending(session.user?.user_metadata);
        if (!pending && !expectAuthInHash) {
          tried.current = true;
          router.replace(`/${locale}/dashboard`);
          return true;
        }
        finishWithSession();
        return true;
      } catch {
        return false;
      }
    };

    let step = 0;
    const poll = async () => {
      if (await trySession()) return;
      step++;
      if (step < RETRY_INTERVALS_MS.length) {
        setTimeout(poll, RETRY_INTERVALS_MS[step]);
      } else {
        tried.current = true;
        setNoSession(true);
      }
    };

    void (async () => {
      if (await trySession()) return;
      if (!expectAuthInHash) {
        tried.current = true;
        setNoSession(true);
        return;
      }
      setTimeout(poll, RETRY_INTERVALS_MS[0]);
    })();
  }, [locale, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newPassword || newPassword.length < 6) {
      setError(locale === "vi" ? "Mật khẩu tối thiểu 6 ký tự." : "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(d.passwordMismatch);
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: err } = await supabase.auth.updateUser({
        password: newPassword,
        data: { [PRELAUNCH_CLAIM_PASSWORD_PENDING_KEY]: false },
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace(`/${locale}/dashboard`), 1200);
    } catch {
      setError(m.error);
    } finally {
      setLoading(false);
    }
  };

  if (noSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 sky-auth-page">
        <div className="sky-glass-panel w-full max-w-sm rounded-2xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-[var(--sky-text-primary)]" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
            {claimM.invalidLinkTitle}
          </h1>
          <p className="text-[var(--sky-text-secondary)] text-sm">{claimM.invalidLinkBody}</p>
          <Link href={`/${locale}/claim`} className="sky-cta-primary block w-full py-3 rounded-full font-medium text-center">
            {m.claimTitle}
          </Link>
          <Link href={`/${locale}/gym`} className="block text-center text-[var(--sky-text-secondary)] text-sm hover:text-[var(--sky-text-primary)]">
            ← {m.membership}
          </Link>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center sky-auth-page">
        <p className="text-[var(--sky-text-secondary)] text-sm">{claimM.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 sky-auth-page">
      <div className="sky-glass-panel w-full max-w-sm rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-bold text-[var(--sky-text-primary)]" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
          {claimM.title}
        </h1>
        <p className="text-[var(--sky-text-secondary)] text-sm">{claimM.subtitle}</p>
        {success ? (
          <p className="text-emerald-400 text-sm">{claimM.success}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              autoComplete="new-password"
              placeholder={d.newPassword}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder={d.confirmPassword}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="sky-cta-primary w-full py-3 rounded-full font-medium disabled:opacity-60">
              {loading ? "…" : claimM.submit}
            </button>
          </form>
        )}
        <p className="text-[var(--sky-text-secondary)] text-xs">{claimM.hint}</p>
      </div>
    </div>
  );
}
