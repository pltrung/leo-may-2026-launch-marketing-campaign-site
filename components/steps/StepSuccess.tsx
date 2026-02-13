"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import FogBackground from "@/components/FogBackground";

interface StepSuccessProps {
  position: number;
}

const spring = { type: "spring" as const, stiffness: 300, damping: 28 };
const springPanel = { type: "spring" as const, stiffness: 280, damping: 26 };

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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ width: "100vw", height: "100vh", background: "#1e2228" }}
    >
      <FogBackground variant="soft" />

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.15 }}
          className="relative mb-8"
          style={{ maxWidth: "min(160px, 45vw)" }}
        >
          <Image
            src="/logo.svg"
            alt="Leo Mây"
            width={322}
            height={143}
            className="h-auto w-full object-contain opacity-95"
          />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.35 }}
          className="font-serif text-2xl sm:text-3xl font-semibold text-white/95"
        >
          You&apos;re in.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.5 }}
          className="font-leo mt-5 text-white/80"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          You are{" "}
          <span
            className="font-semibold"
            style={{
              color: "#FDFF52",
              textShadow: "0 0 24px rgba(253,255,82,0.45)",
            }}
          >
            #{displayPosition}
          </span>{" "}
          in the Founding Circle.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="font-leo mt-8 text-sm font-light text-white/55"
          style={{ fontFamily: "var(--font-leo)" }}
        >
          We&apos;ll reach out when it&apos;s time to climb the clouds.
        </motion.p>
      </div>
    </motion.div>
  );
}
