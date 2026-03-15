"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouteSetterAuth } from "./RouteSetterAuthContext";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";

interface RouteSetterLoginFormProps {
  locale: Locale;
}

export default function RouteSetterLoginForm({ locale }: RouteSetterLoginFormProps) {
  const { signIn } = useRouteSetterAuth();
  const m = getMessages(locale).staff;
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4">
      <div className="absolute top-4 right-4 flex gap-0.5 rounded-full border border-slate-600 bg-slate-800 p-0.5">
        <Link
          href="/en/staff"
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${locale === "en" ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-slate-200"}`}
        >
          EN
        </Link>
        <Link
          href="/vi/staff"
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${locale === "vi" ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-slate-200"}`}
        >
          VN
        </Link>
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-slate-800 border border-slate-700 shadow-xl p-6">
        <h1 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
          Leo Mây — {m.title}
        </h1>
        <p className="text-sm text-slate-400 mb-6">{m.signInSubtitle}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="staff-email" className="block text-xs font-medium text-slate-400 mb-1">
              {m.email}
            </label>
            <input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="routesetter1@gym.local"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label htmlFor="staff-password" className="block text-xs font-medium text-slate-400 mb-1">
              {m.password}
            </label>
            <input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full text-sm font-medium bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-60"
          >
            {loading ? "…" : m.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}
