"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { toE164 } from "@/lib/phoneE164";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";

export type VerificationSuccessPayload =
  | { mode: "countdown" }
  | { mode: "lookup"; hasWaitlist: boolean; user?: { name: string; email?: string; phone?: string; team: string; referralCode?: string } };

interface VerificationModalProps {
  onClose: () => void;
  onSuccess: (payload: VerificationSuccessPayload) => void;
  locale?: Locale;
  name?: string;
  cloud_type?: string;
  email?: string;
  phone?: string;
  /** When set, identity is locked: skip method choice, show this identifier read-only, then Send OTP */
  identifier?: string;
  identifier_type?: "email" | "phone";
}

type Step = "choose" | "input" | "code" | "verifying" | "success";

const EASE_HERO = [0.22, 1, 0.36, 1] as const;

export default function VerificationModal({
  onClose,
  onSuccess,
  locale = "en",
  name,
  cloud_type,
  email: initialEmail,
  phone: initialPhone,
  identifier: lockedIdentifier,
  identifier_type: lockedType,
}: VerificationModalProps) {
  const t = getMessages(locale).verification;
  const identityLocked = !!(lockedIdentifier && lockedType);

  const [step, setStep] = useState<Step>(identityLocked ? "input" : "choose");
  const [method, setMethod] = useState<"email" | "phone">(lockedType ?? "email");
  const [email, setEmail] = useState(lockedType === "email" ? (lockedIdentifier ?? initialEmail ?? "") : (initialEmail ?? ""));
  const [phone, setPhone] = useState(lockedType === "phone" ? (lockedIdentifier ?? initialPhone ?? "") : (initialPhone ?? ""));
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isCountdownFlow = typeof name === "string" && name.trim() !== "" && typeof cloud_type === "string" && cloud_type.trim() !== "";

  const isTestEmail = (e: string) => /^ev\d+-.+@l$/.test(e) || /^dummy2\d+@test\.local$/.test(e);
  const devBypassOtp = typeof process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "string" && process.env.NEXT_PUBLIC_DEV_BYPASS_OTP === "true";

  const effectiveEmail = method === "email" ? (identityLocked ? lockedIdentifier! : email.trim().toLowerCase()) : "";
  const effectivePhone = method === "phone" ? (identityLocked ? lockedIdentifier! : toE164(phone)) : "";
  const useEmail = method === "email";

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const eTrim = useEmail ? (identityLocked ? lockedIdentifier! : email.trim().toLowerCase()) : "";
    const pTrim = useEmail ? "" : (identityLocked ? lockedIdentifier! : toE164(phone));
    if (useEmail && !eTrim) {
      setError(t.enterEmailOrPhone);
      return;
    }
    if (!useEmail && !pTrim) {
      setError(t.enterEmailOrPhone);
      return;
    }
    setLoading(true);
    try {
      if (useEmail && isTestEmail(eTrim)) {
        const res = await fetch(`/api/waitlist/lookup?email=${encodeURIComponent(eTrim)}`);
        const json = await res.json();
        const u = json?.user;
        if (u?.team && (u.isVerified === true)) {
          if (isCountdownFlow) {
            onSuccess({ mode: "countdown" });
            setStep("success");
            setError("");
            setLoading(false);
            setTimeout(() => onClose(), 1200);
            return;
          }
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
      const options = useEmail ? { email: eTrim } : { phone: pTrim };
      const { error: err } = await supabase.auth.signInWithOtp(options as { email: string } | { phone: string });
      if (err) {
        const msg = err.message?.toLowerCase() ?? "";
        setError(msg.includes("rate limit") || msg.includes("rate_limit") ? t.rateLimit : err.message || t.errorSend);
        return;
      }
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errorSend);
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
      const eTrim = useEmail ? (identityLocked ? lockedIdentifier! : email.trim().toLowerCase()) : "";
      const phoneE164 = useEmail ? "" : (identityLocked ? lockedIdentifier! : toE164(phone));
      const tokenVal = code.trim();
      const { data, error: verifyErr } = useEmail
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
            email: useEmail ? (identityLocked ? lockedIdentifier : eTrim) || undefined : undefined,
            phone: !useEmail ? (identityLocked ? lockedIdentifier : phoneE164) || undefined : undefined,
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
        setStep("success");
        setError("");
        setLoading(false);
        setTimeout(() => onClose(), 1200);
        return;
      } else {
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
        onSuccess({
          mode: "lookup",
          hasWaitlist: !!u,
          user: u ? { name: u.name, email: u.email, phone: u.phone, team: u.team, referralCode: u.referralCode } : undefined,
        });
        onClose();
      }
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
      <div className="absolute inset-0 bg-black/40" aria-hidden style={{ backgroundColor: "rgba(0,0,0,0.4)" }} />
      <motion.div
        className="relative w-full max-w-md min-w-0 rounded-3xl shadow-2xl p-6 sm:p-8 my-auto max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto"
        style={{
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "24px",
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
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="font-subheadline text-xl text-white mb-2 pr-10">
          {step === "choose" ? t.chooseTitle : t.title}
        </h3>

        <AnimatePresence mode="wait">
          {step === "choose" && (
            <motion.div
              key="choose"
              className="space-y-4 min-w-0"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <p className="font-caption text-white/80 text-sm mb-4">{t.chooseSubtext}</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="vm-method" checked={method === "email"} onChange={() => setMethod("email")} className="w-4 h-4" />
                  <span className="font-caption text-white/90">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="vm-method" checked={method === "phone"} onChange={() => setMethod("phone")} className="w-4 h-4" />
                  <span className="font-caption text-white/90">Phone</span>
                </label>
              </div>
              <button type="button" onClick={() => setStep("input")} className="w-full py-3 rounded-xl bg-white/20 text-white font-subheadline hover:bg-white/30">
                Next
              </button>
            </motion.div>
          )}

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
              <p className="font-caption text-white/80 text-sm mb-4">{t.enterEmailOrPhone}</p>
              <div className="min-w-0">
                <label htmlFor="vm-identifier" className="font-caption block text-sm text-white/90 mb-1">
                  {method === "email" ? "Email" : "Phone"}
                </label>
                <input
                  id="vm-identifier"
                  type={method === "email" ? "email" : "tel"}
                  value={identityLocked ? lockedIdentifier : method === "email" ? email : phone}
                  onChange={(e) => !identityLocked && (method === "email" ? setEmail(e.target.value) : setPhone(e.target.value))}
                  placeholder={method === "email" ? "you@example.com" : "+84"}
                  disabled={identityLocked}
                  className={`w-full min-w-0 box-border px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-white/50 ${
                    identityLocked ? "bg-white/10 border-white/30 text-white/90 cursor-not-allowed" : "bg-white/10 border-white/20 text-white placeholder-white/50"
                  }`}
                />
              </div>
              {error && <p className="text-red-300 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-white/25 text-white font-subheadline hover:bg-white/35 disabled:opacity-50">
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
              <p className="font-caption text-white/80 text-sm mb-4">{t.enterCode}</p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full min-w-0 box-border px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 text-center text-lg tracking-widest"
                maxLength={6}
              />
              {error && <p className="text-red-300 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length < 4}
                className="w-full py-3 rounded-xl bg-white/25 text-white font-subheadline hover:bg-white/35 disabled:opacity-50"
              >
                {loading ? t.verifying : t.verify}
              </button>
              {!identityLocked && (
                <button
                  type="button"
                  onClick={() => { setStep("input"); setCode(""); setError(""); }}
                  className="w-full py-2 text-white/70 text-sm hover:text-white/90"
                >
                  Use a different email or phone
                </button>
              )}
            </motion.form>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              className="space-y-2 min-w-0 text-center py-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-subheadline text-xl text-white">{t.successTitle}</p>
              <p className="font-caption text-white/80 text-sm">{t.successSubtext}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
