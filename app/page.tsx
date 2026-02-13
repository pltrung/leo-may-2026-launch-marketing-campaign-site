"use client";

import { useEffect, useState } from "react";
import FogIntro from "@/components/FogIntro";
import BrandLogo from "@/components/BrandLogo";
import CloudField from "@/components/CloudField";
import Footer from "@/components/Footer";
import SignupModal from "@/components/SignupModal";

export default function Home() {
  const [introDone, setIntroDone] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), 5500);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* First 5 seconds: fullscreen fog + logo + headline */}
      {!introDone && <FogIntro />}

      {/* Main content - fades in after intro */}
      <main
        className={`min-h-screen transition-opacity duration-1000 ${
          introDone ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Hero - logo + tagline */}
        <section className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16">
          <BrandLogo show withGlow={false} />
          <h1
            className="mt-6 font-leo text-3xl font-semibold tracking-tight text-[#1a1d21] md:text-4xl"
            style={{ fontFamily: "var(--font-leo)" }}
          >
            Leo Mây
          </h1>
          <p className="mt-2 font-light tracking-wide text-[#4a4d52]">
            Climb the Clouds. Build a Culture.
          </p>
          <p className="mt-8 text-sm font-light text-[#6b7280]">
            Ho Chi Minh City · 2026
          </p>
          <button
            onClick={() => setShowSignup(true)}
            className="mt-6 text-sm font-medium text-[#0242FF] transition-colors hover:text-[#0242FF]/80 underline-offset-4 hover:underline"
          >
            Join the Founding Circle →
          </button>
        </section>

        {/* Cloud personalities */}
        <CloudField />

        <Footer />

        {showSignup && (
          <SignupModal defaultCloudType={null} onClose={() => setShowSignup(false)} />
        )}
      </main>
    </>
  );
}
