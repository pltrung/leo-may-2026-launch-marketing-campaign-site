"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CloudPersonality } from "@/lib/cloudData";

interface SignupModalProps {
  cloud: CloudPersonality | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SignupModal({
  cloud,
  onClose,
  onSuccess,
}: SignupModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          cloud_type: cloud.id,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!cloud) return null;

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
          className="relative w-full max-w-md bg-cloud rounded-2xl shadow-xl p-8 border-t-4"
          style={{ borderTopColor: cloud.accentHex }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-mist hover:text-storm rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h3 className="font-display text-xl text-storm mb-1">{cloud.name}</h3>
          <p className="text-mist text-sm mb-6">{cloud.mood}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-storm mb-1">
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl border border-mist/60 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage/30 transition-colors"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-storm mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-mist/60 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage/30 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-storm mb-1">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+84 xxx xxx xxx"
                className="w-full px-4 py-3 rounded-xl border border-mist/60 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage/30 transition-colors"
              />
            </div>
            <p className="text-mist text-xs">* Email or phone required</p>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl hover:opacity-90 disabled:opacity-50 text-white font-medium transition-colors ${cloud.accentClass}`}
            >
              {loading ? "Joining…" : "Join Waitlist"}
            </button>
          </form>
        </motion.div>
      </motion.div>
  );
}
