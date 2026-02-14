"use client";

interface MistOverlayProps {
  phase: "enter" | "exit";
  showText: boolean;
}

export default function MistOverlay({ phase, showText }: MistOverlayProps) {
  return (
    <div
      className="mist-overlay fixed inset-0 pointer-events-none z-[70] flex items-center justify-center"
      data-phase={phase}
      aria-hidden
    >
      {/* Vertical gradient: white at bottom → transparent at top */}
      <div
        className="absolute inset-0 opacity-[0.85]"
        style={{
          background: "linear-gradient(to top, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.25) 40%, transparent 100%)",
          filter: "blur(8px)",
        }}
      />
      {/* Centered text - fades in/out over ~400ms */}
      {showText && (
        <p className="mist-text font-subheadline text-white/90 text-xl sm:text-2xl tracking-[0.2em] text-center pointer-events-none">
          The sky opens.
        </p>
      )}
    </div>
  );
}
