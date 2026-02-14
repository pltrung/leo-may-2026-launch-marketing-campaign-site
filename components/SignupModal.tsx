"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CloudPersonality } from "@/lib/cloudData";
import { saveUser } from "@/lib/userStorage";

interface SignupModalProps {
  cloud: CloudPersonality | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConfirmationData {
  position: number;
  teamCount: number;
  totalCount: number;
  percentage: number;
}

export default function SignupModal({
  cloud,
  onClose,
  onSuccess,
}: SignupModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  const [redirectCount, setRedirectCount] = useState(8);

  useEffect(() => {
    if (!confirmation) return;
    if (redirectCount <= 0) {
      onSuccess();
      router.push("/countdown");
      return;
    }
    const t = setTimeout(() => setRedirectCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [confirmation, redirectCount, onSuccess, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("Email or phone is required");
      return;
    }
    if (!cloud) return;

    setLoading(true);
    const userData = {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      team: cloud.id,
      timestamp: Date.now(),
    };
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...userData,
          cloud_type: cloud.id,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      saveUser(userData);
      setConfirmation({
        position: data.position ?? 1,
        teamCount: data.teamCount ?? 1,
        totalCount: data.totalCount ?? 1,
        percentage: data.percentage ?? 100,
      });
      setRedirectCount(8);
    } catch (err) {
      saveUser(userData);
      setConfirmation({
        position: 1,
        teamCount: 1,
        totalCount: 1,
        percentage: 100,
      });
      setRedirectCount(8);
    } finally {
      setLoading(false);
    }
  };

  if (!cloud) return null;

  const accent = cloud.accentHex;

  // Confirmation screen
  if (confirmation) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-storm/40 backdrop-blur-sm"
          aria-hidden
        />
        <motion.div
          className="relative w-full max-w-md rounded-2xl shadow-2xl p-8 text-center"
          style={{
            backgroundColor: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            className="font-subheadline text-2xl sm:text-3xl mb-4"
            style={{ color: accent }}
          >
            Welcome to Team {cloud.name} — {cloud.nameEn}.
          </h3>
          <p className="font-subheadline mb-2 text-lg sm:text-xl" style={{ color: accent }}>
            You are #{confirmation.position} in the waitlist.
          </p>
          <p className="font-body text-base mb-6" style={{ color: accent, opacity: 0.8 }}>
            {confirmation.percentage}% of members chose this cloud.
          </p>
          <p className="font-caption text-storm/80 text-sm">
            Stay tuned. Something is forming in the clouds.
          </p>
          <p className="font-caption text-sm mt-4" style={{ color: accent, textShadow: `0 0 12px ${accent}60` }}>
            Redirecting in <span style={{ color: accent, fontWeight: 600 }}>{redirectCount}</span>…
          </p>
        </motion.div>
      </motion.div>
    );
  }

  // Form screen
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-storm/40 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        className="relative w-full max-w-md rounded-2xl shadow-2xl p-8"
        style={{
          backgroundColor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderTop: `4px solid ${accent}`,
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
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
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3
          className="font-subheadline text-xl sm:text-2xl mb-1"
          style={{ color: accent }}
        >
          You are about to join Team {cloud.name} — {cloud.nameEn}.
        </h3>
        <p className="font-caption text-storm/80 text-sm mb-6">
          Fill your place in the team.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" style={{ ["--accent" as string]: accent } as React.CSSProperties}>
          <div>
            <label
              htmlFor="name"
              className="font-caption block text-sm text-storm mb-1"
            >
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl bg-white border border-mist/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 focus:border-[var(--accent)] transition-all"
              style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06)" }}
              required
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="font-caption block text-sm text-storm mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-white border border-mist/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 focus:border-[var(--accent)] transition-all"
              style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06)" }}
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="font-caption block text-sm text-storm mb-1"
            >
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+84 xxx xxx xxx"
              className="w-full px-4 py-3 rounded-xl bg-white border border-mist/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 focus:border-[var(--accent)] transition-all"
              style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06)" }}
            />
          </div>
          <p className="font-caption text-mist text-xs">* Email or phone required</p>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Cloud-shaped Join button */}
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
              <span
                className="absolute inset-0 flex items-center justify-center font-subheadline text-lg text-white pointer-events-none"
                style={{ color: cloud.joinTextHex ?? "#ffffff" }}
              >
                {loading ? "Joining…" : "Ascend"}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
