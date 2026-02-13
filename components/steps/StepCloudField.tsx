"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { cloudPersonalities, CloudPersonality } from "@/lib/cloudData";
import FogBackground from "@/components/FogBackground";
import { CloudBlob } from "@/components/CloudBlob";

interface StepCloudFieldProps {
  onCloudClick: (personality: CloudPersonality) => void;
}

const CLOUD_LAYOUT: { x: number; y: number; depth: number }[] = [
  { x: 22, y: 42, depth: 0.3 },
  { x: 42, y: 32, depth: 0.6 },
  { x: 62, y: 36, depth: 1 },
  { x: 32, y: 62, depth: 0.2 },
  { x: 52, y: 56, depth: 0.5 },
  { x: 72, y: 46, depth: 0.8 },
];

/**
 * Cloud field — relative flex container, clouds absolute inside.
 * Parent provides flex items-center justify-center.
 */
export default function StepCloudField({ onCloudClick }: StepCloudFieldProps) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouse({ x: x * 4, y: y * 4 });
  }, []);

  return (
    <div
      className="relative flex items-center justify-center w-full h-full"
      onMouseMove={onMouseMove}
    >
      {/* Background fog — absolute within this container */}
      <div className="absolute inset-0 -z-10">
        <FogBackground variant="deep" mouse={mouse} />
      </div>

      {/* Cloud cluster — centered, clouds absolute inside */}
      <div
        className="relative"
        style={{
          width: "min(96vw, 90vmin)",
          height: "min(96vw, 90vmin)",
          maxWidth: 920,
          maxHeight: 920,
        }}
      >
        {cloudPersonalities.map((p, i) => {
          const layout = CLOUD_LAYOUT[i];
          return (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: "38%",
                height: "38%",
                minWidth: 140,
                minHeight: 140,
                transform: "translate(-50%, -50%)",
              }}
              animate={{
                y: [0, -6, 0],
                scale: [1, 1.02, 1],
                rotate: [0, 0.8, 0],
              }}
              transition={{
                duration: 6 + (i % 3),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            >
              <CloudBlob
                index={i}
                tint={p.tint}
                depth={layout.depth}
                onClick={() => onCloudClick(p)}
                showSparkles={p.tint === "yellow"}
              />
            </motion.div>
          );
        })}
      </div>

      <p
        className="absolute top-[12%] left-0 right-0 text-center text-white/70 text-base sm:text-lg"
        style={{ fontFamily: "var(--font-leo)" }}
      >
        What type of cloud are you?
      </p>
    </div>
  );
}
