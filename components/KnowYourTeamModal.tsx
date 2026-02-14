"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { findUserByEmailOrPhone } from "@/lib/userStorage";

interface KnowYourTeamModalProps {
  onClose: () => void;
}

export default function KnowYourTeamModal({ onClose }: KnowYourTeamModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotFound(false);
    const eTrim = email.trim();
    const pTrim = phone.trim();
    if (!eTrim && !pTrim) {
      setError("Email or phone is required");
      return;
    }

    setLoading(true);
    try {
      const user = findUserByEmailOrPhone(eTrim || undefined, pTrim || undefined);
      if (user) {
        router.push("/countdown");
        onClose();
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-storm/40 backdrop-blur-sm" aria-hidden />
      <motion.div
        className="relative w-full max-w-md rounded-2xl shadow-2xl p-8 bg-white/95"
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

        <h3 className="font-subheadline text-xl text-storm mb-2">Know your team?</h3>
        <p className="font-caption text-storm/70 text-sm mb-6">
          Enter your email or phone to see your cloud.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="kyt-email" className="font-caption block text-sm text-storm mb-1">Email</label>
            <input
              id="kyt-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-white border border-mist/60 focus:outline-none focus:ring-2 focus:ring-storm/30 focus:border-storm/50"
            />
          </div>
          <div>
            <label htmlFor="kyt-phone" className="font-caption block text-sm text-storm mb-1">Phone</label>
            <input
              id="kyt-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+84 xxx xxx xxx"
              className="w-full px-4 py-3 rounded-xl bg-white border border-mist/60 focus:outline-none focus:ring-2 focus:ring-storm/30 focus:border-storm/50"
            />
          </div>
          <p className="font-caption text-mist text-xs">* Email or phone required</p>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {notFound && (
            <p className="font-body text-storm/90 text-sm">
              We couldn&apos;t find your cloud yet.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-storm text-white font-subheadline hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Checking…" : "Find my team"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
