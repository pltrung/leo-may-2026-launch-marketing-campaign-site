"use client";

import React, { useState } from "react";
import { getMessages } from "@/lib/messages";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { WAIVER_TEXT } from "@/lib/waiverText";
import WaiverSignaturePad from "@/components/waiver/WaiverSignaturePad";

type SignatureMode = "typed" | "drawn";

interface WaiverModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locale: "en" | "vi";
  defaultFullName?: string;
  accessToken?: string | null;
}

export default function WaiverModal({ open, onClose, onSuccess, locale, defaultFullName = "", accessToken }: WaiverModalProps) {
  const m = getMessages(locale).waiver;
  const [fullName, setFullName] = useState(defaultFullName);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("typed");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [canSign, setCanSign] = useState(false);

  const handleWaiverScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 5) setHasScrolledToBottom(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !agreed) {
      setError("Full name and agreement required");
      return;
    }
    const signatureValue = signatureMode === "typed" ? (signature.trim() || null) : drawnSignature;
    if (!signatureValue) {
      setError("Signature is required");
      return;
    }
    setSubmitting(true);
    try {
      let token = accessToken ?? null;
      if (!token) {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token ?? null;
      }
      if (!token) {
        setError("Session expired");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/member/waiver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          agreed: true,
          signature_data: signatureValue,
          waiver_text: WAIVER_TEXT,
        }),
      });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { error?: string }) : {};
      if (!res.ok) {
        setError(data?.error || "Failed to save");
        setSubmitting(false);
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#12121a] border border-white/10 shadow-xl overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-white/60 hover:text-white text-sm"
        >
          ✕
        </button>
        <h2 className="text-lg font-bold text-white px-6 pt-6 pb-2" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
          Climbing Activity Waiver
        </h2>

        {!canSign ? (
          <>
            <div
              className="waiver-container flex-1 min-h-0 text-sm text-white/90 rounded-lg mx-4 mb-2 bg-black/40 border border-white/10"
              onScroll={handleWaiverScroll}
            >
              {WAIVER_TEXT.split("\n\n").map((block, idx) => (
                <p key={idx} className="mb-3 px-4 pt-4 whitespace-pre-wrap leading-relaxed">
                  {block.trim()}
                </p>
              ))}
            </div>
            {!hasScrolledToBottom && (
              <p className="px-6 text-xs text-white/70 mb-2">
                Please scroll to the bottom of the waiver before signing.
              </p>
            )}
            <div className="px-6 pb-6 flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-full border border-white/40 text-white/90 text-sm">
                Close
              </button>
              <button
                type="button"
                disabled={!hasScrolledToBottom}
                onClick={() => {
                  if (!hasScrolledToBottom) return;
                  setAgreed(true);
                  setCanSign(true);
                }}
                className="px-5 py-2 rounded-full bg-white text-[#0B0B0F] text-sm font-medium disabled:opacity-50"
              >
                Agree & Sign Waiver
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 pb-6 overflow-y-auto">
            <input
              id="waiver-modal-full-name"
              type="text"
              placeholder={m.fullName}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
            />
            <label className="flex items-center gap-2 text-white/90 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="rounded"
              />
              {m.agreement}
            </label>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/70">
                <span>{m.signature}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSignatureMode("typed")}
                    className={`px-3 py-1 rounded-full border text-xs ${signatureMode === "typed" ? "bg-white text-[#0B0B0F] border-white" : "border-white/40 text-white/80 hover:bg-white/10"}`}
                  >
                    Type
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureMode("drawn")}
                    className={`px-3 py-1 rounded-full border text-xs ${signatureMode === "drawn" ? "bg-white text-[#0B0B0F] border-white" : "border-white/40 text-white/80 hover:bg-white/10"}`}
                  >
                    Draw
                  </button>
                </div>
              </div>
              {signatureMode === "typed" ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Type your full name as signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                  />
                  <button type="button" onClick={() => setSignature(fullName.trim())} className="text-xs text-white/70 hover:text-white underline">
                    Use full name as signature
                  </button>
                </div>
              ) : (
                <WaiverSignaturePad onChange={setDrawnSignature} />
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full py-3 rounded-full bg-white text-[#0B0B0F] font-medium disabled:opacity-60">
              {submitting ? "…" : m.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
