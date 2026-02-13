"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface StepSuccessProps {
  position: number;
}

const spring = { type: "spring" as const, stiffness: 300, damping: 28 };
const springPanel = { type: "spring" as const, stiffness: 300, damping: 24, mass: 0.8 };

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
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#e4e9f2] via-[#eef1f7] to-[#f2f5fa]"
      style={{ top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh" }}
    >
      <div className="fog-layer fog-dense" />
      <div className="fog-layer fog-billows" />
      <div className="fog-layer fog-wisps" />
      <div className="grain-overlay" />

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springPanel}
          className="leo-card leo-card-glow w-full max-w-md rounded-2xl px-8 py-10 text-center shadow-[0_0_40px_rgba(2,66,255,0.1),0_25px_50px_-12px_rgba(0,0,0,0.15)]"
        >
          <motion.div
            initial={{ opacity: 0, filter: "blur(8px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="logo-glow-soft relative mb-6 inline-block"
            style={{ maxWidth: "min(180px, 50vw)" }}
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
            transition={{ ...spring, delay: 0.22 }}
            className="font-leo text-2xl font-semibold text-[#1a1d21] sm:text-3xl"
            style={{ fontFamily: "var(--font-leo)" }}
          >
            You&apos;re in.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.35 }}
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
            transition={{ delay: 0.5 }}
            className="font-leo mt-6 text-sm font-light text-[#6b7280]"
            style={{ fontFamily: "var(--font-leo)" }}
          >
            We&apos;ll reach out when it&apos;s time to climb the clouds.
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}
