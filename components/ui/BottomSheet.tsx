"use client";

import React, { useEffect, useRef, useCallback } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Mobile: bottom sheet. Desktop (md+): centered modal. */
  title?: string;
}

export default function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousActiveRef.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-end md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "bottom-sheet-title" : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-bottom-sheet-backdrop"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel: bottom sheet on mobile, centered on desktop */}
      <div
        ref={panelRef}
        className="relative w-full max-h-[88dvh] md:max-h-[85vh] md:max-w-md flex flex-col rounded-t-2xl md:rounded-2xl overflow-hidden sky-glass-panel animate-bottom-sheet-panel"
        style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/30" aria-hidden />
        </div>
        {title && (
          <div className="shrink-0 flex items-center justify-between px-4 md:px-6 pt-0 md:pt-6 pb-3">
            <h2 id="bottom-sheet-title" className="text-xl font-bold text-[var(--sky-text-primary)]" style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}>
              {title}
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--sky-text-secondary)] hover:text-[var(--sky-text-primary)] hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-6 pb-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
