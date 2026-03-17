"use client";

import React from "react";
import type { Locale } from "@/lib/i18n";

export interface OperationalShellProps {
  /** Page title (e.g. "Leo Mây Admin") */
  title: string;
  /** Subtitle under title (e.g. "Front Desk Dashboard") */
  subtitle: string;
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
  /** Content to show in the header right (locale is always shown; pass occupancy, logout, etc.) */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared layout shell for /admin and /staff so both routes use the same
 * header and main container (logo, title, subtitle, locale + custom headerRight).
 */
export default function OperationalShell({
  title,
  subtitle,
  locale,
  onLocaleChange,
  headerRight,
  children,
}: OperationalShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="max-w-[1100px] mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src="/logo-white.svg" alt="Leo Mây logo" className="h-7 w-auto" />
            <div>
              <h1
                className="text-xl md:text-2xl font-bold text-white tracking-tight"
                style={{ fontFamily: "var(--font-bold), MiSans-Bold, sans-serif" }}
              >
                {title}
              </h1>
              <p className="text-xs md:text-sm text-slate-300">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-slate-200">
            <div className="flex gap-1 rounded-full border border-slate-600 bg-slate-800/80 p-0.5">
              <button
                type="button"
                onClick={() => onLocaleChange("en")}
                className={`px-3 py-1 rounded-full text-xs font-medium ${locale === "en" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onLocaleChange("vi")}
                className={`px-3 py-1 rounded-full text-xs font-medium ${locale === "vi" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"}`}
              >
                VN
              </button>
            </div>
            {headerRight}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1100px] mx-auto px-4 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
