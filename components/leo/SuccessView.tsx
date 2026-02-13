"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface SuccessViewProps {
  position: number;
}

export default function SuccessView({ position }: SuccessViewProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const inc = position / steps;
    const interval = duration / steps;
    let v = 0;
    const t = setInterval(() => {
      v += inc;
      if (v >= position) {
        setDisplay(position);
        clearInterval(t);
      } else {
        setDisplay(Math.floor(v));
      }
    }, interval);
    return () => clearInterval(t);
  }, [position]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-full w-full px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="w-[min(70vw,240px)] mb-10"
        style={{
          filter: "brightness(0) invert(1) drop-shadow(0 0 30px rgba(255,255,255,0.1))",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <Image
          src="/logo.svg"
          alt="Leo Mây"
          width={322}
          height={143}
          className="w-full h-auto"
        />
      </motion.div>

      <motion.h2
        className="text-2xl sm:text-3xl font-light text-white/95"
        style={{ fontFamily: "var(--font-leo)" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        You&apos;re in.
      </motion.h2>

      <motion.p
        className="mt-6 text-white/70 text-base sm:text-lg"
        style={{ fontFamily: "var(--font-leo)" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        You are{" "}
        <span
          className="font-semibold"
          style={{
            color: "#FDFF52",
            textShadow: "0 0 30px rgba(253,255,82,0.4)",
          }}
        >
          #{display}
        </span>{" "}
        in the Founding Circle.
      </motion.p>

      <motion.p
        className="mt-8 text-sm text-white/40"
        style={{ fontFamily: "var(--font-leo)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        We&apos;ll reach out when it&apos;s time to climb the clouds.
      </motion.p>
    </motion.div>
  );
}
