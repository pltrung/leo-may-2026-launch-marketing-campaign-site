"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/components/LocaleProvider";
import { trackLead } from "@/lib/metaPixel";

export default function CorporateGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const locale = useLocale();
  const vi = locale === "vi";
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!companyName.trim() || !contactName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/gym/corporate-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim(),
          contact_name: contactName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Error");
        return;
      }
      trackLead();
      setSuccess(true);
    } catch {
      setError(vi ? "Lỗi mạng" : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (success) {
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setSuccess(false);
    }
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} />
          <motion.div
            className="relative w-full max-w-md rounded-2xl bg-[#12121a] border border-white/10 shadow-xl p-6"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <div className="text-center py-4">
                <p className="text-white/90">{vi ? "Cảm ơn — team sẽ liên hệ sớm." : "Thanks — we’ll reach out soon."}</p>
                <button type="button" onClick={handleClose} className="mt-4 px-5 py-2.5 rounded-full bg-white text-[#0B0B0F] font-medium text-sm">
                  OK
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
                  {vi ? "Doanh nghiệp / nhóm" : "Corporate / groups"}
                </h2>
                <p className="text-sm text-white/55 mb-4">
                  {vi
                    ? "Gói thẻ nhóm, team building, hoặc hợp tác — để lại thông tin."
                    : "Team passes, events, or partnerships — leave your details."}
                </p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={vi ? "Tên công ty / nhóm" : "Company / group name"}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/35"
                  />
                  <input
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={vi ? "Người liên hệ" : "Contact name"}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/35"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/35"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={vi ? "Điện thoại" : "Phone"}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/35"
                  />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={vi ? "Số người, ngày dự kiến…" : "Headcount, dates…"}
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/35"
                  />
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-white text-[#0B0B0F] font-semibold text-sm disabled:opacity-50"
                  >
                    {submitting ? "…" : vi ? "Gửi" : "Submit"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
