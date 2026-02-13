"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CloudType } from "@/lib/cloudData";

interface StepSignupModalProps {
  cloudType: CloudType;
  initialName?: string;
  onClose: () => void;
  onSuccess: (position: number) => void;
}

const springPanel = { type: "spring" as const, stiffness: 280, damping: 26 };

export default function StepSignupModal({
  cloudType,
  initialName = "",
  onClose,
  onSuccess,
}: StepSignupModalProps) {
  const [name, setName] = useState(initialName);
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
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-20 flex items-center justify-center p-4"
      style={{ width: "100vw", height: "100vh" }}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      {/* Soft cloud panel — no sharp card, organic shape */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={springPanel}
        className="leo-signup-panel relative w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/60 hover:text-white/90 rounded-full p-1 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-leo text-xl sm:text-2xl font-semibold text-white/95"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          Join the Founding Circle
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="font-leo mt-1 text-sm text-white/70"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          Be among the first when Leo Mây opens in HCMC.
        </motion.p>

        <form onSubmit={handleSubmit} className="font-leo mt-6 space-y-4" style={{ fontFamily: "var(--font-leo)" }}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white/80">
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="leo-input-cloud mt-1 w-full px-4 py-3.5 text-white placeholder-white/40"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/80">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="leo-input-cloud mt-1 w-full px-4 py-3.5 text-white placeholder-white/40"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-white/80">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="leo-input-cloud mt-1 w-full px-4 py-3.5 text-white placeholder-white/40"
              placeholder="+84 xxx xxx xxx"
            />
          </div>
          <p className="text-xs text-white/50">* Email or phone required</p>

          {errorMessage && (
            <p className="text-sm text-amber-200/90">{errorMessage}</p>
          )}

          <motion.button
            type="submit"
            disabled={status === "loading"}
            whileHover={status !== "loading" ? { scale: 1.02, y: -1 } : undefined}
            whileTap={status !== "loading" ? { scale: 0.98 } : undefined}
            className="leo-btn-enter font-leo mt-6 w-full py-4 text-base font-semibold text-[#0242FF] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-leo)" }}
          >
            {status === "loading" ? "Joining…" : "Join Waitlist"}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}
