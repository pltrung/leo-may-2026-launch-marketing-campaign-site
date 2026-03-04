"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { HERO_BG } from "@/lib/heroConstants";

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email and password required");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim(), phone: phone.trim() || undefined } },
      });
      if (signUpError) {
        setError(signUpError.message || m.error);
        setLoading(false);
        return;
      }
      if (!data?.session?.access_token) {
        setError("Check your email to confirm, or try logging in.");
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
          email: email.trim().toLowerCase(),
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20" style={{ background: HERO_BG }}>
      <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
        {m.signupTitle}
      </h1>
      <p className="text-white/70 text-sm mb-6">{m.signupSubtitle}</p>
      <form onSubmit={handleSignup} className="w-full max-w-sm space-y-3">
        <input
          type="text"
          placeholder={m.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
        />
        <input
          type="email"
          placeholder={m.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
        />
        <input
          type="tel"
          placeholder={m.phone}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
          {loading ? "…" : m.signup}
        </button>
      </form>
      <div className="mt-6 flex flex-col items-center gap-2">
        <Link href={`/${locale}/login`} className="text-white/80 text-sm hover:text-white">
          {m.login}
        </Link>
        <Link href={`/${locale}/gym/membership`} className="text-white/60 text-xs hover:text-white/80">
          ← {m.membership}
        </Link>
      </div>
    </div>
  );
}
