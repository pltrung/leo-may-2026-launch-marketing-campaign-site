import type { Locale } from "@/lib/i18n";

/** Sky → Explore → hero landing flow. Home is always /{locale} (consistent URL pattern). */
export function isLandingFlowPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/" || pathname === "/en" || pathname === "/vi";
}

/** Base path for hero ↔ clouds URL transitions. Always /{locale} on locale routes. */
export function prelaunchBasePath(_pathname: string | null, locale: Locale): string {
  return `/${locale}`;
}

/** Logo “home” href + scroll target. */
export function logoHomePath(_pathname: string | null, locale: Locale): string {
  return `/${locale}`;
}
