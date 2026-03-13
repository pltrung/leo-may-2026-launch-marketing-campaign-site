"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import LoadingScreen from "@/components/LoadingScreen";
import LandingFlow from "@/components/LandingFlow";

/**
 * On home (/, /en, /vi): wrap in LandingFlow (Sky → Explore pill → portal → hero).
 * On /gym: show gym immediately (no loading screen) so direct links go straight to the page.
 * On other routes: show LoadingScreen, then remove after 2s and add "loaded".
 */
export default function LandingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = Boolean(
    pathname && (pathname === "/" || pathname === "/en" || pathname === "/vi")
  );
  const isGym = Boolean(pathname && pathname.includes("/gym"));
  const isDashboard = Boolean(pathname && pathname.includes("/dashboard"));

  useEffect(() => {
    if ((isGym || isDashboard) && typeof document !== "undefined") document.body.classList.add("loaded");
  }, [isGym, isDashboard]);

  if (isHome) {
    return <LandingFlow>{children}</LandingFlow>;
  }

  if (isGym || isDashboard) {
    return <>{children}</>;
  }

  return (
    <>
      <LoadingScreen />
      {children}
      <Script id="loading-controller" strategy="afterInteractive">
        {`setTimeout(function(){var e=document.getElementById("loading-screen");e&&e.remove();document.body.classList.add("loaded");},2000);`}
      </Script>
    </>
  );
}
