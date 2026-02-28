"use client";

import { Suspense } from "react";
import Link from "next/link";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";
import { useLocale } from "@/components/LocaleProvider";
import LanguageSwitch from "./LanguageSwitch";

/**
 * LanguageSwitch uses useSearchParams/usePathname; wrapping in Suspense
 * avoids client-side exceptions on locale switch + refresh (Next.js CSR bailout).
 * Error boundary shows a safe fallback (locale-only link) if it still throws.
 * Use this everywhere instead of LanguageSwitch for a scalable fix.
 */
export default function SafeLanguageSwitch() {
  return (
    <Suspense fallback={<LanguageSwitchFallback />}>
      <ClientErrorBoundary fallback={<LanguageSwitchErrorFallback />}>
        <LanguageSwitch />
      </ClientErrorBoundary>
    </Suspense>
  );
}

function LanguageSwitchFallback() {
  return (
    <div
      className="inline-flex items-center gap-1.5 py-2 px-3 rounded-full border border-white/50 text-white/50 text-sm font-medium"
      aria-hidden
    >
      <span>VN</span>
      <span className="text-white/40">|</span>
      <span>EN</span>
    </div>
  );
}

/** When LanguageSwitch throws, show a link that only uses useLocale (no pathname/searchParams). */
function LanguageSwitchErrorFallback() {
  const locale = useLocale();
  const otherLocale = locale === "en" ? "vi" : "en";
  return (
    <Link
      href={`/${otherLocale}`}
      className="inline-flex items-center gap-1.5 py-2 px-3 rounded-full border border-white/50 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/70 transition-colors"
      aria-label={locale === "en" ? "Switch to Vietnamese" : "Chuyển sang tiếng Anh"}
    >
      <span className={locale === "en" ? "opacity-60" : "font-medium"}>VN</span>
      <span className="text-white/40">|</span>
      <span className={locale === "vi" ? "opacity-60" : "font-medium"}>EN</span>
    </Link>
  );
}
