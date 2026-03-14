"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 space-y-4 sky-glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-[var(--sky-text-secondary)] hover:text-[var(--sky-text-primary)] text-lg"
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="text-xl font-bold text-[var(--sky-text-primary)] pr-8" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
          {m.forgotPasswordTitle}
        </h2>
        <p className="text-[var(--sky-text-secondary)] text-sm">{m.forgotPasswordSubtitle}</p>
        {sent ? (
          <div className="space-y-4">
            <p className="text-emerald-400 text-sm">{m.forgotPasswordSuccess}</p>
            <button
              type="button"
              onClick={onClose}
              className="sky-cta-primary block w-full py-3 rounded-full font-medium text-center"
            >
              {locale === "vi" ? "Đóng" : "Close"}
            </button>
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
      </div>
    </div>
  );
}
