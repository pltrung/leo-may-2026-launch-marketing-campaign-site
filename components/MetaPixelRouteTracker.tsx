"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/metaPixel";

/**
 * Fires PageView on client-side route changes. Initial PageView runs from root layout Script.
 */
export default function MetaPixelRouteTracker() {
  const pathname = usePathname();
  const isFirstPath = useRef(true);

  useEffect(() => {
    if (isFirstPath.current) {
      isFirstPath.current = false;
      return;
    }
    // Safe: trackPageView already wrapped in safeExecute
    trackPageView();
  }, [pathname]);

  return null;
}
