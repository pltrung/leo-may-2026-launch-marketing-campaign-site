"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/ui/BottomSheet";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { toE164 } from "@/lib/phoneE164";

type ClaimStatus = "idle" | "loading" | "not_found" | "has_account" | "rate_limit";

interface MembershipEntrySheetProps {
  open: boolean;
  onClose: () => void;
}

export default function MembershipEntrySheet({ open, onClose }: MembershipEntrySheetProps) {
  const locale = useLocale();
  const router = useRouter();
  const m = getMessages(locale as "en" | "vi").gym.membershipEntry;
  const auth = getMessages(locale as "en" | "vi").auth;

  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimEmailOrPhone, setClaimEmailOrPhone] = useState("");
  const [claimPassword, setClaimPassword] = useState("");
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [claimError, setClaimError] = useState("");
  const [hasAccountEmail, setHasAccountEmail] = useState("");

  const isEmail = (v: string) => /@/.test(v.trim());

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError("");
    const input = claimEmailOrPhone.trim();
    if (!input) {
      setClaimError(auth.emailOrPhone + " required");
      return;
    }
    setClaimStatus("loading");
    try {
      const body: { email?: string; phone?: string; locale?: string; origin?: string } = {
        locale,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      };
      if (isEmail(input)) body.email = input.toLowerCase();
      else body.phone = toE164(input);

      const res = await fetch("/api/auth/claim-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.status === 404 || (data as { status?: string }).status === "not_found") {
        setClaimStatus("not_found");
        return;
      }
      if (res.status === 429 || /rate limit|too many requests/i.test((data as { error?: string }).error ?? "")) {
        setClaimStatus("rate_limit");
        setClaimError("");
        return;
      }
      if (res.ok && (data as { hasAccount?: boolean }).hasAccount) {
        setHasAccountEmail((data as { email?: string }).email ?? input);
        setClaimStatus("has_account");
        return;
      }
      const magicUrl = (data as { url?: string; magicLinkUrl?: string }).url ?? (data as { magicLinkUrl?: string }).magicLinkUrl;
      if (res.ok && typeof magicUrl === "string") {
        window.location.href = magicUrl;
        return;
      }
      setClaimError((data as { error?: string }).error || auth.error);
      setClaimStatus("idle");
    } catch {
      setClaimError(auth.error);
      setClaimStatus("idle");
    }
  };

  const handleHasAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError("");
    if (!claimPassword) {
      setClaimError(auth.invalidCredentials);
      return;
    }
    setClaimStatus("loading");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: hasAccountEmail,
        password: claimPassword,
      });
      if (error) {
        setClaimError(error.message || auth.invalidCredentials);
        setClaimStatus("has_account");
        return;
      }
      onClose();
      router.replace(`/${locale}/dashboard`);
    } catch {
      setClaimError(auth.error);
      setClaimStatus("has_account");
    }
  };

  const resetClaim = () => {
    setShowClaimForm(false);
    setClaimEmailOrPhone("");
    setClaimPassword("");
    setClaimStatus("idle");
    setClaimError("");
    setHasAccountEmail("");
  };

  const handleClose = () => {
    resetClaim();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={handleClose} title={m.headline}>
      <div className="flex flex-col gap-6">
        {/* Pre-launch section */}
        <section>
          <p className="text-[var(--sky-text-secondary)] text-sm mb-3" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
            {m.prelaunch}
          </p>
          {!showClaimForm && claimStatus !== "has_account" && claimStatus !== "not_found" && claimStatus !== "rate_limit" && (
            <button type="button" onClick={() => setShowClaimForm(true)} className="sky-cta-primary w-full py-3 rounded-full font-medium">
              {m.claimAccount}
            </button>
          )}
          {showClaimForm && claimStatus !== "has_account" && claimStatus !== "not_found" && claimStatus !== "rate_limit" && (
            <form onSubmit={handleClaimSubmit} className="space-y-3">
              <input
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder={auth.emailOrPhone}
                value={claimEmailOrPhone}
                onChange={(e) => setClaimEmailOrPhone(e.target.value)}
                className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
              />
              {claimError && <p className="text-red-400 text-sm">{claimError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={resetClaim} className="sky-cta-secondary flex-1 py-3 rounded-full font-medium">
                  Back
                </button>
                <button type="submit" disabled={claimStatus === "loading"} className="sky-cta-primary flex-1 py-3 rounded-full font-medium disabled:opacity-60">
                  {claimStatus === "loading" ? "…" : (m.claimContinue ?? auth.claimContinue)}
                </button>
              </div>
            </form>
          )}
          {claimStatus === "not_found" && (
            <div className="space-y-3">
              <p className="text-[var(--sky-text-secondary)] text-sm">{m.claimNotFound ?? auth.claimNotFound}</p>
              <Link href={`/${locale}/signup`} onClick={handleClose} className="sky-cta-primary block w-full py-3 rounded-full font-medium text-center">
                {m.createAccount}
              </Link>
              <button type="button" onClick={resetClaim} className="sky-cta-secondary w-full py-3 rounded-full font-medium">
                Back
              </button>
            </div>
          )}
          {claimStatus === "rate_limit" && (
            <div className="space-y-3">
              <p className="text-[var(--sky-text-secondary)] text-sm">We hit an email send limit. Please wait a bit or use Login.</p>
              <Link href={`/${locale}/login`} onClick={handleClose} className="sky-cta-primary block w-full py-3 rounded-full font-medium text-center">
                {auth.login}
              </Link>
              <button type="button" onClick={resetClaim} className="sky-cta-secondary w-full py-3 rounded-full font-medium">
                Back
              </button>
            </div>
          )}
          {claimStatus === "has_account" && (
            <form onSubmit={handleHasAccountLogin} className="space-y-3">
              <p className="text-[var(--sky-text-secondary)] text-sm">{auth.claimAlreadyHaveAccount}</p>
              <input
                type="password"
                autoComplete="current-password"
                placeholder={auth.password}
                value={claimPassword}
                onChange={(e) => setClaimPassword(e.target.value)}
                className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
              />
              {claimError && <p className="text-red-400 text-sm">{claimError}</p>}
              <button type="submit" disabled={claimStatus === "loading"} className="sky-cta-primary w-full py-3 rounded-full font-medium disabled:opacity-60">
                {claimStatus === "loading" ? "…" : auth.login}
              </button>
            </form>
          )}
        </section>

        {/* New here + Login / Create — hide only when showing has_account password form or not_found/rate_limit (they have their own CTAs) */}
        {claimStatus !== "has_account" && claimStatus !== "not_found" && claimStatus !== "rate_limit" && (
          <section>
            <p className="text-[var(--sky-text-secondary)] text-sm mb-3" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
              {m.newHere}
            </p>
            <div className="flex flex-col gap-2">
              <Link href={`/${locale}/login`} onClick={handleClose} className="sky-cta-secondary w-full py-3 rounded-full font-medium text-center">
                {m.login}
              </Link>
              <Link href={`/${locale}/signup`} onClick={handleClose} className="sky-cta-primary w-full py-3 rounded-full font-medium text-center">
                {m.createAccount}
              </Link>
            </div>
          </section>
        )}

        <div className="pt-2 border-t border-[var(--sky-glass-border)]">
          <Link href={`/${locale}/gym/membership`} onClick={handleClose} className="text-[var(--sky-text-secondary)] text-sm hover:text-[var(--sky-text-primary)] transition-colors">
            {m.continueInFullPage}
          </Link>
        </div>
      </div>
    </BottomSheet>
  );
}
