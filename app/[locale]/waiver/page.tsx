"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useMemberAuth } from "@/lib/useMemberAuth";
import { HERO_BG } from "@/lib/heroConstants";

export default function WaiverPage() {
  const locale = useLocale();
  const router = useRouter();
  const m = getMessages(locale as "en" | "vi").waiver;
  const { user, member, loading } = useMemberAuth();
  const [fullName, setFullName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/${locale}/login`);
      return;
    }
    if (member?.waiver_signed) {
      router.replace(`/${locale}/dashboard`);
      return;
    }
    if (user && !member) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [loading, user, member, locale, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !agreed) {
      setError("Full name and agreement required");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
      if (!session?.access_token) {
        setError("Session expired");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/member/waiver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          agreed: true,
          signature_data: signature || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to save");
        setSubmitting(false);
        return;
      }
      router.replace(`/${locale}/dashboard`);
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: HERO_BG }}>
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20" style={{ background: HERO_BG }}>
      <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
        {m.title}
      </h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <input
          type="text"
          placeholder={m.fullName}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
        />
        <label className="flex items-center gap-2 text-white/90 text-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="rounded"
          />
          {m.agreement}
        </label>
        <input
          type="text"
          placeholder={m.signature}
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-full bg-white text-[#0B0B0F] font-medium disabled:opacity-60"
        >
          {submitting ? "…" : m.submit}
        </button>
      </form>
    </div>
  );
}
