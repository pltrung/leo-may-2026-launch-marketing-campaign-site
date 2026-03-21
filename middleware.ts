import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, isValidLocale } from "@/lib/i18n";

/** Resolve locale for "/" redirect: cookie > Accept-Language > default. */
function resolveLocale(request: NextRequest): "en" | "vi" {
  const cookie = request.cookies.get("leo_language");
  if (cookie?.value === "vi" || cookie?.value === "en") return cookie.value;
  const accept = request.headers.get("accept-language") ?? "";
  const viFirst = /^vi|vi[,;-]|.*,\s*vi\b/i.test(accept);
  return viFirst ? "vi" : defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root → prelaunch (locale-based: /prelaunch or /vi/prelaunch)
  if (pathname === "/") {
    const locale = resolveLocale(request);
    const prelaunchPath = locale === "vi" ? "/vi/prelaunch" : "/prelaunch";
    const res = NextResponse.redirect(new URL(prelaunchPath, request.url));
    // Persist chosen locale so next "/" uses same (max-age ~1 year)
    if (!request.cookies.get("leo_language")) {
      res.cookies.set("leo_language", locale, { maxAge: 31536000, path: "/" });
    }
    return res;
  }

  // /vi → /prelaunch
  if (pathname === "/vi" || pathname === "/vi/") {
    return NextResponse.redirect(new URL("/prelaunch", request.url));
  }

  // Allow /prelaunch, /en and /vi and their subpaths; allow /api and _next
  if (pathname === "/prelaunch" || pathname.startsWith("/prelaunch/")) {
    return NextResponse.next();
  }
  const segment = pathname.split("/")[1];
  if (segment && isValidLocale(segment)) {
    return NextResponse.next();
  }
  if (segment === "api" || segment === "_next" || pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Static assets, favicon, etc.
  if (pathname.includes(".") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
