"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";

export type VerificationSuccessPayload =
  | { mode: "countdown" }
  | { mode: "lookup"; hasWaitlist: boolean; user?: { name: string; email?: string; phone?: string; team: string; referralCode?: string } };

interface VerificationModalProps {
  onClose: () => void;
  onSuccess: (payload: VerificationSuccessPayload) => void;
  locale?: Locale;
  /** Countdown flow: prefill and upsert waitlist after verify */
  name?: string;
  cloud_type?: string;
  email?: string;
  phone?: string;
}

type Step = "input" | "code" | "verifying";

const EASE_HERO = [0.22, 1, 0.36, 1] as const;

/** Normalize phone to E.164 for Supabase/Twilio. US (+1) and VN (+84) supported when no country code. */
function toE164(phone: string): string {
  const trimmed = phone.trim().replace(/\s/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  // Vietnam: 10 digits starting with 0 (e.g. 0912345678) → +84912345678
  if (digits.length === 10 && digits.startsWith("0")) return `+84${digits.slice(1)}`;
  // Vietnam: 9 digits, mobile prefix 9/8/7/5/3 → +84
  if (digits.length === 9 && /^[98753]/.test(digits)) return `+84${digits}`;
  // US: 10 digits → +1
  if (digits.length === 10) return `+1${digits}`;
  // US: 11 digits starting with 1 → +1...
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export default function VerificationModal({
  onClose,
  onSuccess,
  locale = "en",
  name,
  cloud_type,
  email: initialEmail,
  phone: initialPhone,
}: VerificationModalProps) {
  const t = getMessages(locale).verification;
  const [step, setStep] = useState<Step>("input");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isCountdownFlow = typeof name === "string" && name.trim() !== "" && typeof cloud_type === "string" && cloud_type.trim() !== "";

  const isTestEmail = (e: string) => /^ev\d+-.+@l$/.test(e) || /^dummy2\d+@test\.local$/.test(e);
  const devBypassOtp = typeof process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "string" && process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "true";

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const eTrim = email.trim().toLowerCase();
    const pTrim = phone.trim().replace(/\s/g, "");
    if (!eTrim && !pTrim) {
      setError(t.enterEmailOrPhone);
      return;
    }
    // Prefer email if both filled; for phone require at least 10 digits so "+84" alone is rejected
    const useEmail = !!eTrim;
    const phoneDigits = pTrim.replace(/\D/g, "");
    if (!useEmail && phoneDigits.length < 10) {
      setError(t.enterEmailOrPhone);
      return;
    }
    setLoading(true);
    try {
      // Dev-only: skip OTP for test accounts (verified via seed_verify_test_accounts.sql)
      if (!isCountdownFlow && devBypassOtp && useEmail && isTestEmail(eTrim)) {
        const res = await fetch(`/api/waitlist/lookup?email=${encodeURIComponent(eTrim)}`);
        const json = await res.json();
        const u = json?.user;
        if (u?.team && (u.isVerified === true)) {
          onSuccess({
            mode: "lookup",
            hasWaitlist: true,
            user: { name: u.name, email: u.email, phone: u.phone, team: u.team, referralCode: u.referralCode },
          });
          onClose();
          setLoading(false);
          return;
        }
      }

      const supabase = createBrowserClient();
      const phoneE164 = toE164(phone);
      const options = useEmail ? { email: eTrim } : { phone: phoneE164 };
      const { error: err } = await supabase.auth.signInWithOtp(options as { email: string } | { phone: string });
      if (err) {
        const msg = err.message?.toLowerCase() ?? "";
        setError(
          msg.includes("rate limit") || msg.includes("rate_limit") ? t.rateLimit : err.message || t.errorSend
        );
        return;
      }
      setStep("code");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.errorSend;
      setError(msg || t.errorSend);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    setStep("verifying");
    try {
      const supabase = createBrowserClient();
      const eTrim = email.trim().toLowerCase();
      const phoneE164 = toE164(phone);
      const tokenVal = code.trim();
      const { data, error: verifyErr } = eTrim
        ? await supabase.auth.verifyOtp({ email: eTrim, token: tokenVal, type: "email" })
        : await supabase.auth.verifyOtp({ phone: phoneE164, token: tokenVal, type: "sms" });
      if (verifyErr || !data?.session) {
        setError(t.invalidCode);
        setStep("code");
        setLoading(false);
        return;
      }
      const token = data.session.access_token;

      if (isCountdownFlow && name && cloud_type) {
        const res = await fetch("/api/waitlist/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
            name: name.trim(),
            cloud_type: cloud_type.trim(),
            email: eTrim || undefined,
            phone: (eTrim ? undefined : toE164(phone)) || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error || "Failed to verify");
          setStep("code");
          setLoading(false);
          return;
        }
        onSuccess({ mode: "countdown" });
      } else {
        // Link flow (e.g. "Know your cloud?"): link auth to existing waitlist row by email/phone, or get existing linked row
        const linkRes = await fetch("/api/waitlist/link", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const linkJson = await linkRes.json();
        let u = linkJson?.user;
        if (!u) {
          const meRes = await fetch("/api/waitlist/me", { headers: { Authorization: `Bearer ${token}` } });
          const meJson = await meRes.json();
          u = meJson?.user;
        }
        const hasWaitlist = !!u;
        onSuccess({
          mode: "lookup",
          hasWaitlist,
          user: u ? { name: u.name, email: u.email, phone: u.phone, team: u.team, referralCode: u.referralCode } : undefined,
        });
      }
      onClose();
    } catch {
      setError(t.invalidCode);
      setStep("code");
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const modal = (
    <motion.div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ minHeight: "100dvh" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
      <motion.div
        className="relative w-full max-w-md min-w-0 rounded-3xl shadow-2xl p-6 sm:p-8 my-auto max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.22, ease: EASE_HERO }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-storm/60 hover:text-storm"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="font-subheadline text-xl text-storm mb-2 pr-10">{t.title}</h3>

        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.form
              key="input"
              onSubmit={handleSendCode}
              className="space-y-4 min-w-0"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <p className="font-caption text-storm/70 text-sm mb-4">{t.enterEmailOrPhone}</p>
              <div className="min-w-0">
                <label htmlFor="vm-email" className="font-caption block text-sm text-storm mb-1">Email</label>
                <input
                  id="vm-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-w-0 box-border px-4 py-3 rounded-xl bg-white border border-mist/60 focus:outline-none focus:ring-2 focus:ring-storm/30"
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="vm-phone" className="font-caption block text-sm text-storm mb-1">Phone</label>
                <input
                  id="vm-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+84"
                  className="w-full min-w-0 box-border px-4 py-3 rounded-xl bg-white border border-mist/60 focus:outline-none focus:ring-2 focus:ring-storm/30"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-storm text-white font-subheadline hover:opacity-90 disabled:opacity-50"
              >
                {loading ? t.sending : t.sendCode}
              </button>
            </motion.form>
          )}
          {(step === "code" || step === "verifying") && (
            <motion.form
              key="code"
              onSubmit={handleVerify}
              className="space-y-4 min-w-0"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <p className="font-caption text-storm/70 text-sm mb-4">{t.enterCode}</p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full min-w-0 box-border px-4 py-3 rounded-xl bg-white border border-mist/60 focus:outline-none focus:ring-2 focus:ring-storm/30 text-center text-lg tracking-widest"
                maxLength={6}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length < 4}
                className="w-full py-3 rounded-xl bg-storm text-white font-subheadline hover:opacity-90 disabled:opacity-50"
              >
                {loading ? t.verifying : t.verify}
              </button>
              <button
                type="button"
                onClick={() => { setStep("input"); setCode(""); setError(""); }}
                className="w-full py-2 text-storm/70 text-sm"
              >
                Use a different email or phone
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
