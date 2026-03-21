"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.error("[DashboardError] Route error:", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" style={{ background: "#0B0B0F", color: "#e5e5e5" }}>
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm opacity-80 mb-4">
          Your dashboard encountered an error. Please try again or contact support if the issue persists.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-full border border-white/40 text-white/90 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/";
            }}
            className="px-4 py-2 rounded-full border border-white/20 text-white/70 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
