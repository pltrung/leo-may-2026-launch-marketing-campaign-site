"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { HERO_BG } from "@/lib/heroConstants";
import { toE164 } from "@/lib/phoneE164";

/**
 * Pre-launch claim flow: enter email or phone → we send a magic link (or say "already have account, log in").
 * Clear entry point so pre-launch members don't land on generic signup.
 */
export default function ClaimPage() {
  const locale = useLocale();
  const m = getMessages(locale as "en" | "vi").auth;
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "has_account" | "loading">("idle");
  const [loading, setLoading] = useState(false);

  const isEmail = (v: string) => /@/.test(v.trim());

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("idle");
    const input = emailOrPhone.trim();
    if (!input) {
      setError("Email or phone required");
      return;
    }

    setLoading(true);
    try {
      const body: { email?: string; phone?: string; locale?: string } = { locale };
      if (isEmail(input)) {
        body.email = input.toLowerCase();
      } else {
        body.phone = toE164(input);
      }

      const res = await fetch("/api/auth/claim-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && typeof (data as { url?: string }).url === "string") {
        window.location.href = (data as { url: string }).url;
        return;
      }
      if (res.ok && (data as { hasAccount?: boolean }).hasAccount) {
        setStatus("has_account");
        setLoading(false);
        return;
      }
      if (res.status === 404) {
        setError(m.claimNotInWaitlist);
        setLoading(false);
        return;
      }
      setError((data as { error?: string })?.error || m.error);
    } catch {
      setError(m.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20"
      style={{ background: HERO_BG }}
    >
      <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
        {m.claimTitle}
      </h1>
      <p className="text-white/70 text-sm mb-6 text-center max-w-sm">{m.claimSubtitle}</p>

      {status === "has_account" ? (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-white/90 text-sm">{m.claimAlreadyHaveAccount}</p>
          <Link
            href={`/${locale}/login`}
            className="block w-full py-3 rounded-full bg-white text-[#0B0B0F] font-medium text-center"
          >
            {m.login}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleClaim} className="w-full max-w-sm space-y-3">
          <input
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder={m.emailOrPhone}
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-white text-[#0B0B0F] font-medium disabled:opacity-60"
          >
            {loading ? "…" : m.claimSendLink}
          </button>
        </form>
      )}

      <div className="mt-8 flex flex-col items-center gap-2">
        <Link href={`/${locale}/gym/membership`} className="text-white/80 text-sm hover:text-white">
          ← {m.membership}
        </Link>
        <Link href={`/${locale}/signup`} className="text-white/60 text-xs hover:text-white/80">
          {m.claimNotInWaitlist}
        </Link>
      </div>
    </div>
  );
}
