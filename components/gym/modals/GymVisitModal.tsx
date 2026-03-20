"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMessages } from "@/lib/messages";
import { useLocale } from "@/components/LocaleProvider";
import { trackLead } from "@/lib/metaPixel";

interface GymVisitModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GymVisitModal({ open, onClose }: GymVisitModalProps) {
  const locale = useLocale();
  const m = getMessages(locale).gym.visitModal;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/gym/visit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          preferred_date: preferredDate.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? m.error);
        return;
      }
      trackLead();
      setSuccess(true);
    } catch {
      setError(m.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (success) {
      setName("");
      setEmail("");
      setPhone("");
      setPreferredDate("");
      setMessage("");
      setSuccess(false);
    }
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="visit-modal-title">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="relative w-full max-w-md rounded-2xl bg-[#12121a] border border-white/10 shadow-xl p-6"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <div className="text-center py-4">
                <p className="text-white/90 text-lg font-medium">{m.success}</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-4 px-5 py-2.5 rounded-full bg-white text-[#0B0B0F] font-medium text-sm"
                >
                  {m.backToSky}
                </button>
              </div>
            ) : (
              <>
                <h2 id="visit-modal-title" className="text-xl font-bold text-white mb-4" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
                  {m.title}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder={m.name}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm"
                  />
                  <input
                    type="email"
                    required
                    placeholder={m.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm"
                  />
                  <input
                    type="tel"
                    placeholder={m.phone}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm"
                  />
                  <input
                    type="text"
                    placeholder={m.preferredDate}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm"
                  />
                  <textarea
                    placeholder={m.message}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm resize-none"
                  />
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 px-4 py-2.5 rounded-full border border-white/40 text-white/90 text-sm font-medium"
                    >
                      {m.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 rounded-full bg-white text-[#0B0B0F] text-sm font-medium disabled:opacity-60"
                    >
                      {submitting ? "…" : m.submit}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
