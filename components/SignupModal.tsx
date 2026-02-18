"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CloudPersonality } from "@/lib/cloudData";
import { useWaitlistIdentity } from "@/lib/useWaitlistIdentity";
import { toE164 } from "@/lib/phoneE164";
import { normalizeEmail } from "@/lib/emailNormalize";
import CloudFooter from "@/components/CloudFooter";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";

interface SignupModalProps {
  cloud: CloudPersonality | null;
  onClose: () => void;
  onSuccess: () => void;
  onRedirectToCountdown?: () => void;
  referredBy?: string;
  locale?: Locale;
}

interface ConfirmationData {
  position: number;
  teamCount: number;
  totalCount: number;
  percentage: number;
}

type IdMethod = "email" | "phone";

export default function SignupModal({
  cloud,
  onClose,
  onSuccess,
  onRedirectToCountdown,
  referredBy,
  locale = "en",
}: SignupModalProps) {
  const router = useRouter();
  const t = getMessages(locale).signup;
  const { user: storedUser, locked, identifier, identifier_type, setLockedIdentity, changeIdentity } = useWaitlistIdentity();
  const redirectTriggeredRef = useRef(false);

  const [step, setStep] = useState<0 | 1>(0);
  const [method, setMethod] = useState<IdMethod>("email");
  const [name, setName] = useState("");
  const [identifierInput, setIdentifierInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  const [redirectCount, setRedirectCount] = useState(8);
  const [showChangeWarning, setShowChangeWarning] = useState(false);

  useEffect(() => {
    if (locked && identifier && identifier_type) {
      setName(storedUser?.name ?? "");
      setIdentifierInput(identifier);
      setMethod(identifier_type);
      setStep(1);
    }
  }, [locked, identifier, identifier_type, storedUser?.name]);

  useEffect(() => {
    if (!confirmation) return;
    if (redirectCount <= 0) {
      if (onRedirectToCountdown && !redirectTriggeredRef.current) {
        redirectTriggeredRef.current = true;
        onRedirectToCountdown();
        return;
      }
      if (!onRedirectToCountdown) {
        onSuccess();
        router.push(`/${locale}/countdown`);
      }
      return;
    }
    const id = setTimeout(() => setRedirectCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [confirmation, redirectCount, onSuccess, onRedirectToCountdown, router, locale]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const nameTrim = name.trim();
    if (!nameTrim) {
      setError(t.nameRequired);
      return;
    }
    const raw = identifierInput.trim();
    if (!raw) {
      setError(t.emailOrPhoneRequiredError);
      return;
    }
    if (!cloud) return;

    const identifierValue = method === "email" ? normalizeEmail(raw.toLowerCase()) : toE164(raw);
    if (!identifierValue) {
      setError(t.emailOrPhoneRequiredError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist/upsert-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameTrim,
          identifier: identifierValue,
          identifier_type: method,
          cloud_type: cloud.id,
          referred_by: referredBy || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.somethingWentWrong);

      setLockedIdentity({
        identifier: identifierValue,
        identifier_type: method,
        name: nameTrim,
        team: cloud.id,
        referralCode: data.referral_code ?? undefined,
      });
      setConfirmation({
        position: data.position ?? 1,
        teamCount: data.teamCount ?? 1,
        totalCount: data.totalCount ?? 1,
        percentage: data.percentage ?? 100,
      });
      setRedirectCount(8);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmChangeIdentity = () => {
    changeIdentity();
    setShowChangeWarning(false);
    setStep(0);
    setMethod("email");
    setIdentifierInput("");
    setName("");
    setError("");
    onClose();
  };

  if (!cloud) return null;
  const accent = cloud.accentHex;

  if (confirmation) {
    return (
      <motion.div className="fixed inset-0 z-50 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-storm/40 backdrop-blur-sm" aria-hidden />
        <div className="flex-1 flex items-center justify-center p-4 relative">
          <motion.div
            className="relative w-full max-w-md rounded-2xl shadow-2xl p-8 text-center"
            style={{ backgroundColor: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-subheadline text-2xl sm:text-3xl mb-4" style={{ color: accent }}>
              {t.welcomeToTeam} {cloud.name} — {cloud.nameEn}.
            </h3>
            <p className="font-subheadline mb-2 text-lg sm:text-xl" style={{ color: accent }}>
              {t.positionInWaitlist}{confirmation.position}{t.inWaitlist}
            </p>
            <p className="font-body text-base mb-6" style={{ color: accent, opacity: 0.8 }}>
              {confirmation.percentage}% {t.percentChoseCloud}
            </p>
            <p className="font-caption text-storm/80 text-sm">{t.stayTuned}</p>
            <p className="font-caption text-sm mt-4" style={{ color: accent, textShadow: `0 0 12px ${accent}60` }}>
              {t.redirectingIn} <span style={{ color: accent, fontWeight: 600 }}>{redirectCount}</span>…
            </p>
          </motion.div>
        </div>
        <CloudFooter />
      </motion.div>
    );
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-storm/40 backdrop-blur-sm" aria-hidden />
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <motion.div
          className="relative w-full max-w-md rounded-2xl shadow-2xl p-8"
          style={{
            backgroundColor: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            borderTop: `4px solid ${accent}`,
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:opacity-80"
            style={{ color: accent }}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 className="font-subheadline text-xl sm:text-2xl mb-1" style={{ color: accent }}>
            {t.joinTeam} {cloud.name} — {cloud.nameEn}.
          </h3>
          <p className="font-caption text-storm/80 text-sm mb-6">{t.fillPlace}</p>

          <form onSubmit={handleContinue} className="space-y-4" style={{ ["--accent" as string]: accent } as React.CSSProperties}>
            {step === 0 && !locked && (
              <>
                <p className="font-caption text-storm/70 text-sm">{t.chooseEmailOrPhone}</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="method"
                      checked={method === "email"}
                      onChange={() => setMethod("email")}
                      className="w-4 h-4"
                      style={{ accentColor: accent }}
                    />
                    <span className="font-caption text-storm">{t.emailOption}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="method"
                      checked={method === "phone"}
                      onChange={() => setMethod("phone")}
                      className="w-4 h-4"
                      style={{ accentColor: accent }}
                    />
                    <span className="font-caption text-storm">{t.phoneOption}</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full py-3 rounded-xl font-subheadline transition-colors"
                  style={{ backgroundColor: accent, color: cloud.joinTextHex ?? "#fff" }}
                >
                  {t.continue}
                </button>
              </>
            )}

            {(step === 1 || locked) && (
              <>
                <div>
                  <label htmlFor="signup-name" className="font-caption block text-sm text-storm mb-1">
                    {t.name}
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-mist/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="signup-identifier" className="font-caption block text-sm text-storm mb-1">
                    {method === "email" ? t.email : t.phone}
                  </label>
                  <div className="relative">
                    <input
                      id="signup-identifier"
                      type={method === "email" ? "email" : "tel"}
                      value={identifierInput}
                      onChange={(e) => !locked && setIdentifierInput(e.target.value)}
                      placeholder={method === "email" ? t.emailPlaceholder : t.phonePlaceholder}
                      disabled={locked}
                      className={`w-full px-4 py-3 pr-10 rounded-xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 ${
                        locked ? "bg-storm/10 border-storm/20 text-storm/80 cursor-not-allowed" : "bg-white border-mist/40"
                      }`}
                    />
                    {locked && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-storm/60" aria-hidden>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  {locked && (
                    <button
                      type="button"
                      onClick={() => setShowChangeWarning(true)}
                      className="mt-2 font-caption text-sm underline hover:no-underline"
                      style={{ color: accent }}
                    >
                      {t.changeIdentity}
                    </button>
                  )}
                </div>
                {!locked && <p className="font-caption text-storm text-xs">{t.emailOrPhoneRequired}</p>}
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="pt-2 flex justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative flex items-center justify-center min-w-[200px] min-h-[72px] px-8 py-4 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:opacity-50 transition-all duration-200 border-0 cursor-pointer"
                    style={{
                      backgroundColor: accent,
                      maskImage: "url('/brand/cloud-blue.svg')",
                      maskSize: "contain",
                      maskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskImage: "url('/brand/cloud-blue.svg')",
                      WebkitMaskSize: "contain",
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                    }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center font-subheadline text-lg text-white pointer-events-none" style={{ color: cloud.joinTextHex ?? "#ffffff" }}>
                      {loading ? t.joining : t.ascend}
                    </span>
                  </button>
                </div>
              </>
            )}
          </form>
        </motion.div>
      </div>
      <CloudFooter />

      <AnimatePresence>
        {showChangeWarning && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowChangeWarning(false)}
          >
            <div className="absolute inset-0 bg-black/40" aria-hidden />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl p-6 shadow-xl"
              style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)" }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-body text-storm mb-6">{t.changeIdentityWarning}</p>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowChangeWarning(false)} className="px-4 py-2 rounded-xl font-caption text-storm border border-storm/30 hover:bg-storm/5">
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmChangeIdentity} className="px-4 py-2 rounded-xl font-caption text-white" style={{ backgroundColor: accent }}>
                  {t.changeIdentity}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
