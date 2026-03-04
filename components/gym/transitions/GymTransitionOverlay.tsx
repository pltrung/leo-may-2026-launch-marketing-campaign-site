"use client";

import React, { useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DURATION_MS = 700;
const DURATION_S = DURATION_MS / 1000;

export interface GymTransitionOverlayRef {
  /** Runs cloud-wipe: 0→1 then 1→0. Resolves when midpoint (fully covered) is reached. */
  startTransition: () => Promise<void>;
}

interface GymTransitionOverlayProps {
  /** Ref to get imperative startTransition(). */
  overlayRef: React.RefObject<GymTransitionOverlayRef | null>;
  /** When true, overlay is visible (e.g. during transition). */
  active?: boolean;
}

export default function GymTransitionOverlay({ overlayRef, active = false }: GymTransitionOverlayProps) {
  const [visible, setVisible] = useState(false);
  const resolveMidpoint = useRef<(() => void) | null>(null);

  const startTransition = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      setVisible(true);
      resolveMidpoint.current = resolve;
      const half = DURATION_MS / 2;
      const tMid = setTimeout(() => {
        if (resolveMidpoint.current) {
          resolveMidpoint.current();
          resolveMidpoint.current = null;
        }
      }, half);
      const tEnd = setTimeout(() => setVisible(false), DURATION_MS);
      return () => {
        clearTimeout(tMid);
        clearTimeout(tEnd);
      };
    });
  }, []);

  React.useImperativeHandle(
    overlayRef,
    () => ({
      startTransition,
    }),
    [startTransition]
  );

  return (
    <AnimatePresence>
      {(active || visible) && (
        <motion.div
          className="fixed inset-0 z-[60] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: DURATION_S * 0.5,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          aria-hidden
        >
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(200,220,255,0.08) 50%, rgba(255,255,255,0.06) 100%)",
              backdropFilter: "blur(12px)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
