"use client";

import { useState } from "react";
import { CloudType } from "@/lib/cloudData";

interface SignupProps {
  cloudType: CloudType;
  onSuccess: (position: number) => void;
}

export default function Signup({ cloudType, onSuccess }: SignupProps) {
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
    setLoading(true);
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
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center justify-center gap-4 w-full max-w-sm px-4"
    >
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
        style={{ fontFamily: "var(--font-leo)" }}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
        style={{ fontFamily: "var(--font-leo)" }}
      />
      <input
        type="tel"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
        style={{ fontFamily: "var(--font-leo)" }}
      />
      <p className="text-white/50 text-xs">* Email or phone required</p>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-8 py-3 rounded-lg bg-[#0242FF] hover:bg-[#0338dd] disabled:opacity-50 text-white text-sm font-medium transition-colors"
        style={{ fontFamily: "var(--font-leo)" }}
      >
        {loading ? "Joining…" : "Join Waitlist"}
      </button>
    </form>
  );
}
