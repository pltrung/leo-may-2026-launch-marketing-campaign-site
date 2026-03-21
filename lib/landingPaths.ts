import type { Locale } from "@/lib/i18n";

/** Sky → Explore → hero landing flow. */
export function isLandingFlowPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/" ||
    pathname === "/prelaunch" ||
    pathname === "/en" ||
    pathname === "/vi" ||
    pathname === "/en/prelaunch" ||
    pathname === "/vi/prelaunch"
  );
}

/** Base path for hero ↔ clouds URL transitions. Always /{locale} on locale routes. */
export function prelaunchBasePath(pathname: string | null, locale: Locale): string {
  const p = pathname ?? "";
  if (p === "/prelaunch") return "/prelaunch";
  if (p === "/en/prelaunch" || p === "/vi/prelaunch") return p;
  return `/${locale}`;
}

/** Logo “home” href + scroll target. */
export function logoHomePath(pathname: string | null, locale: Locale): string {
  const p = pathname ?? "";
  if (p === "/prelaunch") return "/prelaunch";
  if (p === "/en/prelaunch" || p === "/vi/prelaunch") return p;
  return `/${locale}`;
}
