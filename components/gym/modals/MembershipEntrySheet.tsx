"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/ui/BottomSheet";
import ForgotPasswordModal from "@/components/gym/modals/ForgotPasswordModal";
import { useLocale } from "@/components/LocaleProvider";
import { useAuth } from "@/context/AuthContext";
import { getMessages } from "@/lib/messages";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { toE164 } from "@/lib/phoneE164";

type ClaimStatus = "idle" | "loading" | "not_found" | "has_account" | "rate_limit";
type SheetView = "main" | "claim" | "login" | "signup" | "signup_check_email" | "not_found" | "rate_limit" | "has_account";

const RESEND_COOLDOWN_SEC = 60;

interface MembershipEntrySheetProps {
  open: boolean;
  onClose: () => void;
}

export default function MembershipEntrySheet({ open, onClose }: MembershipEntrySheetProps) {
  const locale = useLocale();
  const router = useRouter();
  const { refresh } = useAuth();
  const m = getMessages(locale as "en" | "vi").gym.membershipEntry;
  const auth = getMessages(locale as "en" | "vi").auth;

  const [view, setView] = useState<SheetView>("main");
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimEmailOrPhone, setClaimEmailOrPhone] = useState("");
  const [claimPassword, setClaimPassword] = useState("");
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>("idle");
  const [claimError, setClaimError] = useState("");
  const [hasAccountEmail, setHasAccountEmail] = useState("");

  const [loginEmailOrPhone, setLoginEmailOrPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupGender, setSignupGender] = useState<"male" | "female" | "">("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupCheckEmail, setSignupCheckEmail] = useState(false);
  const [signupOtpCode, setSignupOtpCode] = useState("");
  const [signupVerifyLoading, setSignupVerifyLoading] = useState(false);
  const [signupAlreadyRegistered, setSignupAlreadyRegistered] = useState(false);
  const [signupRateLimitHit, setSignupRateLimitHit] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);

  const isEmail = (v: string) => /@/.test(v.trim());
  const isTestEmail = (e: string) =>
    /^ev\d+-.+@l$/.test(e.trim().toLowerCase()) || /^dummy2\d+@test\.local$/.test(e.trim().toLowerCase());

  useEffect(() => {
    if (resendCooldown <= 0 || view !== "signup_check_email") return;
    const interval = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown, view]);

  const resetClaim = useCallback(() => {
    setShowClaimForm(false);
    setClaimEmailOrPhone("");
    setClaimPassword("");
    setClaimStatus("idle");
    setClaimError("");
    setHasAccountEmail("");
  }, []);

  const goMain = useCallback(() => {
    setView("main");
    setResendCooldown(0);
    resetClaim();
    setLoginError("");
    setLoginPassword("");
    setSignupError("");
    setSignupCheckEmail(false);
    setSignupOtpCode("");
    setSignupAlreadyRegistered(false);
    setSignupRateLimitHit(false);
  }, [resetClaim]);

  const handleClose = useCallback(() => {
    goMain();
    onClose();
  }, [goMain, onClose]);

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
        setView("not_found");
        return;
      }
      if (res.status === 429 || /rate limit|too many requests/i.test((data as { error?: string }).error ?? "")) {
        setClaimStatus("rate_limit");
        setClaimError("");
        setView("rate_limit");
        return;
      }
      if (res.ok && (data as { hasAccount?: boolean }).hasAccount) {
        const emailForAccount = (data as { email?: string }).email ?? (isEmail(input) ? input.toLowerCase() : "");
        setHasAccountEmail(emailForAccount);
        // Test accounts: always try dev-bypass (magic link → dashboard). Server allows when env is set or Vercel preview.
        if (emailForAccount && isTestEmail(emailForAccount)) {
          const bypassRes = await fetch("/api/auth/dev-bypass-gym", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailForAccount, locale, origin: typeof window !== "undefined" ? window.location.origin : undefined }),
          });
          const bypassData = await bypassRes.json();
          const magicUrl = (bypassData?.url ?? bypassData?.magicLinkUrl) as string | undefined;
          if (bypassRes.ok && typeof magicUrl === "string") {
            window.location.href = magicUrl;
            return;
          }
        }
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
      handleClose();
      await refresh();
      router.replace(`/${locale}/dashboard`);
    } catch {
      setClaimError(auth.error);
      setClaimStatus("has_account");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const input = loginEmailOrPhone.trim();
    const isTest = isEmail(input) && isTestEmail(input);
    const isBypassAttempt = isTest && !loginPassword;
    if (!input) {
      setLoginError(auth.invalidCredentials);
      return;
    }
    if (!isBypassAttempt && !loginPassword) {
      setLoginError(auth.invalidCredentials);
      return;
    }
    setLoginLoading(true);
    try {
      // For test accounts, always try dev-bypass first (magic link, no password)
      if (isTest) {
        const res = await fetch("/api/auth/dev-bypass-gym", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: input.toLowerCase(),
            locale,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
          }),
        });
        const data = await res.json();
        if (res.ok && typeof data?.url === "string") {
          window.location.href = data.url;
          return;
        }
        setLoginError(res.status === 403 ? (auth.testAccountUseClaim ?? "Use Claim your account above to get a magic link.") : (data?.error || auth.error));
        setLoginLoading(false);
        return;
      }
      // Fall through for test accounts if dev-bypass returned 403 (env not set)
      if (isEmail(input)) {
        const email = input.toLowerCase();
        const supabase = getSupabaseBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: loginPassword });
        if (!signInError) {
          handleClose();
          await refresh();
          router.replace(`/${locale}/dashboard`);
          return;
        }
        const claimRes = await fetch("/api/auth/claim-waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, locale, origin: typeof window !== "undefined" ? window.location.origin : undefined }),
        });
        const claimData = await claimRes.json();
        const magicUrl = (claimData?.url ?? claimData?.magicLinkUrl) as string | undefined;
        if (claimRes.ok && typeof magicUrl === "string") {
          window.location.href = magicUrl;
          return;
        }
        if (claimRes.ok && claimData?.hasAccount) {
          setLoginError(auth.invalidCredentials);
        } else if (claimRes.status === 404) {
          setLoginError(auth.notInWaitlist);
        } else {
          setLoginError(claimData?.error || auth.error);
        }
      } else {
        const phone = toE164(input);
        const claimRes = await fetch("/api/auth/claim-waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, locale, origin: typeof window !== "undefined" ? window.location.origin : undefined }),
        });
        const claimData = await claimRes.json();
        const magicUrl2 = (claimData?.url ?? claimData?.magicLinkUrl) as string | undefined;
        if (claimRes.ok && typeof magicUrl2 === "string") {
          window.location.href = magicUrl2;
          return;
        }
        if (claimRes.ok && claimData?.hasAccount && claimData?.email) {
          const supabase = getSupabaseBrowserClient();
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: claimData.email,
            password: loginPassword,
          });
          if (!signInError) {
            handleClose();
            await refresh();
            router.replace(`/${locale}/dashboard`);
            return;
          }
        }
        setLoginError(claimRes.status === 404 ? auth.notInWaitlist : claimData?.error || auth.error);
      }
    } catch {
      setLoginError(auth.error);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");
    setSignupAlreadyRegistered(false);
    setSignupRateLimitHit(false);
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      setSignupError("Name, email and password required");
      return;
    }
    setSignupLoading(true);
    try {
      const trimmedEmail = signupEmail.trim().toLowerCase();
      const claimRes = await fetch("/api/auth/claim-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          locale,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        }),
      });
      const claimData = await claimRes.json();
      if (claimRes.ok && typeof (claimData as { url?: string }).url === "string") {
        window.location.href = (claimData as { url: string }).url;
        return;
      }
      if (claimRes.ok && (claimData as { hasAccount?: boolean }).hasAccount) {
        setSignupError(auth.signupAlreadyRegistered);
        setSignupAlreadyRegistered(true);
        setSignupLoading(false);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: signupPassword,
        options: { data: { full_name: signupName.trim(), phone: signupPhone.trim() || undefined } },
      });
      if (signUpError) {
        const msg = signUpError.message ?? "";
        if (/already registered|user already exists/i.test(msg)) {
          setSignupError(auth.signupAlreadyRegistered);
          setSignupAlreadyRegistered(true);
        } else if (/rate limit|too many requests/i.test(msg)) {
          setSignupError(auth.signupRateLimitMessage);
          setSignupRateLimitHit(true);
        } else {
          setSignupError(msg || auth.error);
        }
        setSignupLoading(false);
        return;
      }
      if (!data?.session?.access_token) {
        setSignupCheckEmail(true);
        setView("signup_check_email");
        setSignupLoading(false);
        return;
      }
      const res = await fetch("/api/member/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          full_name: signupName.trim(),
          email: trimmedEmail,
          phone: signupPhone.trim() || undefined,
          gender: signupGender === "male" || signupGender === "female" ? signupGender : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSignupError(err?.error || auth.error);
        setSignupLoading(false);
        return;
      }
      handleClose();
      await refresh();
      router.replace(`/${locale}/dashboard`);
    } catch {
      setSignupError(auth.error);
    } finally {
      setSignupLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    const supabase = getSupabaseBrowserClient();
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email: signupEmail.trim().toLowerCase() });
    if (resendError) {
      setSignupError(resendError.message);
      return;
    }
    setResendCooldown(RESEND_COOLDOWN_SEC);
    setSignupError("");
  }, [signupEmail, resendCooldown]);

  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const code = signupOtpCode.trim();
      if (!code) return;
      setSignupError("");
      setSignupVerifyLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const emailTrim = signupEmail.trim().toLowerCase();
        const { data, error: verifyErr } = await supabase.auth.verifyOtp({
          email: emailTrim,
          token: code,
          type: "signup",
        });
        if (verifyErr || !data?.session?.access_token) {
          setSignupError(auth.invalidCredentials);
          setSignupVerifyLoading(false);
          return;
        }
        const res = await fetch("/api/member/onboard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            full_name: signupName.trim(),
            email: emailTrim,
            phone: signupPhone.trim() || undefined,
            gender: signupGender === "male" || signupGender === "female" ? signupGender : undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          setSignupError(err?.error || auth.error);
          setSignupVerifyLoading(false);
          return;
        }
        handleClose();
        await refresh();
        router.replace(`/${locale}/dashboard`);
      } catch {
        setSignupError(auth.error);
      } finally {
        setSignupVerifyLoading(false);
      }
    },
    [signupOtpCode, signupEmail, signupName, signupPhone, signupGender, auth.error, auth.invalidCredentials, locale, handleClose, router]
  );

  const backButton = (
    <button type="button" onClick={goMain} className="sky-cta-secondary w-full py-3 rounded-full font-medium">
      Back
    </button>
  );

  const renderContent = () => {
    if (view === "login") {
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--sky-text-primary)]" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
            {auth.loginTitle}
          </h2>
          <p className="text-[var(--sky-text-secondary)] text-sm">{auth.loginSubtitle}</p>
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <input
              type="text"
              inputMode="email"
              name="username"
              autoComplete="username"
              placeholder={auth.emailOrPhone}
              value={loginEmailOrPhone}
              onChange={(e) => setLoginEmailOrPhone(e.target.value)}
              className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
            />
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder={auth.password}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
            />
            {isEmail(loginEmailOrPhone) && isTestEmail(loginEmailOrPhone) && (
              <p className="text-xs text-[var(--sky-text-secondary)]">Pre-launch test account: click Login to get magic link (no password needed).</p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setForgotPasswordModalOpen(true)}
                className="text-[var(--sky-text-secondary)] text-sm hover:text-[var(--sky-text-primary)]"
              >
                {auth.forgotPassword}
              </button>
            </div>
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="sky-cta-primary w-full py-3 rounded-full font-medium disabled:opacity-60">
              {loginLoading ? "…" : auth.login}
            </button>
          </form>
          {backButton}
        </section>
      );
    }

    if (view === "signup" || view === "signup_check_email") {
      if (view === "signup_check_email") {
        return (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--sky-text-primary)]" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
              {auth.signupCheckEmailTitle}
            </h2>
            <p className="text-[var(--sky-text-secondary)] text-sm">{auth.signupConfirmEmail}</p>
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <p className="text-[var(--sky-text-secondary)] text-sm">
                {auth.otpSubtitle.replace("{email}", signupEmail.trim() || "")}
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={auth.codePlaceholder}
                value={signupOtpCode}
                onChange={(e) => setSignupOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)] text-center tracking-[0.4em] font-mono text-lg"
                maxLength={6}
              />
              {signupError && <p className="text-red-400 text-sm">{signupError}</p>}
              <button
                type="submit"
                disabled={signupVerifyLoading || signupOtpCode.trim().length < 4}
                className="sky-cta-primary w-full py-3 rounded-full font-medium disabled:opacity-60"
              >
                {signupVerifyLoading ? "…" : auth.otpVerify}
              </button>
            </form>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="sky-cta-secondary w-full py-3 rounded-full font-medium disabled:opacity-50"
            >
              {resendCooldown > 0 ? auth.signupResendCooldown.replace("{seconds}", String(resendCooldown)) : auth.signupResendCode}
            </button>
            <button type="button" onClick={() => setView("login")} className="sky-cta-secondary w-full py-3 rounded-full font-medium">
              {auth.login}
            </button>
            {backButton}
          </section>
        );
      }
      return (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--sky-text-primary)]" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
            {auth.signupTitle}
          </h2>
          <p className="text-[var(--sky-text-secondary)] text-sm">{auth.signupSubtitle}</p>
          <form onSubmit={handleSignupSubmit} className="space-y-3">
            <input
              type="text"
              name="name"
              autoComplete="name"
              placeholder={auth.name}
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
              className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
            />
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder={auth.email}
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
            />
            <input
              type="tel"
              name="tel"
              autoComplete="tel"
              placeholder={auth.phone}
              value={signupPhone}
              onChange={(e) => setSignupPhone(e.target.value)}
              className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
            />
            <div>
              <label className="block text-sm text-[var(--sky-text-secondary)] mb-1.5">{auth.gender}</label>
              <select
                value={signupGender}
                onChange={(e) => setSignupGender((e.target.value || "") as "male" | "female" | "")}
                className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)]"
              >
                <option value="">—</option>
                <option value="male">{auth.genderMale}</option>
                <option value="female">{auth.genderFemale}</option>
              </select>
            </div>
            <input
              type="password"
              name="new-password"
              autoComplete="new-password"
              placeholder={auth.password}
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
            />
            {signupError && <p className="text-red-400 text-sm">{signupError}</p>}
            <button type="submit" disabled={signupLoading} className="sky-cta-primary w-full py-3 rounded-full font-medium disabled:opacity-60">
              {signupLoading ? "…" : auth.signup}
            </button>
            {(signupAlreadyRegistered || signupRateLimitHit) && (
              <button type="button" onClick={() => setView("login")} className="sky-cta-secondary w-full py-3 rounded-full font-medium">
                {auth.signupGoToLogin}
              </button>
            )}
            {backButton}
          </form>
        </section>
      );
    }

    if (view === "not_found") {
      return (
        <section className="space-y-3">
          <p className="text-[var(--sky-text-secondary)] text-sm">{m.claimNotFound ?? auth.claimNotFound}</p>
          <button type="button" onClick={() => setView("signup")} className="sky-cta-primary w-full py-3 rounded-full font-medium">
            {m.createAccount}
          </button>
          {backButton}
        </section>
      );
    }

    if (view === "rate_limit") {
      return (
        <section className="space-y-3">
          <p className="text-[var(--sky-text-secondary)] text-sm">We hit an email send limit. Please wait a bit or use Login.</p>
          <button type="button" onClick={() => setView("login")} className="sky-cta-primary w-full py-3 rounded-full font-medium">
            {auth.login}
          </button>
          {backButton}
        </section>
      );
    }

    if (claimStatus === "has_account" || (claimStatus === "loading" && hasAccountEmail)) {
      const handleGetMagicLink = async () => {
        if (!hasAccountEmail || !isTestEmail(hasAccountEmail)) return;
        setClaimError("");
        setClaimStatus("loading");
        try {
          const res = await fetch("/api/auth/dev-bypass-gym", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: hasAccountEmail, locale, origin: typeof window !== "undefined" ? window.location.origin : undefined }),
          });
          const data = await res.json();
          if (res.ok && typeof data?.url === "string") {
            window.location.href = data.url;
            return;
          }
          setClaimError(res.status === 403 ? (auth.testAccountUseClaim ?? "Dev bypass not enabled. Set NEXT_PUBLIC_DEV_BYPASS_OTP=true.") : (data?.error || auth.error));
        } catch {
          setClaimError(auth.error);
        } finally {
          setClaimStatus("has_account");
        }
      };
      return (
        <div className="space-y-3">
          <p className="text-[var(--sky-text-secondary)] text-sm">{auth.claimAlreadyHaveAccount}</p>
          {hasAccountEmail && isTestEmail(hasAccountEmail) && (
            <button
              type="button"
              onClick={handleGetMagicLink}
              disabled={claimStatus === "loading"}
              className="sky-cta-primary w-full py-3 rounded-full font-medium disabled:opacity-60"
            >
              {claimStatus === "loading" ? "…" : (auth.prelaunchVerify ?? "Verify with email / Get magic link")}
            </button>
          )}
          <form onSubmit={handleHasAccountLogin} className="space-y-3">
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
            <button type="button" onClick={() => { setClaimStatus("idle"); setHasAccountEmail(""); setClaimPassword(""); }} className="sky-cta-secondary w-full py-3 rounded-full font-medium">
              Back
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <section>
          <p className="text-[var(--sky-text-secondary)] text-sm mb-3" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
            {m.prelaunch}
          </p>
          {!showClaimForm && claimStatus !== "not_found" && claimStatus !== "rate_limit" && (
            <button type="button" onClick={() => setShowClaimForm(true)} className="sky-cta-primary w-full py-3 rounded-full font-medium">
              {m.claimAccount}
            </button>
          )}
          {showClaimForm && claimStatus !== "not_found" && claimStatus !== "rate_limit" && (
            <form onSubmit={handleClaimSubmit} className="space-y-3">
              <input
                type="text"
                inputMode="email"
                name="username"
                autoComplete="username"
                placeholder={auth.emailOrPhone}
                value={claimEmailOrPhone}
                onChange={(e) => setClaimEmailOrPhone(e.target.value)}
                className="sky-input w-full px-4 py-3 rounded-xl border border-[var(--sky-glass-border)] bg-white/5 text-[var(--sky-text-primary)] placeholder-[var(--sky-text-secondary)]"
              />
              {claimError && <p className="text-red-400 text-sm">{claimError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowClaimForm(false); resetClaim(); }} className="sky-cta-secondary flex-1 py-3 rounded-full font-medium">
                  Back
                </button>
                <button type="submit" disabled={claimStatus === "loading"} className="sky-cta-primary flex-1 py-3 rounded-full font-medium disabled:opacity-60">
                  {claimStatus === "loading" ? "…" : (m.claimContinue ?? auth.claimContinue)}
                </button>
              </div>
            </form>
          )}
        </section>

        {claimStatus !== "not_found" && claimStatus !== "rate_limit" && !(claimStatus === "loading" && hasAccountEmail) && (
          <section>
            <p className="text-[var(--sky-text-secondary)] text-sm mb-3" style={{ fontFamily: "MiSans-Regular, sans-serif" }}>
              {m.newHere}
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setView("login")} className="sky-cta-secondary w-full py-3 rounded-full font-medium">
                {m.login}
              </button>
              <button type="button" onClick={() => setView("signup")} className="sky-cta-primary w-full py-3 rounded-full font-medium">
                {m.createAccount}
              </button>
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <>
      <BottomSheet open={open} onClose={handleClose} title={m.headline}>
        {renderContent()}
      </BottomSheet>
      <ForgotPasswordModal
        open={forgotPasswordModalOpen}
        onClose={() => setForgotPasswordModalOpen(false)}
      />
    </>
  );
}
