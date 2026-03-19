"use client";

import React, { useId, useState } from "react";

/** Small “i” tooltip for KPI definitions (non-obvious metrics). */
export default function MetricInfo({
  label,
  children,
}: {
  /** Short visible label for a11y */
  label: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center gap-0.5 align-middle">
      <button
        type="button"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-[10px] font-bold text-slate-600 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
        aria-describedby={open ? id : undefined}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute z-50 max-w-[min(280px,90vw)] mt-6 ml-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] leading-snug text-slate-700 shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
