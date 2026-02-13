"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface StepSuccessProps {
  position: number;
}

const spring = { type: "spring" as const, stiffness: 300, damping: 28 };

/**
 * Success — flex-centered content. Parent provides flex centering.
 */
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
    <div className="flex flex-col items-center justify-center text-center px-4 max-w-xl w-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-[180px] w-[45vw] mb-6"
        style={{
          filter: "brightness(0) invert(1) drop-shadow(0 0 20px rgba(255,255,255,0.15))",
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
        transition={{ ...spring, delay: 0.2 }}
        className="text-2xl sm:text-3xl font-semibold text-white/95"
      >
        You&apos;re in.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.35 }}
        className="mt-4 text-white/80"
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
        transition={{ delay: 0.5 }}
        className="mt-6 text-sm text-white/55"
        style={{ fontFamily: "var(--font-leo)" }}
      >
        We&apos;ll reach out when it&apos;s time to climb the clouds.
      </motion.p>
    </div>
  );
}
