"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CloudType } from "@/lib/cloudData";

interface SignupViewProps {
  cloudType: CloudType;
  initialName?: string;
  onClose: () => void;
  onSuccess: (position: number) => void;
}

export default function SignupView({
  cloudType,
  initialName = "",
  onClose,
  onSuccess,
}: SignupViewProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Name is required");
      setStatus("error");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setErrorMessage("Email or phone is required");
      setStatus("error");
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
      className="fixed inset-0 z-20 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      <motion.div
        className="relative z-10 w-full max-w-md p-8 rounded-3xl"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
        }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2
          className="text-xl font-light text-white/95"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          Join the Founding Circle
        </h2>
        <p className="mt-1 text-sm text-white/50" style={{ fontFamily: "var(--font-leo)" }}>
          Be among the first when Leo Mây opens in HCMC.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="leo-name"
              className="block text-xs text-white/60 uppercase tracking-wider mb-2"
              style={{ fontFamily: "var(--font-leo)" }}
            >
              Name
            </label>
            <input
              id="leo-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-white/25 transition-colors"
              style={{ fontFamily: "var(--font-leo)" }}
            />
          </div>
          <div>
            <label
              htmlFor="leo-email"
              className="block text-xs text-white/60 uppercase tracking-wider mb-2"
              style={{ fontFamily: "var(--font-leo)" }}
            >
              Email
            </label>
            <input
              id="leo-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-white/25 transition-colors"
              style={{ fontFamily: "var(--font-leo)" }}
            />
          </div>
          <div>
            <label
              htmlFor="leo-phone"
              className="block text-xs text-white/60 uppercase tracking-wider mb-2"
              style={{ fontFamily: "var(--font-leo)" }}
            >
              Phone
            </label>
            <input
              id="leo-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+84 xxx xxx xxx"
              className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-white/25 transition-colors"
              style={{ fontFamily: "var(--font-leo)" }}
            />
          </div>
          <p className="text-xs text-white/40">* Email or phone required</p>

          {errorMessage && (
            <p className="text-sm text-amber-300/90">{errorMessage}</p>
          )}

          <motion.button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-4 rounded-full text-white text-sm font-medium tracking-wider transition-all disabled:opacity-50"
            style={{
              fontFamily: "var(--font-leo)",
              background: "#0242FF",
              boxShadow: "0 0 40px rgba(2,66,255,0.25)",
            }}
            whileHover={status !== "loading" ? { scale: 1.01 } : undefined}
            whileTap={status !== "loading" ? { scale: 0.99 } : undefined}
          >
            {status === "loading" ? "Joining…" : "Join Waitlist"}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}
