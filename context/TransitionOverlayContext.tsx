"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

const Z_INDEX = 9999;
const DOT_SIZE_PX = 16;

// CRT turn-off (collapse): 5-phase cinematic shutdown — total ~1100ms
const DURATION_COLLAPSE_VERTICAL_S = 0.35;   // Phase 1: vertical collapse, ease-in
const DURATION_LINE_HOLD_S = 0.2;            // Phase 2: horizontal line hold
const DURATION_LINE_TO_DOT_S = 0.22;         // Phase 3: line compress to dot
const DURATION_DOT_HOLD_S = 0.15;            // Phase 4: dot hold
const DURATION_DOT_FADE_S = 0.18;            // Phase 5: dot fade to black
const EASE_COLLAPSE = [0.55, 0, 1, 1] as const;  // ease-in for phase 1
const EASE_LINE_DOT = [0.25, 0.1, 0.25, 1] as const;  // smooth for phase 3 & 5

// CRT turn-on: analog, slow early stages, ease-out
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const DURATION_BLACK_HOLD_S = 0.12;     // Phase 1: 120ms
const DURATION_GLOW_S = 0.11;           // Phase 2: ~110ms
const DURATION_DOT_BUILD_S = 0.12;     // Phase 3: ~120ms
const DURATION_HORIZONTAL_S = 0.14;    // Phase 4: 120–150ms
const DURATION_VERTICAL_S = 0.28;      // Phase 5: 250–300ms
const DURATION_STABILIZE_HOLD_S = 0.05; // Phase 6: full white hold ~50ms
const DURATION_FLICKER_S = 0.12;       // Phase 6: subtle flicker
const DURATION_FADE_S = 0.2;           // Phase 6: overlay fade 200ms

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

const HIDDEN_RESET_MS = 4000;

export function TransitionOverlayProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const targetPathnameRef = useRef<string | null>(null);
  const pendingNavRef = useRef<{ href: string; mode: "push" | "replace" } | null>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const phaseRef = useRef<TransitionPhase>(phase);
  phaseRef.current = phase;

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

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      } else {
        const hiddenAt = hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (hiddenAt != null && Date.now() - hiddenAt >= HIDDEN_RESET_MS && phaseRef.current !== "idle") {
          targetPathnameRef.current = null;
          pendingNavRef.current = null;
          setPhase("idle");
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
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

type ExpandStep = 1 | 2 | 3 | 4 | 5 | 6;

type CollapseStep = 1 | 2 | 3 | 4 | 5;
const COLLAPSE_LINE_HEIGHT_PX = 4;
const COLLAPSE_DOT_SIZE_PX = 12;

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
  const [collapseStep, setCollapseStep] = useState<CollapseStep>(1);
  const isCollapsing = phase === "collapsing";
  const isExpanding = phase === "expanding";

  useEffect(() => {
    if (phase === "expanding") setExpandStep(1);
  }, [phase]);
  useEffect(() => {
    if (phase === "collapsing") setCollapseStep(1);
  }, [phase]);

  // Phase 6: fade overlay only after stabilize + flicker; then unmount
  const overlayFadeActive = isExpanding && expandStep === 6;
  const overlayOpacity = overlayFadeActive ? 0 : 1;

  // Collapse: phase 1 = vertical squeeze; phases 2–5 = line hold → line to dot → dot hold → dot fade
  const topScaleY = isCollapsing && collapseStep === 1 ? 1 : 0;
  const bottomScaleY = isCollapsing && collapseStep === 1 ? 1 : 0;
  const initialScaleY = phase === "collapsing" && collapseStep === 1 ? 0 : undefined;

  return (
    <motion.div
      id="transition-overlay"
      className="fixed inset-0 pointer-events-auto overflow-hidden"
      style={{ zIndex: Z_INDEX, background: "#000" }}
      aria-hidden="true"
      initial={false}
      animate={{ opacity: overlayOpacity }}
      transition={
        overlayFadeActive
          ? {
              delay: DURATION_STABILIZE_HOLD_S + DURATION_FLICKER_S,
              duration: DURATION_FADE_S,
              ease: EASE_OUT,
            }
          : { duration: 0 }
      }
      onAnimationComplete={() => {
        if (overlayFadeActive) onExpandComplete();
      }}
    >
      {(phase === "collapsing" || phase === "holding") && (
        <>
          {/* Phase 1: Vertical collapse — top/bottom bands, ease-in 350ms; brightness lift on center slit */}
          <motion.div
            className="absolute left-0 right-0 top-0 w-full"
            style={{ height: "50%", background: "#000", transformOrigin: "top" }}
            initial={initialScaleY !== undefined ? { scaleY: initialScaleY } : false}
            animate={{ scaleY: topScaleY }}
            transition={{ duration: DURATION_COLLAPSE_VERTICAL_S, ease: EASE_COLLAPSE }}
          />
          <motion.div
            className="absolute left-0 right-0 bottom-0 w-full"
            style={{ height: "50%", background: "#000", transformOrigin: "bottom" }}
            initial={initialScaleY !== undefined ? { scaleY: initialScaleY } : false}
            animate={{ scaleY: bottomScaleY }}
            transition={{ duration: DURATION_COLLAPSE_VERTICAL_S, ease: EASE_COLLAPSE }}
            onAnimationComplete={() => {
              if (phase === "collapsing" && collapseStep === 1) setCollapseStep(2);
            }}
          />
          {/* Phase 1: Slight brightness increase in center slit during collapse */}
          {isCollapsing && collapseStep === 1 && (
            <motion.div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: "50%",
                height: "20vh",
                transform: "translateY(-50%)",
                background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DURATION_COLLAPSE_VERTICAL_S, ease: EASE_COLLAPSE }}
              aria-hidden
            />
          )}

          {/* Phase 2: Horizontal line hold — thin glowing line, 200ms; subtle keyframe so duration runs */}
          {isCollapsing && collapseStep >= 2 && (
            <motion.div
              className="absolute left-0 right-0 top-1/2 pointer-events-none"
              style={{
                height: COLLAPSE_LINE_HEIGHT_PX,
                marginTop: -COLLAPSE_LINE_HEIGHT_PX / 2,
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 0 12px 2px rgba(255,255,255,0.5)",
                transformOrigin: "center center",
              }}
              initial={{ opacity: 1, scaleX: 1 }}
              animate={
                collapseStep === 2
                  ? { opacity: [1, 1.001, 1], scaleX: 1 }
                  : collapseStep >= 3
                    ? { scaleX: 0 }
                    : { opacity: 1, scaleX: 1 }
              }
              transition={
                collapseStep === 2
                  ? { duration: DURATION_LINE_HOLD_S, ease: "linear" }
                  : collapseStep === 3
                    ? { duration: DURATION_LINE_TO_DOT_S, ease: EASE_LINE_DOT }
                    : { duration: 0 }
              }
              onAnimationComplete={() => {
                if (collapseStep === 2) setCollapseStep(3);
                else if (collapseStep === 3) setCollapseStep(4);
              }}
              aria-hidden
            />
          )}

          {/* Phase 4: Dot hold — bright dot 150ms; subtle keyframe so onAnimationComplete fires */}
          {isCollapsing && collapseStep >= 4 && (
            <motion.div
              className="absolute left-1/2 top-1/2 pointer-events-none rounded-full bg-white"
              style={{
                width: COLLAPSE_DOT_SIZE_PX,
                height: COLLAPSE_DOT_SIZE_PX,
                marginLeft: -COLLAPSE_DOT_SIZE_PX / 2,
                marginTop: -COLLAPSE_DOT_SIZE_PX / 2,
                boxShadow: "0 0 16px 4px rgba(255,255,255,0.6)",
                transformOrigin: "center center",
              }}
              initial={{ opacity: 1 }}
              animate={{
                opacity: collapseStep === 5 ? 0 : [1, 1.002, 1],
              }}
              transition={
                collapseStep === 4
                  ? { duration: DURATION_DOT_HOLD_S, ease: "linear" }
                  : collapseStep === 5
                    ? { duration: DURATION_DOT_FADE_S, ease: EASE_LINE_DOT }
                    : { duration: 0 }
              }
              onAnimationComplete={() => {
                if (collapseStep === 4) setCollapseStep(5);
                else if (collapseStep === 5) onCollapseComplete();
              }}
              aria-hidden
            />
          )}
        </>
      )}

      {isExpanding && (
        <CRTTurnOnSequence
          step={expandStep}
          onStepComplete={(next) => next <= 6 && setExpandStep(next)}
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
  const [scaleMax, setScaleMax] = useState({ x: 60, y: 40 });
  const lineScaleY = 2 / DOT_SIZE_PX;

  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      setScaleMax({
        x: window.innerWidth / DOT_SIZE_PX,
        y: window.innerHeight / DOT_SIZE_PX,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <>
      <div className="absolute inset-0 bg-black overflow-hidden" aria-hidden />

      {/* Phase 1: Black hold 120ms — minimal opacity keyframe so onAnimationComplete fires */}
      {step >= 1 && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1.001, 1] }}
          transition={{ duration: DURATION_BLACK_HOLD_S, ease: "linear" }}
          onAnimationComplete={() => step === 1 && onStepComplete(2)}
          aria-hidden
        />
      )}

      {/* Single expanding element: 16×16px, transform-origin center, scale only. No full-width div. */}
      {step >= 2 && (
        <motion.div
          className="absolute left-1/2 top-1/2 bg-white"
          style={{
            width: DOT_SIZE_PX,
            height: DOT_SIZE_PX,
            marginLeft: -DOT_SIZE_PX / 2,
            marginTop: -DOT_SIZE_PX / 2,
            transformOrigin: "center center",
            borderRadius: step <= 3 ? "50%" : "0%",
            boxShadow:
              step === 2
                ? "0 0 24px 6px rgba(255,255,255,0.5)"
                : step === 3
                  ? "0 0 12px 2px rgba(255,255,255,0.7)"
                  : step === 5
                    ? "0 0 80px 30px rgba(255,255,255,0.25)"
                    : "none",
            filter: step === 2 ? "blur(1px)" : "none",
          }}
          initial={
            step === 2
              ? { scale: 0 }
              : step === 3 || step === 4 || step === 5
                ? false
                : false
          }
          animate={
            step === 2
              ? { scale: 1 }
              : step === 3
                ? { scale: 1.2 }
                : step === 4
                  ? { scaleX: scaleMax.x, scaleY: lineScaleY }
                  : { scaleX: scaleMax.x, scaleY: scaleMax.y }
          }
          transition={
            step === 2
              ? { duration: DURATION_GLOW_S, ease: EASE_OUT }
              : step === 3
                ? { duration: DURATION_DOT_BUILD_S, ease: EASE_OUT }
                : step === 4
                  ? { duration: DURATION_HORIZONTAL_S, ease: EASE_OUT }
                  : step === 5
                    ? { duration: DURATION_VERTICAL_S, ease: EASE_OUT }
                    : { duration: 0 }
          }
          onAnimationComplete={() => {
            if (step === 2) onStepComplete(3);
            if (step === 3) onStepComplete(4);
            if (step === 4) onStepComplete(5);
            if (step === 5) onStepComplete(6);
          }}
        />
      )}

      {/* Phase 6: Stabilization — hold, subtle flicker; overlay root fades in TransitionOverlayLayer */}
      {step >= 6 && <CRTStabilize />}
    </>
  );
}

function CRTStabilize() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)",
        mixBlendMode: "overlay",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.08, 0.03, 0.06, 0] }}
      transition={{ duration: DURATION_FLICKER_S, ease: "easeOut" }}
      aria-hidden
    />
  );
}
