"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const m = getMessages(locale as "en" | "vi").auth;
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const e2 = email.trim().toLowerCase();
    if (!e2 || !/@/.test(e2)) {
      setError(locale === "vi" ? "Nhập địa chỉ email hợp lệ." : "Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/reset-password`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(e2, { redirectTo });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      setSent(true);
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
          {m.forgotPasswordTitle}
        </h1>
        <p className="text-[var(--sky-text-secondary)] text-sm">{m.forgotPasswordSubtitle}</p>
        {sent ? (
          <div className="space-y-4">
            <p className="text-emerald-400 text-sm">{m.forgotPasswordSuccess}</p>
            <Link
              href={`/${locale}/login`}
              className="sky-cta-primary block w-full py-3 rounded-full font-medium text-center"
            >
              {m.backToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={m.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="sky-cta-primary w-full py-3 rounded-full font-medium disabled:opacity-60">
              {loading ? "…" : m.forgotPasswordSend}
            </button>
          </form>
        )}
        <Link href={`/${locale}/login`} className="block text-center text-[var(--sky-text-secondary)] text-sm hover:text-[var(--sky-text-primary)]">
          ← {m.backToLogin}
        </Link>
      </div>
    </div>
  );
}
