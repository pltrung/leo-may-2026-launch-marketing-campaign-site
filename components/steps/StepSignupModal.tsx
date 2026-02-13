"use client";

import { useState } from "react";
import { CloudType } from "@/lib/cloudData";

interface StepSignupModalProps {
  cloudType: CloudType;
  onClose: () => void;
  onSuccess: (position: number) => void;
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1a1d21]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative max-w-md rounded-2xl bg-white p-8 shadow-2xl"
        style={{ animation: "countUp 0.4s ease-out forwards" }}
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

        <h2 className="font-leo text-xl font-semibold text-[#1a1d21]">
          Join the Founding Circle
        </h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Be among the first when Leo Mây opens in HCMC.
        </p>

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
              className="mt-1 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[#1a1d21] placeholder-[#9ca3af] focus:border-[#0242FF] focus:outline-none focus:ring-1 focus:ring-[#0242FF]"
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
              className="mt-1 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[#1a1d21] placeholder-[#9ca3af] focus:border-[#0242FF] focus:outline-none focus:ring-1 focus:ring-[#0242FF]"
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
              className="mt-1 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[#1a1d21] placeholder-[#9ca3af] focus:border-[#0242FF] focus:outline-none focus:ring-1 focus:ring-[#0242FF]"
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
            className="mt-4 w-full rounded-xl bg-[#0242FF] py-4 font-medium text-white transition-all hover:bg-[#0242FF]/90 hover:shadow-lg hover:shadow-[#0242FF]/25 disabled:opacity-70 active:scale-[0.98]"
          >
            {status === "loading" ? "Joining..." : "Join Waitlist"}
          </button>
        </form>
      </div>
    </div>
  );
}
