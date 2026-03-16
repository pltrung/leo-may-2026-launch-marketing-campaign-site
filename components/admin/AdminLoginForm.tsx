"use client";

import React, { useState } from "react";
import { useAdminAuth } from "./AdminAuthContext";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";

interface AdminLoginFormProps {
  locale: Locale;
  onLocaleChange?: (locale: Locale) => void;
}

export default function AdminLoginForm({ locale, onLocaleChange }: AdminLoginFormProps) {
  const { signIn } = useAdminAuth();
  const m = getMessages(locale).admin;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#BEE7FF] via-[#EAF6FF] to-white p-4">
      {onLocaleChange && (
        <div className="absolute top-4 right-4 flex gap-1 rounded-full border border-slate-200 bg-white/80 p-0.5">
          <button
            type="button"
            onClick={() => onLocaleChange("en")}
            className={`px-3 py-1 rounded-full text-xs font-medium ${locale === "en" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => onLocaleChange("vi")}
            className={`px-3 py-1 rounded-full text-xs font-medium ${locale === "vi" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            VN
          </button>
        </div>
      )}
      <div className="w-full max-w-sm rounded-2xl bg-white/90 border border-slate-200 shadow-xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-slate-900 flex items-center justify-center shadow-sm">
            <img src="/logo-white.svg" alt="Leo Mây logo" className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold text-slate-800 tracking-wide">Leo Mây Admin</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
          {m.loginTitle}
        </h1>
        <p className="text-sm text-slate-600 mb-6">{m.loginSubtitle}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-medium text-slate-700 mb-1">
              {m.email}
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin001@gym.local"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-xs font-medium text-slate-700 mb-1">
              {m.password}
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "…" : m.login}
          </button>
        </form>
      </div>
    </div>
  );
}
