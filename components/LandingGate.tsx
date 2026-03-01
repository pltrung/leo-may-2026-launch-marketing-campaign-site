"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import LoadingScreen from "@/components/LoadingScreen";
import LandingFlow from "@/components/LandingFlow";

/**
 * On home (/, /en, /vi): wrap in LandingFlow (Sky → Explore pill → portal → hero).
 * On other routes: show LoadingScreen, then remove after 2s and add "loaded".
 */
export default function LandingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "/en" || pathname === "/vi";

  if (isHome) {
    return <LandingFlow>{children}</LandingFlow>;
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
