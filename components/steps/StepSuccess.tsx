"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface StepSuccessProps {
  position: number;
}

const spring = { type: "spring" as const, stiffness: 300, damping: 28 };

export default function StepSuccess({ position }: StepSuccessProps) {
  const [displayPosition, setDisplayPosition] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = position / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= position) {
        setDisplayPosition(position);
        clearInterval(timer);
      } else {
        setDisplayPosition(Math.floor(current));
      }
    }, stepDuration);
    return () => clearInterval(timer);
  }, [position]);

  return (
    <motion.div
      key="success"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#eef1f7] via-[#f2f5fa] to-[#e8eaed] px-4"
    >
      <div
        className="fog-layer"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 30%, rgba(255,255,255,0.9) 0%, transparent 50%),
            radial-gradient(ellipse 100% 120% at 80% 70%, rgba(230,238,252,0.6) 0%, transparent 45%),
            radial-gradient(ellipse 70% 70% at 50% 50%, rgba(2,66,255,0.03) 0%, transparent 55%)
          `,
          animation: "fogDrift 25s ease-in-out infinite",
        }}
      />
      <div className="grain-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
        className="leo-card leo-card-glow relative z-10 flex w-full max-w-md flex-col items-center rounded-3xl px-8 py-10 text-center"
      >
        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.1 }}
          className="logo-glow-soft relative mb-6"
          style={{
            padding: "clamp(1rem, 3vw, 2rem)",
            maxWidth: "min(180px, 50vw)",
          }}
        >
          <Image
            src="/logo.svg"
            alt="Leo Mây"
            width={322}
            height={143}
            className="h-auto w-full object-contain"
          />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.28 }}
          className="font-leo text-2xl font-semibold text-[#1a1d21] md:text-3xl"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          You&apos;re in.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.42 }}
          className="font-leo mt-4 text-[#4a4d52]"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          You are{" "}
          <span className="font-semibold text-[#0242FF]" style={{ textShadow: "0 0 24px rgba(2,66,255,0.25)" }}>
            #{displayPosition}
          </span>{" "}
          in the Founding Circle.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.56 }}
          className="font-leo mt-6 text-sm font-light text-[#6b7280]"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          We&apos;ll reach out when it&apos;s time to climb the clouds.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
