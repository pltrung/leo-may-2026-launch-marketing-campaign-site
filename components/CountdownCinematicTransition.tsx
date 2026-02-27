"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { HERO_BG } from "@/lib/heroConstants";
import type { CloudPersonality } from "@/lib/cloudData";
import CloudIconByType from "@/components/CloudIcons";

export type CountdownTransitionVariant = "return" | "forms";

const EASE = [0.22, 1, 0.36, 1] as const;

interface CountdownCinematicTransitionProps {
  variant: CountdownTransitionVariant;
  selectedCloud: CloudPersonality | null;
  onComplete: () => void;
}

/** Pick Your Cloud → Countdown: focus selected cloud, dissolve, then onComplete. Login → Countdown: subtle pulse then onComplete. */
export default function CountdownCinematicTransition({
  variant,
  selectedCloud,
  onComplete,
}: CountdownCinematicTransitionProps) {
  const [phase, setPhase] = useState<"focus" | "dissolve" | "done">("focus");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (variant === "return") {
      timersRef.current.push(setTimeout(() => onComplete(), 700));
      return () => timersRef.current.forEach(clearTimeout);
    }

    setPhase("focus");
    timersRef.current.push(setTimeout(() => setPhase("dissolve"), 650));
    timersRef.current.push(setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 1400));

    return () => timersRef.current.forEach(clearTimeout);
  }, [variant, onComplete]);

  const accent = selectedCloud?.accentHex ?? "#4FA3FF";
  const isForms = variant === "forms";

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center"
      style={{ background: HERO_BG }}
      aria-hidden
    >
      {/* Slight background darkening (3–5%) */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isForms ? 0.04 : 0.02 }}
        transition={{ duration: 0.4, ease: EASE }}
        style={{ background: "rgba(0,0,0,1)" }}
      />

      {isForms && selectedCloud && (
        <>
          {/* Dimmed "other clouds" backdrop */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "focus" ? 0.5 : 0.85 }}
            transition={{ duration: 0.35, ease: EASE }}
            style={{
              background: `radial-gradient(ellipse 70% 70% at 50% 50%, ${accent}08 0%, transparent 60%)`,
            }}
          />
          {/* Selected cloud: enlarge then dissolve */}
          <motion.div
            className="relative z-10 flex items-center justify-center pointer-events-none"
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{
              scale: phase === "focus" ? 1.08 : 1.15,
              opacity: phase === "dissolve" || phase === "done" ? 0 : 1,
              filter: phase === "dissolve" || phase === "done" ? "blur(12px)" : "blur(0px)",
            }}
            transition={{
              scale: { duration: 0.5, ease: EASE },
              opacity: { duration: 0.5, ease: EASE },
              filter: { duration: 0.45, ease: EASE },
            }}
          >
            <div
              className="rounded-[24px] p-8 flex flex-col items-center justify-center border backdrop-blur-[12px]"
              style={{
                backgroundColor: "rgba(255,255,255,0.92)",
                borderColor: `${accent}60`,
                boxShadow: `0 20px 60px rgba(0,0,0,0.25), 0 0 80px ${accent}30`,
              }}
            >
              <div style={{ color: accent }}>
                <CloudIconByType cloudId={selectedCloud.id} className="w-20 h-20 sm:w-24 sm:h-24" />
              </div>
              <span
                className="mt-3 font-semibold text-lg text-center"
                style={{ color: accent }}
              >
                {selectedCloud.name}
              </span>
            </div>
          </motion.div>
          {/* Particle glow hint (color shift toward cloud) */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "focus" ? 0.15 : 0.08 }}
            transition={{ duration: 0.4, ease: EASE }}
            style={{
              background: `radial-gradient(ellipse 100% 100% at 50% 50%, ${accent}40 0%, transparent 70%)`,
              filter: "blur(40px)",
            }}
          />
        </>
      )}

      {variant === "return" && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.03, 0.02] }}
          transition={{ duration: 0.5, ease: EASE, times: [0, 0.4, 1] }}
          style={{
            background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)",
          }}
        />
      )}
    </div>
  );
}
