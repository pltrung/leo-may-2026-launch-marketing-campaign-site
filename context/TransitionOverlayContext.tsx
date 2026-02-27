"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

const Z_INDEX = 9999;

// Collapse (TV off)
const DURATION_COLLAPSE_S = 0.6;
const EASE_COLLAPSE = [0.55, 0, 1, 1] as const;

// CRT turn-on: ease-out for all steps
const EASE_OUT = [0.33, 1, 0.5, 1] as const;
const DURATION_DOT_S = 0.2;        // Phase 2: center dot
const DURATION_LINE_S = 0.12;      // Phase 3: horizontal line (100–150ms)
const DURATION_VERTICAL_S = 0.35;  // Phase 4: vertical fill
const DURATION_STABILIZE_S = 0.15; // Phase 5: scanline jitter
const DURATION_FADE_S = 0.4;      // Phase 5: overlay fade out

export type TransitionPhase = "idle" | "collapsing" | "holding" | "expanding";

type TransitionOverlayContextValue = {
  phase: TransitionPhase;
  startTransition: (href: string, mode: "push" | "replace") => void;
};

const TransitionOverlayContext = createContext<TransitionOverlayContextValue | null>(null);

function getPathnameFromHref(href: string): string {
  if (typeof href !== "string") return "/";
  const path = href.startsWith("http") ? new URL(href).pathname : href.split("?")[0];
  return path || "/";
}

export function useTransitionOverlay(): TransitionOverlayContextValue {
  const ctx = useContext(TransitionOverlayContext);
  if (!ctx) throw new Error("useTransitionOverlay must be used within TransitionOverlayProvider");
  return ctx;
}

export function TransitionOverlayProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const targetPathnameRef = useRef<string | null>(null);
  const pendingNavRef = useRef<{ href: string; mode: "push" | "replace" } | null>(null);

  const startTransition = useCallback((href: string, mode: "push" | "replace") => {
    targetPathnameRef.current = getPathnameFromHref(href);
    pendingNavRef.current = { href, mode };
    setPhase("collapsing");
  }, []);

  const onCollapseComplete = useCallback(() => {
    const pending = pendingNavRef.current;
    if (!pending) {
      setPhase("idle");
      return;
    }
    pendingNavRef.current = null;
    if (pending.mode === "push") {
      router.push(pending.href, { scroll: false });
    } else {
      router.replace(pending.href, { scroll: false });
    }
    setPhase("holding");
  }, [router]);

  useEffect(() => {
    const target = targetPathnameRef.current;
    if (phase !== "holding" || !target) return;
    if (pathname === target) {
      setPhase("expanding");
    }
  }, [phase, pathname]);

  const onExpandComplete = useCallback(() => {
    targetPathnameRef.current = null;
    setPhase("idle");
  }, []);

  const showOverlay = phase !== "idle";

  return (
    <TransitionOverlayContext.Provider value={{ phase, startTransition }}>
      {children}
      {showOverlay && (
        <TransitionOverlayLayer
          phase={phase}
          onCollapseComplete={onCollapseComplete}
          onExpandComplete={onExpandComplete}
        />
      )}
    </TransitionOverlayContext.Provider>
  );
}

type ExpandStep = 1 | 2 | 3 | 4 | 5;

function TransitionOverlayLayer({
  phase,
  onCollapseComplete,
  onExpandComplete,
}: {
  phase: TransitionPhase;
  onCollapseComplete: () => void;
  onExpandComplete: () => void;
}) {
  const [expandStep, setExpandStep] = useState<ExpandStep>(1);
  const isCollapsing = phase === "collapsing";
  const isExpanding = phase === "expanding";

  useEffect(() => {
    if (phase === "expanding") setExpandStep(1);
  }, [phase]);

  // Phase 5: fade entire overlay after scanline; then unmount
  const overlayOpacity = isExpanding && expandStep === 5 ? 0 : 1;
  const overlayFadeComplete = expandStep === 5;

  // ----- Collapse (TV off): two black bars -----
  const topScaleY = isCollapsing ? 1 : 0;
  const bottomScaleY = isCollapsing ? 1 : 0;
  const initialScaleY = phase === "collapsing" ? 0 : undefined;

  return (
    <motion.div
      id="transition-overlay"
      className="fixed inset-0 pointer-events-auto"
      style={{ zIndex: Z_INDEX, background: "#000" }}
      aria-hidden="true"
      initial={false}
      animate={{ opacity: overlayOpacity }}
      transition={
        overlayFadeComplete
          ? { delay: DURATION_STABILIZE_S, duration: DURATION_FADE_S, ease: EASE_OUT }
          : { duration: 0 }
      }
      onAnimationComplete={() => {
        if (overlayFadeComplete) onExpandComplete();
      }}
    >
      {/* Collapse / holding: two black bars (TV off) */}
      {(phase === "collapsing" || phase === "holding") && (
        <>
          <motion.div
            className="absolute left-0 right-0 top-0 w-full"
            style={{ height: "50%", background: "#000", transformOrigin: "top" }}
            initial={initialScaleY !== undefined ? { scaleY: initialScaleY } : false}
            animate={{ scaleY: topScaleY }}
            transition={{ duration: DURATION_COLLAPSE_S, ease: EASE_COLLAPSE }}
          />
          <motion.div
            className="absolute left-0 right-0 bottom-0 w-full"
            style={{ height: "50%", background: "#000", transformOrigin: "bottom" }}
            initial={initialScaleY !== undefined ? { scaleY: initialScaleY } : false}
            animate={{ scaleY: bottomScaleY }}
            transition={{ duration: DURATION_COLLAPSE_S, ease: EASE_COLLAPSE }}
            onAnimationComplete={() => {
              if (phase === "collapsing") onCollapseComplete();
            }}
          />
        </>
      )}

      {/* Expanding: CRT turn-on sequence */}
      {isExpanding && (
        <CRTTurnOnSequence
          step={expandStep}
          onStepComplete={(next) => next <= 5 && setExpandStep(next)}
        />
      )}
    </motion.div>
  );
}

function CRTTurnOnSequence({
  step,
  onStepComplete,
}: {
  step: ExpandStep;
  onStepComplete: (nextStep: ExpandStep) => void;
}) {
  // Phase 1: full black (no animation) — advance to 2 immediately so dot can run
  useLayoutEffect(() => {
    if (step === 1) {
      const id = requestAnimationFrame(() => onStepComplete(2));
      return () => cancelAnimationFrame(id);
    }
  }, [step, onStepComplete]);

  // Phase 2: center dot + glow
  // Phase 3: horizontal line (scaleX)
  // Phase 4: vertical fill (scaleY) + brightness
  // Phase 5: scanline flicker + fade overlay

  return (
    <>
      {/* Black base during turn-on */}
      <div className="absolute inset-0 bg-black" aria-hidden />

      {/* Phase 2: Center dot with glow */}
      {step === 2 && (
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{
            width: 24,
            height: 24,
            boxShadow: "0 0 40px 8px rgba(255,255,255,0.6)",
            transformOrigin: "center",
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: DURATION_DOT_S, ease: EASE_OUT }}
          onAnimationComplete={() => onStepComplete(3)}
        />
      )}

      {/* Phase 3 & 4: Horizontal line (scaleX) then vertical fill (scaleY) */}
      {step >= 3 && (
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white"
          style={{
            width: "100vw",
            height: "100dvh",
            maxWidth: "100%",
            transformOrigin: "center center",
            boxShadow: step === 4 ? "0 0 60px 20px rgba(255,255,255,0.15)" : "none",
          }}
          initial={step === 3 ? { scaleX: 0, scaleY: 0 } : false}
          animate={{
            scaleX: 1,
            scaleY: step >= 4 ? 1 : 0,
          }}
          transition={{
            scaleX: { duration: step === 3 ? DURATION_LINE_S : 0, ease: EASE_OUT },
            scaleY: { duration: step === 4 ? DURATION_VERTICAL_S : 0, ease: EASE_OUT },
          }}
          onAnimationComplete={() => {
            if (step === 3) onStepComplete(4);
            if (step === 4) onStepComplete(5);
          }}
        />
      )}

      {/* Phase 5: Scanline flicker; overlay root fades in TransitionOverlayLayer */}
      {step >= 5 && <CRTStabilizeAndFade />}
    </>
  );
}

function CRTStabilizeAndFade() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.5, 0.2, 0.45, 0.15, 0] }}
      transition={{
        duration: DURATION_STABILIZE_S,
        ease: "easeOut",
      }}
      aria-hidden
    />
  );
}
