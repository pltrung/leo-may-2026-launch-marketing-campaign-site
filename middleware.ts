import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, isValidLocale } from "@/lib/i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root to default (English)
  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url));
  }

  // Allow /en and /vi and their subpaths; allow /api and _next
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
