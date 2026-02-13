"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CloudType } from "@/lib/cloudData";

interface StepSignupModalProps {
  cloudType: CloudType;
  onClose: () => void;
  onSuccess: (position: number) => void;
}

const springModal = { type: "spring" as const, stiffness: 300, damping: 24, mass: 0.8 };

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-[#1a1d21]/55 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={springModal}
        className="leo-card leo-card-glow relative max-w-md rounded-3xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#6b7280] hover:text-[#1a1d21]"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-leo text-xl font-semibold text-[#1a1d21]"
        >
          Join the Founding Circle
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mt-1 text-sm text-[#6b7280]"
        >
          Be among the first when Leo Mây opens in HCMC.
        </motion.p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              className="leo-input mt-1 w-full px-4 py-3.5 text-[#1a1d21] placeholder-[#6b7280]/70"
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
              className="leo-input mt-1 w-full px-4 py-3.5 text-[#1a1d21] placeholder-[#6b7280]/70"
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
              className="leo-input mt-1 w-full px-4 py-3.5 text-[#1a1d21] placeholder-[#6b7280]/70"
              placeholder="+84 xxx xxx xxx"
            />
          </div>
          <p className="text-xs text-[#6b7280]">* Email or phone required</p>

          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="leo-btn-primary mt-6 w-full rounded-2xl py-4 text-base disabled:opacity-60 disabled:transform-none disabled:hover:shadow-none"
          >
            {status === "loading" ? "Joining..." : "Join Waitlist"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
