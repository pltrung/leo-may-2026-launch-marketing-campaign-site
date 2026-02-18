"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "./LocaleProvider";

export default function LanguageSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // pathname is /en, /en/countdown, etc. Replace locale segment.
  const otherLocale = locale === "en" ? "vi" : "en";
  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const rest = segments.length > 1 ? "/" + segments.slice(1).join("/") : "";
  const onHome = segments.length <= 1;
  const preserveClouds = onHome && searchParams?.get("clouds") === "1";
  const newPath = `/${otherLocale}${rest}${preserveClouds ? "?clouds=1" : ""}`;

  return (
    <Link
      href={newPath}
      className="inline-flex items-center gap-1.5 py-2 px-3 rounded-full border border-white/50 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/70 transition-colors"
      aria-label={locale === "en" ? "Switch to Vietnamese" : "Chuyển sang tiếng Anh"}
    >
      <span className={locale === "en" ? "opacity-60" : "font-medium"}>VN</span>
      <span className="text-white/40">|</span>
      <span className={locale === "vi" ? "opacity-60" : "font-medium"}>EN</span>
    </Link>
  );
}
