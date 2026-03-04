"use client";

import dynamic from "next/dynamic";

const GymWorld = dynamic(() => import("@/components/gym/GymWorld"), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-screen flex items-center justify-center bg-[#0B0B0F]"
      style={{ fontFamily: "MiSans-Regular, sans-serif" }}
    >
      <p className="text-white/60 text-sm tracking-widest">LEO MÂY</p>
    </div>
  ),
});

export default function GymPage() {
  return <GymWorld />;
}
