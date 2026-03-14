"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";

const RETRY_INTERVALS_MS = [0, 100, 300, 600];

export default function ResetPasswordPage() {
  const locale = useLocale();
  const router = useRouter();
  const m = getMessages(locale as "en" | "vi").auth;
  const d = getMessages(locale as "en" | "vi").dashboard;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [noRecovery, setNoRecovery] = useState(false);
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
    const hasRecovery = /type=recovery/.test(hash) || /access_token=/.test(hash);
    if (!hasRecovery) {
      tried.current = true;
      setNoRecovery(true);
      return;
    }
    let step = 0;
    const trySession = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          tried.current = true;
          setSessionReady(true);
          return;
        }
      } catch {
        // ignore
      }
      step++;
      if (step < RETRY_INTERVALS_MS.length) {
        setTimeout(trySession, RETRY_INTERVALS_MS[step]);
      } else {
        tried.current = true;
        setNoRecovery(true);
      }
    };
    trySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newPassword || newPassword.length < 6) {
      setError(locale === "vi" ? "Mật khẩu mới tối thiểu 6 ký tự." : "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(d.passwordMismatch);
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setSuccess(true);
      await supabase.auth.signOut();
      setTimeout(() => router.replace(`/${locale}/gym`), 1500);
    } catch {
      setError(m.error);
    } finally {
      setLoading(false);
    }
  };

  if (noRecovery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 sky-auth-page">
        <div className="sky-glass-panel w-full max-w-sm rounded-2xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-[var(--sky-text-primary)]" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
            {m.resetPasswordTitle}
          </h1>
          <p className="text-[var(--sky-text-secondary)] text-sm">
            {locale === "vi" ? "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Yêu cầu link mới." : "Reset link is invalid or expired. Request a new link."}
          </p>
          <Link
            href={`/${locale}/forgot-password`}
            className="sky-cta-primary block w-full py-3 rounded-full font-medium text-center"
          >
            {m.forgotPasswordSend}
          </Link>
          <Link href={`/${locale}/gym`} className="block text-center text-[var(--sky-text-secondary)] text-sm hover:text-[var(--sky-text-primary)]">
            ← {locale === "vi" ? "Về trang Gym" : "Back to Gym"}
          </Link>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center sky-auth-page">
        <p className="text-[var(--sky-text-secondary)] text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 sky-auth-page">
      <div className="sky-glass-panel w-full max-w-sm rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-bold text-[var(--sky-text-primary)]" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
          {m.resetPasswordTitle}
        </h1>
        <p className="text-[var(--sky-text-secondary)] text-sm">{m.resetPasswordSubtitle}</p>
        {success ? (
          <p className="text-emerald-400 text-sm">{m.resetPasswordSuccess}</p>
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
              {loading ? "…" : m.resetPasswordSet}
            </button>
          </form>
        )}
        <Link href={`/${locale}/gym`} className="block text-center text-[var(--sky-text-secondary)] text-sm hover:text-[var(--sky-text-primary)]">
          ← {locale === "vi" ? "Về trang Gym" : "Back to Gym"}
        </Link>
      </div>
    </div>
  );
}
