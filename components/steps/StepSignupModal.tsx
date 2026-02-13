"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CloudType } from "@/lib/cloudData";

interface StepSignupModalProps {
  cloudType: CloudType;
  onClose: () => void;
  onSuccess: (position: number) => void;
}

const springPanel = { type: "spring" as const, stiffness: 300, damping: 24, mass: 0.8 };

export default function StepSignupModal({
  cloudType,
  onClose,
  onSuccess,
}: StepSignupModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Name is required");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setErrorMessage("Email or phone is required");
      return;
    }
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          cloud_type: cloudType,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      onSuccess(data.position);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <motion.div
      key="signupModal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={springPanel}
        className="leo-card leo-card-glow relative w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-[0_0_40px_rgba(2,66,255,0.12),0_25px_50px_-12px_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#6b7280] hover:text-[#1a1d21] rounded-full p-1"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="font-leo text-xl font-semibold text-[#1a1d21]"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          Join the Founding Circle
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="font-leo mt-1 text-sm text-[#0242FF]/80"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          Be among the first when Leo Mây opens in HCMC.
        </motion.p>

        <form onSubmit={handleSubmit} className="font-leo mt-6 space-y-4" style={{ fontFamily: "var(--font-leo)" }}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#4a4d52]">
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="leo-input mt-1 w-full px-4 py-3.5 text-[#1a1d21] placeholder-[#6b7280]/70 rounded-xl"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#4a4d52]">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="leo-input mt-1 w-full px-4 py-3.5 text-[#1a1d21] placeholder-[#6b7280]/70 rounded-xl"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-[#4a4d52]">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="leo-input mt-1 w-full px-4 py-3.5 text-[#1a1d21] placeholder-[#6b7280]/70 rounded-xl"
              placeholder="+84 xxx xxx xxx"
            />
          </div>
          <p className="text-xs text-[#6b7280]">* Email or phone required</p>

          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}

          <motion.button
            type="submit"
            disabled={status === "loading"}
            whileHover={status !== "loading" ? { scale: 1.02, y: -1 } : undefined}
            whileTap={status !== "loading" ? { scale: 0.98 } : undefined}
            className="font-leo leo-btn-primary mt-6 w-full rounded-2xl py-4 text-base disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-leo)" }}
          >
            {status === "loading" ? "Joining…" : "Join Waitlist"}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}
