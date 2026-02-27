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
const DURATION_S = 0.6;
const EASE_COLLAPSE = [0.55, 0, 1, 1] as const;
const EASE_EXPAND = [0.33, 1, 0.5, 1] as const;

export type TransitionPhase = "idle" | "collapsing" | "holding" | "expanding";

type TransitionOverlayContextValue = {
  phase: TransitionPhase;
  /** Start CRT transition; overlay will collapse, then navigate, then expand on new page. */
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

  // When collapse animation completes: navigate and go to holding
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

  // When pathname matches target and we're holding, start expand
  useEffect(() => {
    const target = targetPathnameRef.current;
    if (phase !== "holding" || !target) return;
    if (pathname === target) {
      setPhase("expanding");
    }
  }, [phase, pathname]);

  // When expand animation completes, go idle and clear target
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

function TransitionOverlayLayer({
  phase,
  onCollapseComplete,
  onExpandComplete,
}: {
  phase: TransitionPhase;
  onCollapseComplete: () => void;
  onExpandComplete: () => void;
}) {
  const isCollapsing = phase === "collapsing";
  const isExpanding = phase === "expanding";

  // Collapse: bars 0 -> 1. Expand: bars 1 -> 0. Holding: bars at 1.
  const topScaleY = isCollapsing ? 1 : isExpanding ? 0 : 1;
  const bottomScaleY = isCollapsing ? 1 : isExpanding ? 0 : 1;

  const transition = {
    duration: DURATION_S,
    ease: (isExpanding ? EASE_EXPAND : EASE_COLLAPSE) as readonly number[],
  };

  const initialScaleY = phase === "collapsing" ? 0 : undefined;

  return (
    <div
      id="transition-overlay"
      className="fixed inset-0 pointer-events-auto"
      style={{
        zIndex: Z_INDEX,
        background: "#000",
      }}
      aria-hidden="true"
    >
      {/* Top bar */}
      <motion.div
        className="absolute left-0 right-0 top-0 w-full"
        style={{
          height: "50%",
          background: "#000",
          transformOrigin: "top",
        }}
        initial={initialScaleY !== undefined ? { scaleY: initialScaleY } : false}
        animate={{ scaleY: topScaleY }}
        transition={transition}
      />
      {/* Bottom bar — single onAnimationComplete so we only fire once */}
      <motion.div
        className="absolute left-0 right-0 bottom-0 w-full"
        style={{
          height: "50%",
          background: "#000",
          transformOrigin: "bottom",
        }}
        initial={initialScaleY !== undefined ? { scaleY: initialScaleY } : false}
        animate={{ scaleY: bottomScaleY }}
        transition={transition}
        onAnimationComplete={() => {
          if (phase === "collapsing") onCollapseComplete();
          if (phase === "expanding") onExpandComplete();
        }}
      />
    </div>
  );
}
