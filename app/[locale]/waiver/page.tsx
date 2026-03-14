"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useMemberAuth } from "@/lib/useMemberAuth";
import { WAIVER_TEXT } from "@/lib/waiverText";
import WaiverSignaturePad from "@/components/waiver/WaiverSignaturePad";

type SignatureMode = "typed" | "drawn";

export default function WaiverPage() {
  const locale = useLocale();
  const router = useRouter();
  const m = getMessages(locale as "en" | "vi").waiver;
  const { user, member, loading, accessToken } = useMemberAuth();
  const [fullName, setFullName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showWaiver, setShowWaiver] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [canSign, setCanSign] = useState(false);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("typed");
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/${locale}/gym`);
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

  const handleWaiverScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 5) {
      setHasScrolledToBottom(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !agreed) {
      setError("Full name and agreement required");
      return;
    }

    let signatureValue: string | null = null;
    if (signatureMode === "typed") {
      signatureValue = signature.trim() || null;
    } else {
      signatureValue = drawnSignature || null;
    }

    if (!signatureValue) {
      setError("Signature is required");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      let token = accessToken ?? null;
      if (!token) {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token ?? null;
      }
      if (!token) {
        setError("Session expired");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/member/waiver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          agreed: true,
          signature_data: signatureValue,
          waiver_text: WAIVER_TEXT,
        }),
      });
      let data: { error?: string; ok?: boolean } = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text) as { error?: string; ok?: boolean };
      } catch {
        setError("Invalid response from server");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        setError(data?.error || "Failed to save");
        setSubmitting(false);
        return;
      }
      // Full page redirect to avoid client-side exception during SPA transition
      window.location.href = `/${locale}/dashboard`;
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center sky-auth-page">
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 sky-auth-page">
      <h1 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
        {m.title}
      </h1>

      <div className="w-full max-w-md space-y-4">
        <button
          type="button"
          onClick={() => {
            setShowWaiver(true);
            setHasScrolledToBottom(false);
          }}
          className="w-full py-3 rounded-full bg-white text-[#0B0B0F] font-medium"
        >
          Open Waiver
        </button>

        {canSign && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              id="waiver-full-name"
              type="text"
              placeholder={m.fullName}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
            />
            <label className="flex items-center gap-2 text-white/90 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="rounded"
              />
              {m.agreement}
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>{m.signature}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSignatureMode("typed")}
                    className={`px-3 py-1 rounded-full border text-xs ${
                      signatureMode === "typed"
                        ? "bg-white text-[#0B0B0F] border-white"
                        : "border-white/40 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    Type
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureMode("drawn")}
                    className={`px-3 py-1 rounded-full border text-xs ${
                      signatureMode === "drawn"
                        ? "bg-white text-[#0B0B0F] border-white"
                        : "border-white/40 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    Draw
                  </button>
                </div>
              </div>

              {signatureMode === "typed" ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Type your full name as signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                  />
                  <button
                    type="button"
                    onClick={() => setSignature(fullName.trim())}
                    className="text-xs text-white/70 hover:text-white underline-offset-2 hover:underline"
                  >
                    Use full name as signature
                  </button>
                </div>
              ) : (
                <WaiverSignaturePad onChange={setDrawnSignature} />
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full bg-white text-[#0B0B0F] font-medium disabled:opacity-60"
            >
              {submitting ? "…" : m.submit}
            </button>
          </form>
        )}
      </div>

      {showWaiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#12121a] border border-white/10 shadow-xl p-6">
            <button
              type="button"
              onClick={() => setShowWaiver(false)}
              className="absolute top-3 right-3 text-white/60 hover:text-white text-sm"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold text-white mb-3" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
              Climbing Activity Waiver
            </h2>
            <div
              className="waiver-container text-sm text-white/90 rounded-lg bg-black/40 border border-white/10"
              onScroll={handleWaiverScroll}
            >
              {WAIVER_TEXT.split("\n\n").map((block, idx) => (
                <p key={idx} className="mb-3 whitespace-pre-wrap leading-relaxed">
                  {block.trim()}
                </p>
              ))}
            </div>
            {!hasScrolledToBottom && (
              <p className="mt-3 text-xs text-white/70">
                Please scroll to the bottom of the waiver before signing.
              </p>
            )}
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowWaiver(false)}
                className="px-4 py-2 rounded-full border border-white/40 text-white/90 text-sm"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!hasScrolledToBottom}
                onClick={() => {
                  if (!hasScrolledToBottom) return;
                  setAgreed(true);
                  setCanSign(true);
                  setShowWaiver(false);
                  setTimeout(() => {
                    const el = document.getElementById("waiver-full-name") as HTMLInputElement | null;
                    el?.focus();
                  }, 0);
                }}
                className="px-5 py-2 rounded-full bg-white text-[#0B0B0F] text-sm font-medium disabled:opacity-50"
              >
                Agree &amp; Sign Waiver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
