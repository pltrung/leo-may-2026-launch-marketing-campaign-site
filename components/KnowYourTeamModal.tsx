"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useWaitlistIdentity } from "@/lib/useWaitlistIdentity";
import { getCloudById, type CloudType } from "@/lib/cloudData";
import { toE164 } from "@/lib/phoneE164";
import { normalizeEmail } from "@/lib/emailNormalize";
import { getMessages } from "@/lib/messages";
import type { Locale } from "@/lib/i18n";

interface KnowYourTeamModalProps {
  onClose: () => void;
  onFoundTeam?: () => void;
  locale?: Locale;
}

type IdMethod = "email" | "phone";

export default function KnowYourTeamModal({ onClose, onFoundTeam, locale = "en" }: KnowYourTeamModalProps) {
  const router = useRouter();
  const t = getMessages(locale).knowYourCloud;
  const { user: storedUser, locked, setLockedIdentity } = useWaitlistIdentity();

  const [step, setStep] = useState<0 | 1>(0);
  const [method, setMethod] = useState<IdMethod>("email");
  const [identifierInput, setIdentifierInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (locked && storedUser) setStep(1);
  }, [locked, storedUser]);

  const handleFindTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotFound(false);
    const raw = identifierInput.trim();
    if (!raw) {
      setError(t.emailOrPhoneRequired.replace("* ", "").replace(/\.$/, ""));
      return;
    }

    const identifier = method === "email" ? normalizeEmail(raw.toLowerCase()) : toE164(raw);
    if (!identifier) {
      setError(t.emailOrPhoneRequired.replace("* ", "").replace(/\.$/, ""));
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (method === "email") params.set("email", identifier);
      else params.set("phone", identifier);
      const res = await fetch(`/api/waitlist/lookup?${params}`);
      const json = await res.json();
      const u = json?.user;

      if (u?.team) {
        setLockedIdentity({
          identifier,
          identifier_type: method,
          name: u.name || "Member",
          team: u.team,
          referralCode: u.referralCode,
        });
        if (onFoundTeam) {
          onFoundTeam();
        } else {
          router.push(`/${locale}/countdown`);
        }
        onClose();
      } else {
        setNotFound(true);
      }
    } catch {
      setError(t.notFound);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToCountdown = () => {
    if (onFoundTeam) onFoundTeam();
    else router.push(`/${locale}/countdown`);
    onClose();
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const modal = (
    <motion.div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ minHeight: "100dvh" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-storm/40 backdrop-blur-sm" aria-hidden />
      <motion.div
        className="relative w-full max-w-md min-w-0 rounded-2xl shadow-2xl p-5 sm:p-8 bg-white my-auto max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
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

        {locked && storedUser ? (
          <div className="space-y-4">
            <p className="font-caption text-storm/70 text-sm mb-4">{t.enterEmailPhone}</p>
            <p className="font-body text-storm/90">
              You are on <strong>Team {getCloudById(storedUser.team as CloudType)?.name ?? storedUser.team}</strong>.
            </p>
            <button
              type="button"
              onClick={handleGoToCountdown}
              className="w-full py-3 rounded-xl bg-storm text-white font-subheadline hover:opacity-90"
            >
              Go to countdown
            </button>
          </div>
        ) : (
          <>
            {step === 0 && (
              <>
                <p className="font-caption text-storm/70 text-sm mb-4">{t.enterEmailPhone}</p>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="kyt-method" checked={method === "email"} onChange={() => setMethod("email")} className="w-4 h-4" />
                    <span className="font-caption text-storm">Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="kyt-method" checked={method === "phone"} onChange={() => setMethod("phone")} className="w-4 h-4" />
                    <span className="font-caption text-storm">Phone</span>
                  </label>
                </div>
                <button type="button" onClick={() => setStep(1)} className="w-full py-3 rounded-xl bg-storm text-white font-subheadline hover:opacity-90">
                  Next
                </button>
              </>
            )}
            {step === 1 && (
              <form onSubmit={handleFindTeam} className="space-y-4 min-w-0">
                <p className="font-caption text-storm/70 text-sm mb-4">{t.enterEmailPhone}</p>
                <div className="min-w-0">
                  <label htmlFor="kyt-identifier" className="font-caption block text-sm text-storm mb-1">
                    {method === "email" ? "Email" : "Phone"}
                  </label>
                  <input
                    id="kyt-identifier"
                    type={method === "email" ? "email" : "tel"}
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    placeholder={method === "email" ? "you@example.com" : "+84"}
                    className="w-full min-w-0 box-border px-4 py-3 rounded-xl bg-white border border-mist/60 focus:outline-none focus:ring-2 focus:ring-storm/30"
                  />
                </div>
                <p className="font-caption text-storm text-xs">{t.emailOrPhoneRequired}</p>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {notFound && <p className="font-body text-storm/90 text-sm">{t.notFound}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(0)} className="px-4 py-2 rounded-xl font-caption text-storm border border-storm/30">
                    Back
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-storm text-white font-subheadline hover:opacity-90 disabled:opacity-50">
                    {loading ? t.checking : t.findMyTeam}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
