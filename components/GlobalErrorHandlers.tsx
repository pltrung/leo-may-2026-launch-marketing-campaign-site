"use client";

import { useEffect } from "react";
import { safeExecute } from "@/lib/safeExecute";

/**
 * Global error handlers: window.onerror and unhandledrejection.
 * Logs errors cleanly without interrupting user experience.
 * Mount in root layout.
 */
export default function GlobalErrorHandlers() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleError = (event: ErrorEvent | Event): void => {
      safeExecute(() => {
        const error = event instanceof ErrorEvent ? event.error : new Error(String(event));
        if (process.env.NODE_ENV === "development") {
          console.error("[GlobalError] Unhandled error:", error);
        }
      });
    };

    const handleRejection = (event: PromiseRejectionEvent): void => {
      safeExecute(() => {
        if (process.env.NODE_ENV === "development") {
          console.error("[GlobalError] Unhandled promise rejection:", event.reason);
        }
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
